# Exercise v2 Plan

Goal: **calm cards on the home page, everything else inside the exercise.** The card keeps only
what a quick workout needs (start the timer, count reps, done). Tapping it opens the exercise's own
page: timer / rep counter, description, and "steps" – short videos with hints that show what to do
(e.g. "20 min knee": 5 clips to replay while the timer runs).

Rules for the whole plan
- The home card only ever **loses** content (timer start and rep counter stay usable on it). Anything new goes to the exercise page.
- Off by default: Options → General → "Try the new exercise view". Switched off, the app behaves exactly as today.
- Viewing never needs a video: exercises without description or steps must look complete, too.

How to use this file: same rules as `refactor-plan.md` – top to bottom, one commit per task, tick `[x]`,
`mvn clean verify` + `npm test` / `npm run build` before ticking, never edit existing Flyway migrations.
Check `components/README.md` before building anything and list new reusable pieces there. Changelog: see T14.3.

Legend: 🧱 backend · 🎨 frontend · 🛠 operations · **S/M/L** = effort (S ≈ 1–2 h, M ≈ half a day, L ≈ a day)

---

## How it should look

Home card (new) – tapping it opens the exercise; only the controls (done, start / pause, − / +) work right on the card:
```
┌────────────────────────────────────────────┐
│ Knee workout  🔥 12                    ( ✓ ) │
│ 20:00 · 5 hours left                         │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  (only once started)        │
│ [            ▶  Start  20:00              ]  │   time: start / pause
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ Push-ups  🔥 3                         ( ✓ ) │
│ 40 reps · 5 hours left                       │
│ [   −   ]           15            [   +   ]  │   reps: counter
└────────────────────────────────────────────┘
```
Start and − / + are **big**: own row, 56 px high (full width on phones), so they can be hit mid-workout. On computers they
may sit on the right of the title, same height.

Exercise page, phone (swipe) / computer (list):
```
 ← Knee workout              ⋯     │  ← Knee workout                           ⋯
   20:00 · 5 hours left · 🔥 12    │    20:00 · 5 hours left · 🔥 12
 ┌──────────────────────────┐      │  ┌──────────────────────────────────────┐
 │  12:34      ▶ Start      │      │  │  12:34                     ▶ Start   │
 └──────────────────────────┘      │  └──────────────────────────────────────┘
 Description, 3 lines … more       │  Description …
 ┌────────────────────────┐ ┌──    │  ┌────────┐ 1. Wall sit · 3 × 30 s
 │       video  1:1       │ │      │  │ video  │ Back flat, knees over the ankles,
 ├────────────────────────┤ │      │  │  1:1   │ stop if it hurts.
 │ 1. Wall sit · 3 × 30 s │ │      │  └────────┘
 │ Back flat, knees over… │ │      │  ┌────────┐ 2. Leg raise · 2 × 12
 └────────────────────────┘ └──    │  │ video  │ …
          ● ○ ○ ○ ○                │  └────────┘
 Finished by  Anna 🔥3  Tom        │  Finished by  Anna 🔥3  Tom
 [ Statistics ]   [ Mark as done ] │  [ Statistics ]           [ Mark as done ]
```

---

## Decisions (confirmed by Leon, 2026-11-24)

