# Stage 4: Recruiter Outreach

Use this stage when the user asks for recruiter outreach drafts.

Triggers:
- `draft outreach`
- `draft gmail`
- `create recruiter drafts`
- `email these recruiters`

This public repo includes generic outreach rules only. Real role briefs and recruiter details live under ignored local files in `Gmail/role_briefs/`.

## Inputs

For demo runs, use sample files per `playbook/00_INDEX.md`.

Real local inputs:
- `Gmail/00_INDEX.md`
- `Gmail/01_CORE_RULES.md`
- `Gmail/02_TEMPLATE.md`
- `Gmail/03_PHRASE_BANK.md`
- `Gmail/role_briefs/*.md`
- user-provided recruiter names, emails, or LinkedIn links
- tailored resume path if the user explicitly wants attachment-ready drafts

## Excluded Work

- Do not send emails without explicit user confirmation
- Do not attach PDFs unless the user explicitly requests attachments
- Do not invent recruiter details
- Do not scrape or expose private contact data in the public repo

## Role Brief System

Before drafting, check for an existing role brief at `Gmail/role_briefs/[Company] - [Role].md`.

If a brief exists: read it instead of re-reading the JD. Do not reopen the full JD.

If no brief exists: first check whether role and company details are already in the current chat context from a prior fit check, tailor run, or JD read. If yes, build the brief from that context. Only re-read the JD if no usable context exists in this chat.

Create the brief, save it, then draft from it.

Brief format (keep it tight, 10-15 lines max):

```text
Company: [Company]
Role: [Role Title]
Date: [YYYY-MM-DD]
My Title for this role: [e.g. Full Stack Software Engineer]

What they want (3-4 bullets, plain English):
- ...

Key angles to use in middle paragraphs:
- [Evidence that maps well]
- [Stack match]
- [Domain or product fit]
- [Any other strong signal]
```

All drafts for the same role read the same brief. Middle paragraph angles are written fresh per draft - different angle each time. The brief avoids re-reading the full JD for drafts 2+.

## Role Brief Archive Rule

- At the end of each month, move all role briefs from `Gmail/role_briefs/` to an archive folder such as `Gmail/role_briefs_archive/YYYY-MM/`
- Never delete role briefs. Always move to archive.
- Active role briefs stay in `Gmail/role_briefs/` until end of month.

## Draft Style

- Plain language
- Short and human - 4 to 7 sentences total
- Specific role and company reference
- One or two strongest fit signals from the role brief
- No exaggerated claims
- No dense keyword list
- No fake familiarity with the recruiter
- No em-dashes anywhere
- No gap acknowledgment - do not write phrases like "I do not have direct X experience". Focus only on the strongest truthful overlap.

## Email Structure

```text
Greeting: Hi [FirstName],

Opening: introduce yourself with your title, years of experience, and core stack. Reference the specific role you applied for.

Middle: 2-4 sentences, natural connected flow. One thought about why this role or company is interesting tied to relevant work. Must sound like a human wrote it, not a template. Different angle per draft.

Closing: one sentence starting with "I would", from the rotation below.

Sign-off: your name, LinkedIn, portfolio, GitHub
```

## Subject Line Format

```text
Application for [Role Title] - Quick Intro
```

Never change this format.

## Closing Line Rotation

Rotate closing lines across drafts - use a different one per draft:

- I would love to connect and learn more about the role.
- I would love to chat if you think it's a good fit.
- I would love to hear more about the team.
- I would love to connect if the role is still open.
- I would love to jump on a call if there's interest.
- I would love to connect and discuss more about this opportunity.
- I would appreciate the chance to connect and share more details.
- I would welcome the opportunity to connect if the role is still open.
- I would be glad to connect and see if there is a fit.
- I would value a brief chat to see if my background lines up.

## Cover Note Rules

Auto-draft a cover note alongside every Gmail draft without being asked.

- Number of cover versions = number of email drafts. Always.
- Header: Company, Role, Emails (each on its own line)
- Version label with colon: `Version 1:` not `Version 1`
- One middle paragraph: connect the candidate's specific work to what this role is about. 2-4 sentences. Specific, not generic.
- One closing line: separate paragraph, starts with "I would"
- No em-dashes anywhere
- No generic openers like "I have X years of experience"
- Opening: always start with something specific to the role

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
