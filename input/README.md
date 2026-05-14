# Input Folder

Put your resume PDF here for first-time setup.

The filename can be anything. Example:

```text
input/my_resume.pdf
```

Real PDFs are ignored by Git.

After adding the PDF, ask the AI assistant to create the workflow files from it:

```text
Read CHAT_BOOTSTRAP.md first. Use the resume PDF in input/ to create my initial workflow files: master_resume.tex, workflow_state/resume_digest.md, workflow_state/bullet_index.md, workflow_state/profile_notes.md, evidence/work/*, and evidence/projects/*.
```

The assistant should extract only truthful evidence from the resume. It should not invent details that are not present.

After setup, the assistant should summarize the created files and show next options, such as:

```text
Next options:
- paste a JD or link for fit check
- review workflow_state/resume_digest.md
- add more detail to evidence/work/ or evidence/projects/
- build master_resume.tex to verify LaTeX works
```

