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

## 2026-10-19 — Later screens stay on the same page

**Decision:** Screens for sound, a prompt, an optional timer, a response, saving, the gallery, the week, receiving a sample, and settings are sections of this same static page. Begin on the welcome screen opens the sound screen. Settings is a button in the shell so it can be opened from any screen.

**Options considered:**

- A separate HTML file for each screen
- A router library
- One page that swaps the main section and keeps the shell in place

**Reason:** The shell already holds the early-draft badge, the pause / stop control, and the loading bar. Keeping those outside the swapped section means they stay visible, including while the optional timer runs. No package is added.

## 2026-10-19 — Silent placeholder audio

**Decision:** Each soundscape points at a short silent WAV file in `audio/`. The files were written in this repository. They are not downloaded.

**Options considered:**

- Linking to recordings hosted elsewhere
- Leaving the file names without any audio
- Shipping a tiny silent WAV for each placeholder

**Reason:** Play, stop, and the caption toggle need a real file on this origin. Silence makes the control honest: there is no recording yet. The driving note stays on the sound screen whether or not a sound is playing.

## 2026-10-19 — Drawings stay on this device

**Decision:** A response is stored in `localStorage` under `hello-world-companion.drawings`. The record can hold a drawing image, words, a theme tag, and a leave-or-keep choice. Only a drawing image can be marked to leave. Words are never marked as shared. The page does not ask for a name. If storage rejects the write, the work stays on the screen and a calm note says it was not saved.

**Options considered:**

- Sending the response to a server
- Storing words and the drawing as one shared bundle
- Storing the response only in this browser, with the share flag limited to the drawing image

**Reason:** The draft has no accounts and no backend. The save screen offers "Leave it for someone" and "Keep it just mine" as equal buttons with neither chosen in advance. Taking a drawing back in the gallery sets that flag to keep.

## 2026-10-19 — Week summary counts tags

**Decision:** `js/week.js` counts theme tags on drawings from the last 7 days and fills a sentence template from `content/copy.js`. The template shape is "{theme} appeared in {count} of your {total} drawings." Tags are ordered by the count, highest first, and ties follow the tag text. The screen then shows "What do you make of that?" and a note field. The note is stored and not read by the page.

**Options considered:**

- A written interpretation of the drawings
- A single highlighted tag described as important
- A count of tags, phrased from a template, plus the person's own note

**Reason:** A count does not decide what a drawing means. The question stays a question. The page does not answer it.

## 2026-10-19 — Receive one local sample

**Decision:** "Leave one, receive one" is simulated on this device. The most recent drawing that is still left, and that has an image, unlocks one SVG from `content/sample-drawings.js` whose theme tag is the same text. "sit with it" and "not today" start unselected. "not today" keeps the sample title on the page. Neither button sends anything off this device.

**Options considered:**

- A network call that exchanges drawings with other people
- Choosing a sample because it seems related in meaning
- Matching the saved theme tag to a local SVG file

**Reason:** The sample is not a message from a person. Matching the tag avoids describing the drawing. The SVG files live in `content/samples/`.

## 2026-10-19 — Settings write the existing keys

**Decision:** The settings screen changes the same `hello-world-companion.settings` record. Text size steps through `small` (18px), `default` (20px), and `large` (24px) with A- and A+. High contrast, reduce motion, and reading speed are the same fields as before. Reading speed also sets the optional timer to 40 seconds when slow, 25 seconds when default, and 15 seconds when fast, and it still sets the welcome typing pace. If the device asks for reduced motion, motion stays reduced even when the stored switch is off.

**Options considered:**

- A second settings store
- Sliders that only change the settings screen
- Writing the settings object the shell already reads

**Reason:** The shell, the timer, and the welcome intro already read that object. One record keeps those behaviors together.

## 2026-10-19 — Local drawing images

**Decision:** The content security policy allows `data:` and `blob:` image sources in addition to this origin. A drawing made on the canvas, or a photo chosen on this device, can be shown from that local data. Audio, scripts, and other requests stay on this origin.

**Options considered:**

- Uploading the image to a host
- Refusing to show a saved drawing after refresh
- Allowing only local data images inside the existing page policy

**Reason:** The gallery and the save preview need to show the drawing after it is stored in this browser. That display is not a request to another site.

## 2026-10-19 — Content loads from script tags

**Decision:** Editable content lives in `content/copy.js`, `content/prompts.js`, `content/soundscapes.js`, and `content/sample-drawings.js`. `index.html` loads each one with a classic script tag. Those files assign data to `window.HelloWorldContent`. The page does not use `fetch`.

**Options considered:**

- Keep JSON files and load them with `fetch`
- Paste the sentences into the screen logic
- Classic script tags, with one data file per kind of content

**Reason:** Opening `index.html` directly uses a `file://` page. Browsers block `fetch` from that page, so the words never arrived and the draft showed "the words for this page did not load. you can refresh and try again." A script tag can read a local file next to the page. A person still changes the intro in `content/copy.js`, not in the screen logic. If those scripts are missing or unreadable, the same load note remains. The `noscript` sentence stays in `index.html`: "this page needs javascript to show the draft."
