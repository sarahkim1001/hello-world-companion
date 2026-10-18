# Decisions

## 2026-10-18 — Plain HTML, CSS, and JavaScript

**Decision:** The prototype is a static site made with plain HTML, CSS, and JavaScript.

**Options considered:**

- A front-end framework with a package install and a build step
- A static site generator
- Plain HTML, CSS, and JavaScript, opened from this repository

**Reason:** The repository contained only a README and no build tooling. The draft can load local content, keep settings in the browser, and meet the accessibility bar without adding a dependency.

## 2026-10-18 — Local-only storage

**Decision:** Settings live in `localStorage`. The welcome intro is marked seen in `sessionStorage`. Every read and write is wrapped in `try/catch`. The page makes no account, backend, or off-origin request.

**Options considered:**

- A server with accounts
- Cookies
- `localStorage` for settings and `sessionStorage` for the once-per-session intro

**Reason:** Settings should still be there after a refresh on this browser. The typed intro should play on the first view of a session, then stay on the page as settled lines. If storage is blocked, the page still opens with the default settings and can show the intro again on the next load.

Stored settings, with no settings screen yet:

- `textSize`: `small` (18px), `default` (20px), or `large` (24px)
- `highContrast`: `true` or `false`
- `reduceMotion`: `true` or `false`
- `readingSpeed`: `slow`, `default`, or `fast`

The operating system `prefers-reduced-motion` setting is always honored. A stored `reduceMotion` value of `true` also turns motion off. Key: `hello-world-companion.settings`. Session key: `hello-world-companion.welcome-seen`.

## 2026-10-18 — Interface copy lives in content files

**Decision:** Interface sentences live in `content/copy.json`. Memory prompts live in `content/prompts.json`. Soundscape placeholders live in `content/soundscapes.json`. The page loads those files from the same origin.

**Options considered:**

- Sentences written into the HTML and JavaScript
- A content management system
- JSON files in a `content/` folder, fetched from this origin

**Reason:** Wording can change without changing behavior. Same-origin JSON needs no package and does not call another host. One sentence is repeated in the HTML `noscript` and as the script fallback if `content/copy.json` itself cannot be read: "this page needs javascript to show the draft." and "the words for this page did not load. you can refresh and try again."
