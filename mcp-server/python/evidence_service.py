from __future__ import annotations

import argparse
import os
import threading
import time
from contextlib import asynccontextmanager
from typing import Annotated

import numpy as np
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer


SERVICE_NAME = "resume-evidence-semantic-service"
MODEL_NAME = os.environ.get(
    "EVIDENCE_PYTHON_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2",
)
MODEL_MAX_SEQUENCE_LENGTH = int(
    os.environ.get("EVIDENCE_PYTHON_MAX_SEQUENCE_LENGTH", "512")
)
MODEL_LOCK = threading.Lock()


class EmbedRequest(BaseModel):
    texts: Annotated[list[str], Field(min_length=1)]


class EmbedResponse(BaseModel):
    model: str
    dimensions: int
    vectors: list[list[float]]


class VectorCandidate(BaseModel):
    id: str
    vector: Annotated[list[float], Field(min_length=1)]


class TextCandidate(BaseModel):
    id: str
    text: str


class RankVectorsRequest(BaseModel):
    query_vector: Annotated[list[float], Field(min_length=1)]
    candidates: Annotated[list[VectorCandidate], Field(min_length=1)]


class RankTextsRequest(BaseModel):
    query_vector: Annotated[list[float], Field(min_length=1)]
    candidates: Annotated[list[TextCandidate], Field(min_length=1)]


class RankedScore(BaseModel):
    id: str
    score: float


class RankResponse(BaseModel):
    results: list[RankedScore]


def _model(app: FastAPI) -> SentenceTransformer:
    return app.state.model


def _embed(app: FastAPI, texts: list[str]) -> np.ndarray:
    with MODEL_LOCK:
        vectors = _model(app).encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
    return np.asarray(vectors, dtype=np.float32)


def _normalize_vector(vector: list[float], expected_dimensions: int) -> np.ndarray:
    array = np.asarray(vector, dtype=np.float32)
    if array.ndim != 1 or array.shape[0] != expected_dimensions:
        raise ValueError(
            f"Embedding dimension mismatch: expected {expected_dimensions}, got {array.shape}."
        )
    norm = np.linalg.norm(array)
    if norm == 0:
        return array
    return array / norm


def _rank(ids: list[str], query: np.ndarray, matrix: np.ndarray) -> list[RankedScore]:
    if matrix.ndim != 2 or matrix.shape[1] != query.shape[0]:
        raise ValueError(
            f"Embedding dimension mismatch: query {query.shape[0]}, candidates {matrix.shape}."
        )
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    normalized = np.divide(
        matrix,
        norms,
        out=np.zeros_like(matrix),
        where=norms != 0,
    )
    scores = normalized @ query
    order = np.argsort(-scores, kind="stable")
    return [
        RankedScore(id=ids[index], score=float(scores[index]))
        for index in order
    ]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.model = SentenceTransformer(MODEL_NAME)
    # Xenova truncates this model at 512 tokens. sentence-transformers defaults
    # to 256, which changes long JD/evidence vectors and causes ranking drift.
    app.state.model.max_seq_length = MODEL_MAX_SEQUENCE_LENGTH
    app.state.dimensions = int(app.state.model.get_sentence_embedding_dimension())
    yield


app = FastAPI(
    title="Resume Evidence Semantic Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "service": SERVICE_NAME,
        "ready": True,
        "model": MODEL_NAME,
        "dimensions": app.state.dimensions,
        "max_sequence_length": app.state.model.max_seq_length,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest) -> EmbedResponse:
    vectors = _embed(app, request.texts)
    return EmbedResponse(
        model=MODEL_NAME,
        dimensions=app.state.dimensions,
        vectors=vectors.tolist(),
    )


@app.post("/rank-vectors", response_model=RankResponse)
def rank_vectors(request: RankVectorsRequest) -> RankResponse:
    query = _normalize_vector(request.query_vector, app.state.dimensions)
    matrix = np.asarray(
        [candidate.vector for candidate in request.candidates],
        dtype=np.float32,
    )
    ids = [candidate.id for candidate in request.candidates]
    return RankResponse(results=_rank(ids, query, matrix))


@app.post("/rank-texts", response_model=RankResponse)
def rank_texts(request: RankTextsRequest) -> RankResponse:
    query = _normalize_vector(request.query_vector, app.state.dimensions)
    matrix = _embed(app, [candidate.text for candidate in request.candidates])
    ids = [candidate.id for candidate in request.candidates]
    return RankResponse(results=_rank(ids, query, matrix))


def _windows_process_alive(pid: int) -> bool:
    import ctypes
    from ctypes import wintypes

    synchronize = 0x00100000
    wait_timeout = 0x00000102
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel32.WaitForSingleObject.restype = wintypes.DWORD
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]

    handle = kernel32.OpenProcess(synchronize, False, pid)
    if not handle:
        return False
    try:
        return kernel32.WaitForSingleObject(handle, 0) == wait_timeout
    finally:
        kernel32.CloseHandle(handle)


def _process_alive(pid: int) -> bool:
    if os.name == "nt":
        return _windows_process_alive(pid)
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _watch_parent(parent_pid: int) -> None:
    while True:
        if not _process_alive(parent_pid):
            os._exit(0)
        time.sleep(1.0)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--parent-pid", type=int, required=True)
    args = parser.parse_args()

    if args.host not in {"127.0.0.1", "localhost"}:
        raise SystemExit("The semantic service may bind only to the local loopback interface.")

    threading.Thread(
        target=_watch_parent,
        args=(args.parent_pid,),
        daemon=True,
        name="parent-process-watch",
    ).start()
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level="warning",
        access_log=False,
    )


if __name__ == "__main__":
    main()
