# Stage 4: Recruiter Outreach

Use this stage when the user asks for recruiter outreach drafts.

This public repo includes generic outreach rules only. Real role briefs and recruiter details live under ignored local files in `Gmail/role_briefs/`.

## Inputs

Demo inputs:
- `sample/sample_role_brief.md`
- `sample/sample_job_description.md`

Real local inputs:
- `Gmail/00_INDEX.md`
- `Gmail/01_CORE_RULES.md`
- `Gmail/02_TEMPLATE.md`
- `Gmail/03_PHRASE_BANK.md`
- `Gmail/role_briefs/*.md`
- user-provided recruiter names, emails, or LinkedIn links
- tailored resume path if the user explicitly wants attachment-ready drafts

## Excluded Work

- Do not send emails without explicit user confirmation.
- Do not attach PDFs unless the user explicitly requests attachments.
- Do not invent recruiter details.
- Do not scrape or expose private contact data in the public repo.

## Workflow

1. Read the role brief first.
2. If no role brief exists, first use role context already available in the current chat, including the JD, fit check, tailoring notes, or built resume notes.
3. If the current chat does not contain enough role context, create a concise role brief from the job description and tailoring notes.
4. Draft one message per recipient.
5. Keep the body short, human, and specific.
6. Use the role angle from Stage 2, not a generic pitch.

## Draft Style

- Plain language.
- 4 to 7 sentences.
- Specific role/company reference.
- One or two strongest fit signals.
- No exaggerated claims.
- No dense keyword list.
- No fake familiarity with the recruiter.

## Output Format

For review-only drafts:

```text
Recipient: <name/email>
Subject: <subject>
Body:
<draft>
```

For Gmail or email-tool drafts:

```text
Created N draft(s) for N recipient(s).
Attachments: none | <paths>
```

Do not dump full draft bodies if the user asked only to create drafts and the email tool already stores them.

End with `Next options:`. Useful options after outreach drafting:
- review or revise the draft
- attach the tailored PDF
- create drafts for another recruiter
- tailor another role
