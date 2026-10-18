# hello world companion

Early draft of a quiet, local prototype. It does not diagnose, interpret, or provide treatment.

Open it from this folder with a local static server so the content files load from the same origin:

```
python3 -m http.server 8765
```

Then visit `http://127.0.0.1:8765/`.

Interface sentences live in `content/copy.json`. Memory prompts live in `content/prompts.json`. Soundscape placeholders live in `content/soundscapes.json`. Decisions are in `DECISIONS.md`. Limits are in `NOT_CLAIMED.md`.
