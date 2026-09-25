---
name: send-to-phone
description: Send a file or a short summary from this computer back to the person's Haru app on their phone.
---
# Send to phone

Use this when the person asks to send, share, or "보내 줘" a file or result to their phone.

1. Find the file (use the `files` skill rules). If several files match, list up to 5 and ask which one.
2. Check the size. Files over 20 MB can't be sent in one message: say so and offer a summary instead.
3. Attach the file to your final reply by putting its absolute path on its own line as `MEDIA: <absolute path>`. The Haru app downloads it and offers to save or share it.
4. For documents the person only wants to read, reply with a short summary (5 lines or fewer) instead of the whole file, and ask if they also want the file.

Never send files from outside the allowed folders, and never send anything that looks like passwords, keys, or tokens.
