# Writing your own Haru PC skill

A skill is a folder with one `SKILL.md` file: a short description plus plain instructions that teach Haru PC a job. Haru PC uses the [OpenClaw skill format](https://docs.openclaw.ai/tools/creating-skills).

## 1. Create the folder

```bash
mkdir -p ~/.haru-pc/workspace/skills/weekly-report
```

## 2. Write `SKILL.md`

```markdown
---
name: weekly-report
description: Every Friday, list the documents I changed this week and send the list to my phone.
---
# Weekly report

When the person asks for their weekly report:
1. List files changed in the last 7 days in ~/Documents (one command, no pipes).
2. Reply with up to 10 file names, newest first.
3. Offer to send any of them with the send-to-phone skill.
```

Rules:
- `name`: lowercase letters, digits, and hyphens. Keep it the same as the folder name.
- `description`: one line, under 160 characters.
- Write instructions the way you'd brief a careful assistant. Keep Haru PC's safety rules: one simple command per step (pipes are refused), allowed folders only, never delete, never pay or type passwords.

## 3. Check it loaded

```bash
haru-pc skills
```

Then ask from your phone, for example "주간 보고 해 줘" / "weekly report please".

## Safety still applies

A skill can't bypass Haru PC's approvals. Anything that changes files, runs commands, uses the browser, or sends something still shows up on your phone first. Only install skills you've read yourself.
