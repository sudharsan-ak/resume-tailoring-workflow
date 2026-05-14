# Jobs Fetched History Template

Copy this to `workflow_state/jobs_fetched_history.md` for real local use.

Do not commit the populated real file.

Dedup key: role/company text + canonical link. Use apply link first, then job link, then `N/A`. If link is `N/A`, dedupe by role/company text.

Format:

```text
MM-DD-YYYY
- Role at Company | Link | Fetched
- Role at Company | Link | Tailored
```

Status values:
- `Fetched`: the role was found, scored, and saved.
- `Tailored`: the role produced a successful role-specific resume PDF.

## Example

05-13-2026
- Full Stack Product Engineer at ExampleCo | https://example.com/jobs/full-stack-product-engineer | Fetched