| # | Question | Decision |
|---|---|---|
| D1 | Subview or dialog? | Own page `/exercises/:id`: back button, deep links and reminders work, no nested dialogs |
| D2 | Who edits description / steps? | Only the creator (as with Edit today); everybody who can see the exercise can watch |
| D3 | Where is the toggle stored? | Account-wide (`options`), so phone and computer match |
| D4 | Where are videos stored? | Files on the server outside the web root and the database (`app.media.dir`), only streamed by the backend after a permission check. Starts on the Hetzner server, may move to the private Raspberry Pi later (T12.5) |
| D5 | Who shrinks videos? | `ffmpeg` on the server: one format that plays everywhere (iPhones record HEVC `.mov`), and it removes the recording location. Shrinking in the browser is slow and unreliable on iPhones |
| D6 | Limits | Clips are meant to be about 3 s (said in the upload dialog), at most 15 s. Finished clip ≤ 2 MB (15 s at 800 kbit/s are about 1.6 MB), 12 steps per exercise, one video **or** photo per step, **50 MB of finished videos and photos per user** (`app.media.user-quota`, easy to raise). Raw upload ≤ 90 MB (Cloudflare's free plan stops at 100 MB) |
| D7 | Result | MP4 H.264, longest side ≤ 640 px, 800 kbit/s (config values), 30 fps, **with sound if it fits** (AAC mono 64 kbit/s), `+faststart`, JPEG poster. About 0.1 MB per second (0.37 MB for 3.5 s). Too large: lower video quality once → drop the sound → FAILED with a clear message. **Standard for now, chosen by Leon (T12.0)**; still to check with original phone clips (iPhone HDR / rotation) |
| D8 | What is on the card? | Title, goal · time left, own streak, reminder bell, thin progress bar, done circle, the first 3 **others** who finished (+ how many more; nothing if nobody), **quick control: start / pause (time) or − value + (reps)**. Moves to the page: full timer / counter, all finishers, statistics, ⋯ menu, collapse |
| D9 | Guided workout | Optional. The creator chooses per exercise: **off** (default), **fixed order** or **shuffled**. Everybody can change order and skip steps before starting, or ignore it and use the normal timer |

---

## Phase 10 – Page and toggle (no videos yet; already useful on its own)

### [x] T10.1 🧱 Option `newExerciseView` (S)
- Migration: `ALTER TABLE options ADD COLUMN new_exercise_view BOOLEAN NOT NULL DEFAULT FALSE`.
- `UserOptions`, `OptionsController.OptionsDto` (null = keep, as for the others); `optionsSlice` +
  `setNewExerciseView` / `selectNewExerciseView`.
- Options → General: row "Try the new exercise view" with badge "Beta" and a description (`settingStyles`).
- Home must not show the old card first and then switch: keep the skeleton until `loadOptions` has finished.
  If it fails, use the old card.
- Tests: `OptionsControllerTest` (default off, other PUTs keep it), slice test.

### [x] T10.2 🧱 Read one exercise (S)
- `GET /api/exercises/{id}` → `ExerciseDto`; 404 if unknown **or not visible** (does not reveal that it exists).
- `ExerciseAccess` (service): `requireVisible(id, user)` = visible (`isVisibleTo`, pulled out of `ExerciseService`)
  or on the user's home list (an exercise made private later stays on the list today); `requireCreator(id, user)`.
  Every endpoint of this plan uses it. Query only this exercise's groups, not all.
- Also use `requireVisible` in `ExerciseLogController`: it accepts any exercise id today.
- Tests: public / private / group member / invited only / home list; extend `QueryCountTest`.

### [x] T10.3 🎨 Exercise page (L)
- `views/exercise/exercise-view.ts`, `views/exercise/slice/exerciseDetailSlice.ts` (attach to `store.ts`),
  route `/exercises/:id` **after** `/exercises/new`.
- Content: `page-header` (Back → `/`, ⋯ menu: Edit, Remind me, Hide, Delete), goal / time left / streak,
  `exercise-timer` or `rep-counter`, finishers, Statistics, "Mark as done" (sticky at the bottom, safe area).
- Reuse instead of copying: move what card and page share (menu, done toggle with `LatestValueSync`, progress
  load / save, hide / delete confirmation) to shared elements / helpers. The old card uses them too and must not change.
- Skeleton, 404 and error states (`empty-state`); `onAppRefresh`; opens from a deep link without the home page
  loaded first (load options, checks, reminders there too).
- Opened from Browse (not on the home list): no timer / done; "Add to my list" instead.
- Going back to home keeps the scroll position. Statistics → Back returns to the exercise if opened from there.
- Tests: slice, goal / menu logic as pure functions.

### [x] T10.4 🎨 Timer next to other content (M)
Today the timer covers everything with its focus view when started; then no video is visible.
- `exercise-timer`: property `focusOnStart` (default true = as today). The page sets it to false; large view stays
  available by button. Sticky at the top of the page while running, so it is visible while swiping the steps.
- Keep: wake lock, finish sound, progress is never lost. Behavior with the option off is unchanged.
- The card has a timer, too: opening the exercise while it runs must **not** stop it. Move the running countdown out of the
  element into `utils/running-timer.ts` (end timestamp, at most one timer running, wake lock, finish sound, saving);
  card and page only show it. Starting another exercise's timer pauses and saves the first one.
- Leaving both pages (e.g. to Options): pause and save as today; the same on logout.
- Timer finished → offer "Mark as done" in place (no automatic check).
- Tests: `running-timer.test.ts` (survives card → page → card, second timer pauses the first), extend `exercise-timer.test.ts`.

### [x] T10.5 🎨 Calm card (M)
- `views/home/elements/exercise-card-compact.ts`, shown by `home-view` if the option is on. Content: D8.
- Title is the real link (keyboard, screen reader) stretched over the card; start / pause, − / +, the value and the done
  circle are separate controls that never open the page. Start / pause and − / + ≥ 56 px high (− / + also ≥ 56 px wide),
  value in large digits, done circle ≥ 44 px; enough gap so a miss does not open the exercise.
- Quick control: time → ▶ opens the existing large focus view (minimize → card shows the running time and pause);
  reps → − / + with the value editable by tapping. Reuse `exercise-timer` / `rep-counter` with a `compact` property, no copies.
  Done cards keep the quick control: the card must not shrink by itself.
- Done: green circle and border, muted text, same size.
- "New exercise" is an icon in the top bar on phones (the floating + would cover the + of a counter).
- Edit order keeps working: same events, grip handle and arrows. `home-view` finds cards by tag name
  (`querySelectorAll("exercise-card")`) when dragging → use a shared marker class / attribute.
- Progress bar needs each card's log: add `GET /api/log` (all logs of the user, one request), not one per card.
- "Auto-collapse" row in Options is hidden while the new view is on.
- Push reminder opens `/exercises/:id` for users with the option on (`ReminderMessages` / `ReminderService`),
  only if it is about a single exercise.
- Tests: no control on the card navigates; drag order with the new card.

---

## Phase 11 – Description and steps (text)

### [x] T11.1 🧱 Data model and API (M)
- Migration:
  - `exercise_detail (exercise_id UUID PK → exercise ON DELETE CASCADE, description TEXT, guided_mode OFF|ORDERED|SHUFFLED DEFAULT OFF)`
  - `exercise_step (step_id UUID PK, exercise_id → exercise ON DELETE CASCADE, position INT, title, hints, sets INT, reps INT, duration_seconds INT, rest_seconds INT)`
    (all four numbers optional; reps or duration, not both); index on `exercise_id`. Check the name of the exercise table in the migrations first.
- Own tables on purpose: `PUT /api/exercises/{id}` rebuilds the whole entity, clears `lastSchedulerRun` and restarts
  the scheduler. Changing a hint must **never** move the reset or wipe fields.
- `ExerciseDetailService`:
  - `GET /api/exercises/{id}/details` → description + ordered steps
  - `PUT /api/exercises/{id}/details` (description + guided mode)
  - `POST /api/exercises/{id}/steps`, `PUT|DELETE /api/exercises/{id}/steps/{stepId}`, `PUT /api/exercises/{id}/steps/order`
- Always check that the step belongs to that exercise. Limits: description 2000, title 80, hints 500 characters, 12 steps, sensible ranges for the numbers.
- The target text ("3 × 12", "3 × 30 s") is built from the numbers (`formatTarget` in `utils/format.ts` + tests).
- Plain text only (line breaks kept by CSS), never HTML.
- List endpoints stay unchanged: details are loaded only on the page.
- Tests: permissions, order, limits, "editing details keeps `lastSchedulerRun` and the scheduler", query count.
- `AccountDeletionTest`: handed-over exercise keeps its details, deleted exercise loses them.

### [x] T11.2 🎨 Show description and steps (M)
- `views/exercise/elements/exercise-steps.ts` + `exercise-step.ts`. Layout as sketched: list with media left and
  text right from 769 px; below that horizontal CSS scroll-snap with a peek of the next step and dots.
- A step without video shows its number / title over the full width (no empty video box). One step: no dots.
- Keyboard / screen reader: prev / next buttons, region label, "2 of 5". Respect `prefers-reduced-motion`.
- Swiping sideways must not trigger pull to refresh (`overlay-view.pullStart`: check its ignore rule).
- Description: first 3 lines + "Show more". Nothing at all if empty (creator: "Add description or videos").

### [x] T11.3 🎨 Edit description and steps (M)
- Separate page `/exercises/:id/content` (creator only; ⋯ → "Description & videos"), so the already long
  `exercise-form` does not grow. After creating an exercise: open its page with the "Add …" hint.
- Add / edit / delete steps; reorder with the existing `moveItem` / `dropIndex` helpers (move the drag code out of
  `home-view` instead of copying it) and arrows.
- Delete asks with `confirm-dialog`.

---

### [x] T11.4 🧱🎨 Personal notes (S)
- Migration `exercise_note (exercise_id → exercise, username → users, both ON DELETE CASCADE, PK (exercise_id, username), text)`.
- `GET` / `PUT /api/exercises/{id}/note` (own note only, max. 1000 characters, empty text deletes it; `requireVisible`).
- Page: "My notes" ("Only you can see this"), one tap to edit; nothing but a small "Add note" if empty. Not on the card.
- Tests: others never get it, exercise and account deletion (`AccountDeletionTest`).

---

## Phase 12 – Videos: backend and server

### [ ] T12.0 🛠 Try the video quality (S) – before T12.2
- Convert 4–5 real clips (iPhone and Android, portrait / landscape, fast movement, bad light) with the D7 settings and with
  640 / 720 px and 800 / 1200 / 1600 kbit/s; watch them on a phone, small and full screen, and note the sizes.
- Leon picks one; write the result into D6 / D7 (keep it a config value). Real clips are not committed (`/tmpvideos/` is ignored).
- [x] Android clips (via WhatsApp): 640 px / 800 kbit/s is more than enough.
- [ ] Original clips: iPhone / iPad (HDR, rotation), Android by cable – at the latest with T12.3.

### [ ] T12.1 🛠 Server preparation (S) – done by Leon, the plan only supplies the snippets
- `apt install ffmpeg`; folder `/var/lib/exercise-counter/media`, owned by the backend's user, outside the web root
  and **not** inside a folder the deploy replaces; `APP_MEDIA_DIR` in `excountvars.env`.
- nginx: `client_max_body_size 95m` **only** for the upload location (default is 1 MB → 413), longer
  `client_body_timeout` / `proxy_read_timeout`, streaming: `proxy_buffering off` for the video location.
- Check the security headers: a CSP needs `media-src 'self' blob:`. Cloudflare must not cache `/api/**`.
- Back up the media folder together with the database (T6.2); check free disk space first.
- The deploy script is not changed.
- Later (decided by Leon, only invited friends for now): run the backend as its own user instead of root (if it does), because ffmpeg
  reads uploaded files. Do it before the app is opened to strangers.

### [ ] T12.2 🧱 Store and deliver (L)
- Migration `exercise_media (media_id UUID PK, step_id UNIQUE → exercise_step ON DELETE CASCADE,
  kind VIDEO|PHOTO, uploaded_by → users ON DELETE SET NULL, status PROCESSING|READY|FAILED, error, size_bytes, duration_ms, width, height, has_audio, created_at)`.
- Config: `app.media.dir` (empty = feature off, like the push keys; `GET /api/media/config` → `{enabled, maxBytes, maxSeconds}`),
  `app.media.ffmpeg` / `ffprobe`, limits; Spring `multipart.max-file-size` / `max-request-size`, uploads to disk, not memory.
- `PUT /api/exercises/{id}/steps/{stepId}/media` (multipart) → 202 + status PROCESSING; `DELETE` the same path.
- `GET /api/media/{mediaId}` (and `/api/media/config`, `/usage` must not clash with it) and `/poster`: `requireVisible`, return a `Resource` so **range requests** work
  (Safari does not play without 206), `Cache-Control: private, max-age=31536000, immutable`
  (a new upload gets a new id), `X-Content-Type-Options: nosniff`.
- File names come only from the UUID, never from the upload. `MediaStorage` writes to temp, then moves atomically.
- Quota per user is checked before and after processing; concurrent uploads must not exceed it. 413 / 400 with clear messages.
- CSRF protection is off in this app: check that the session cookie is `SameSite=Lax` or stricter before adding
  uploads (a cross-site form can send multipart).
- Tests: permission matrix, range → 206, too large, quota, feature off.

### [ ] T12.3 🧱 Convert (L)
- `VideoProcessor`: queue with **one** worker (small server, timers and resets must not suffer), low priority (`nice`),
  timeout 3 min. On startup: PROCESSING rows are set to FAILED ("Please upload again") and their temp files deleted.
- `ffprobe` first: must contain a video stream, ≤ 15 s, sane size; never trust extension or Content-Type.
- `ffmpeg` via `ProcessBuilder` with an argument list (no shell), `-protocol_whitelist file`, only accepted input formats
  (`mov,mp4`, `matroska,webm`), one thread, output limit (`-fs`). Result per D7, `-map_metadata -1`
  (sound: first audio stream if there is one, fallback steps per D7; column `has_audio`), rotation applied, HDR → SDR (iPhone), poster from 0.5 s. The original is always deleted.
- Status is polled by the page (every 2 s, only while something is PROCESSING).
- Tests: command building incl. fallback order (unit); clip with / without sound; real conversion only if `ffmpeg` is installed (assumption), small generated clip;
  no location in the output; garbage file → FAILED.

### [ ] T12.4 🧱 Cleaning up files (M)
Cascades delete rows, **not** files – every path needs it:
- video replaced / deleted, step deleted, exercise deleted (`ExerciseService.delete`), account deleted
  (`AccountDeletionService`): collect ids before, delete the files **after commit**. Deleting while converting must be safe.
- Handed-over exercise keeps its videos and counts towards the new creator's quota (quota = media of own exercises).
  Over the limit because of that: everything stays, only new uploads are blocked until below 50 MB again (+ test).
- Nightly job deletes files without a row older than 24 h (safety net). It must do nothing if the database is unreachable.
- Tests: `AccountDeletionTest`, delete paths, rollback keeps files.

---

### [ ] T12.5 🛠 Move the videos to the Raspberry Pi (M) – later, optional
Not needed for the start (50 MB per user is little), but must not become a rewrite:
- T12.2 hides storage behind the `MediaStorage` interface (write, open a byte range, delete, list); the rest never sees paths.
- To decide: Pi (10.0.0.2, WireGuard) as a small internal storage service vs. a network mount. Prefer the service:
  a hanging mount blocks backend threads. Reachable only through WireGuard, never public; the backend still checks permissions.
- Pi offline: exercise page works, videos show "currently not available" (short timeouts); cleanup must not treat it as "no files".
- Home upload speed limits playback – measure it. Optional: cache on the Hetzner server.
- Cheaper first step: keep the videos on Hetzner and use the Pi as the **backup** target (T12.1).

---

## Phase 13 – Videos: frontend, guided workout

### [ ] T13.1 🎨 Player (M)
- Generic `components/loop-video.ts`: square / rectangle with poster, `muted loop playsinline preload="none"`,
  sound button only if the clip has sound (starts muted, choice kept while the page is open); tap = play / pause, `object-fit: contain`, states "processing" / "failed" / offline.
- Only one video plays at a time; pauses when swiped away, page hidden or removed. No autoplay (mobile data).
- Enlarge button (full screen), speed 0.5× / 1×, so the movement can be studied.
- The service worker already ignores `/api/**`; verify playback + seeking on a real iPhone (installed app) and Android.

### [ ] T13.2 🎨 Upload (M)
- `input type="file" accept="video/*"` in the step editor (phones offer "record" and "library"), checked before sending:
  size, length (from the metadata, if the browser can read it). Hidden if `/api/media/config` says off.
- `api/http.ts`: `apiUpload` with progress (XMLHttpRequest, `fetch` has no upload progress) and abort; same `ApiError`.
- Progress bar, cancel, retry, warning when leaving during upload; the step's text stays saved if the upload fails.
- Short note next to it: who can see the video (visibility of the exercise), sound is kept if it fits,
  about 3 s is ideal, how much of the 50 MB is used (`GET /api/media/usage`).
- Tests: http upload (progress, 413, abort), slice.

---

### [x] T13.3 🎨 Guided workout (L)
Needs only Phases 10–11 (videos are shown if there are any).
- Editor: "Guided workout" = Off / Fixed order / Shuffled, per exercise (`guided_mode`).
- Page: "Start guided workout" next to the normal timer, only if not off and there are steps. Nothing starts by itself.
- Start sheet: list of steps in the configured order → drag to reorder, untick to skip, "Shuffle". Last own order is
  remembered on this device (`preferences.ts`), the creator's setup is never changed; new / deleted steps are handled.
- Run: step with duration counts down; step with reps or without numbers waits for "Next"; sets repeat; rest in between.
  Video, hints, "2 of 5", previous / next / pause, sound between steps (`utils/sounds.ts`), vibration, wake lock.
- Time exercise: the elapsed workout time counts as progress (same `running-timer`, never two timers at once).
  Rep exercise: no automatic reps. At the end offer "Mark as done".
- Leaving midway: progress saved; the guided run itself starts over next time.
- Tests: sequence logic as pure functions (`utils/guided-workout.ts`): sets, rests, skip, shuffle, stored order vs. changed steps.

---

### [ ] T13.4 🧱🎨 Photo instead of a video (M)
- Same step slot, upload, permissions, quota and cleanup as videos (`kind = PHOTO`); file picker also accepts images.
- Convert to JPEG, longest side ≤ 1280 px, rotation applied, location / EXIF removed, raw photo ≤ 20 MB, pixel limit
  against decompression bombs. Test iPhone HEIC; show a clear message if the format is not supported.
- Shown in the same box as the video, tap = enlarge, no play button. Guided workout shows it like a video.
- Tests: no EXIF in the result, replace video by photo and back (old files removed), quota.

---

## Phase 14 – Try out and switch over

### [ ] T14.1 🎨 Check on devices (S)
Phone + computer, light + dark, long titles, 0 / 1 / 12 steps, no description, slow network, offline, screen reader,
large text. Option off: app unchanged.

### [ ] T14.2 📋 Feedback (S)
One line on the page while in beta: "New view – something odd?" → Options → General to switch off. Collect for a few weeks.

### [ ] T14.3 📋 Changelog and docs (S)
- Entry for each phase that reaches users ("New, can be turned on in Options → General: …").
- `CLAUDE.md`: new folders, `ExerciseAccess`, media config, "cascades do not delete files".

### [ ] T14.4 🎨 New view for everyone – only when Leon says so (M)
Default on first (users can still turn it off), later remove the old card, its collapse logic, `auto_collapse` and the option.

---

## Ideas – not in the plan yet (pick, then they become tasks)

| # | Idea | Effort | Opinion |
|---|---|---|---|
| I3 | Tick off steps in the current period (cleared by the reset) | M | Maybe – overlaps with the guided workout |
| I5 | Copy an exercise with description and videos ("make it mine") | M | Nice for groups; videos must be copied, too |
| I6 | Cut a clip (start / end) when uploading | M | Good follow-up, `ffmpeg` can do it |
| I7 | Mirror video left / right | S | Cheap, handy for one-sided exercises |
| I8 | Keep videos on the device for offline use | M | Later: needs service worker changes and cleanup on logout |
| I9 | Comments / cheering on the page | M | Better with Phase 7 (`feature-plan.md`) |
| I10 | Link to a YouTube video instead of uploading | S | Useful for existing guides; opens externally, no embedding (privacy) |

---

## Order and dependencies

1. **Phase 10** → can go live behind the toggle (T10.1 → T10.2 → T10.3 → T10.4 → T10.5)
2. **Phase 11** → usable without videos → **T13.3** (guided workout) any time after Phase 11
3. **T12.0** and **T12.1** before T12.2 goes live; **T12.2 → T12.3 → T12.4 → T13.1 → T13.2** go live together; **T13.4** after them
4. **T6.2** (backup, `feature-plan.md`) before the first real videos
5. **Phase 14**

## Progress

| Phase | Tasks | Done |
|---|---|---|
| 10 – Page and toggle | 5 | 5 |
| 11 – Description, steps, notes | 4 | 4 |
| 12 – Videos: backend and server | 6 | 0 |
| 13 – Videos: frontend, guided workout, photos | 4 | 1 |
| 14 – Try out and switch over | 4 | 0 |
