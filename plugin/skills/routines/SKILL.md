---
name: routines
description: Run a task on a schedule on this computer, for example "every Monday at 9, list the files I changed this week".
---
# Routines

Use this when the person asks for something to happen repeatedly or later ("매주 월요일 9시에", "every evening").

1. Restate the schedule and the task in one line and ask for confirmation on the phone.
2. Create it with the `cron` tool. Use the computer's local time zone.
3. The routine runs the same rules as a normal request: allowed folders only, one command per step, and anything that changes files still needs approval on the phone. Say this when you create it.
4. To list or remove routines, use the `cron` tool and reply with a short list.

Don't create routines that run more often than every 15 minutes.
