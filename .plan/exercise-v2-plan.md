# Exercise v2 Plan

Goal: **calm cards on the home page, everything else inside the exercise.** Tapping a card opens the exercise's own
page: timer / rep counter, description, and "steps" – short videos with hints that show what to do
(e.g. "20 min knee": 5 clips to replay while the timer runs).

Rules for the whole plan
- The home card only ever **loses** content. Anything new goes to the exercise page.
- Off by default: Options → General → "Try the new exercise view". Switched off, the app behaves exactly as today.
- Viewing never needs a video: exercises without description or steps must look complete, too.

How to use this file: same rules as `refactor-plan.md` – top to bottom, one commit per task, tick `[x]`,
`mvn clean verify` + `npm test` / `npm run build` before ticking, never edit existing Flyway migrations.
Check `components/README.md` before building anything and list new reusable pieces there. Changelog: see T14.3.

Legend: 🧱 backend · 🎨 frontend · 🛠 operations · **S/M/L** = effort (S ≈ 1–2 h, M ≈ half a day, L ≈ a day)

---

## How it should look

Home card (new) – the whole card opens the exercise, only the circle marks it as done:
```
┌──────────────────────────────────────────┐
│ Knee workout                🔥 12    ( ✓ ) │
│ 20:00 · 5 hours left                       │
│ ▓▓▓▓▓▓▓▓░░░░░░░░  (only once started)      │
└──────────────────────────────────────────┘
```

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

## Decisions (defaults used below – change them before the task starts)

| # | Question | Default |
|---|---|---|
| D1 | Subview or dialog? | Own page `/exercises/:id`: back button, deep links and reminders work, no nested dialogs |
| D2 | Who edits description / steps? | Only the creator (as with Edit today); everybody who can see the exercise can watch |
| D3 | Where is the toggle stored? | Account-wide (`options`), so phone and computer match |
| D4 | Where are videos stored? | Files on the server outside the web root and the database (`app.media.dir`), only streamed by the backend after a permission check |
| D5 | Who shrinks videos? | `ffmpeg` on the server: one format that plays everywhere (iPhones record HEVC `.mov`), and it removes the recording location. Shrinking in the browser is slow and unreliable on iPhones |
| D6 | Limits | 60 s per clip, upload ≤ 90 MB (Cloudflare's free plan stops at 100 MB), 12 steps per exercise, one video per step, 500 MB of finished videos per user |
| D7 | Result | MP4 H.264, longest side ≤ 640 px, 30 fps, **no sound**, `+faststart`, JPEG poster. At about 800 kbit/s ≈ 3 MB for 30 s |
| D8 | What is on the card? | Title, goal · time left, own streak, reminder bell, thin progress bar, done circle. Moves to the page: timer, rep counter, finishers, statistics, ⋯ menu, collapse |

---

## Phase 10 – Page and toggle (no videos yet; already useful on its own)

### [ ] T10.1 🧱 Option `newExerciseView` (S)
- Migration: `ALTER TABLE options ADD COLUMN new_exercise_view BOOLEAN NOT NULL DEFAULT FALSE`.
- `UserOptions`, `OptionsController.OptionsDto` (null = keep, as for the others); `optionsSlice` +
  `setNewExerciseView` / `selectNewExerciseView`.
- Options → General: row "Try the new exercise view" with badge "Beta" and a description (`settingStyles`).
- Home must not show the old card first and then switch: keep the skeleton until `loadOptions` has finished.
  If it fails, use the old card.
- Tests: `OptionsControllerTest` (default off, other PUTs keep it), slice test.

### [ ] T10.2 🧱 Read one exercise (S)
- `GET /api/exercises/{id}` → `ExerciseDto`; 404 if unknown **or not visible** (does not reveal that it exists).
- `ExerciseAccess` (service): `requireVisible(id, user)` = visible (`isVisibleTo`, pulled out of `ExerciseService`)
  or on the user's home list (an exercise made private later stays on the list today); `requireCreator(id, user)`.
  Every endpoint of this plan uses it. Query only this exercise's groups, not all.
- Also use `requireVisible` in `ExerciseLogController`: it accepts any exercise id today.
- Tests: public / private / group member / invited only / home list; extend `QueryCountTest`.

### [ ] T10.3 🎨 Exercise page (L)
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

### [ ] T10.4 🎨 Timer next to other content (M)
Today the timer covers everything with its focus view when started; then no video is visible.
- `exercise-timer`: property `focusOnStart` (default true = as today). The page sets it to false; large view stays
  available by button. Sticky at the top of the page while running, so it is visible while swiping the steps.
- Keep: wake lock, finish sound, saving progress when the element is removed (Back while running = paused + saved).
- Timer finished → offer "Mark as done" in place (no automatic check).
- Tests: extend `exercise-timer.test.ts`.

### [ ] T10.5 🎨 Calm card (M)
- `views/home/elements/exercise-card-compact.ts`, shown by `home-view` if the option is on. Content: D8.
- Title is the real link (keyboard, screen reader) stretched over the card; the done circle is a separate ≥ 44 px button
  that never opens the page. Done: green circle and border, muted text – no collapsing needed.
- Edit order keeps working: same events, grip handle and arrows. `home-view` finds cards by tag name
  (`querySelectorAll("exercise-card")`) when dragging → use a shared marker class / attribute.
- Progress bar needs each card's log: add `GET /api/log` (all logs of the user, one request), not one per card.
- "Auto-collapse" row in Options is hidden while the new view is on.
- Push reminder opens `/exercises/:id` for users with the option on (`ReminderMessages` / `ReminderService`),
  only if it is about a single exercise.
- Tests: done circle does not navigate; drag order with the new card.

---

## Phase 11 – Description and steps (text)

### [ ] T11.1 🧱 Data model and API (M)
- Migration:
  - `exercise_detail (exercise_id UUID PK → exercise ON DELETE CASCADE, description TEXT)`
  - `exercise_step (step_id UUID PK, exercise_id → exercise ON DELETE CASCADE, position INT, title, target, hints)`;
    index on `exercise_id`. Check the name of the exercise table in the migrations first.
- Own tables on purpose: `PUT /api/exercises/{id}` rebuilds the whole entity, clears `lastSchedulerRun` and restarts
  the scheduler. Changing a hint must **never** move the reset or wipe fields.
- `ExerciseDetailService`:
  - `GET /api/exercises/{id}/details` → description + ordered steps
  - `PUT /api/exercises/{id}/description`
  - `POST /api/exercises/{id}/steps`, `PUT|DELETE /api/exercises/{id}/steps/{stepId}`, `PUT /api/exercises/{id}/steps/order`
- Always check that the step belongs to that exercise. Limits: description 2000, title 80, target 40
  ("3 × 12", free text), hints 500 characters, 12 steps.
- Plain text only (line breaks kept by CSS), never HTML.
- List endpoints stay unchanged: details are loaded only on the page.
- Tests: permissions, order, limits, "editing details keeps `lastSchedulerRun` and the scheduler", query count.
- `AccountDeletionTest`: handed-over exercise keeps its details, deleted exercise loses them.

### [ ] T11.2 🎨 Show description and steps (M)
- `views/exercise/elements/exercise-steps.ts` + `exercise-step.ts`. Layout as sketched: list with media left and
  text right from 769 px; below that horizontal CSS scroll-snap with a peek of the next step and dots.
- A step without video shows its number / title over the full width (no empty video box). One step: no dots.
- Keyboard / screen reader: prev / next buttons, region label, "2 of 5". Respect `prefers-reduced-motion`.
- Swiping sideways must not trigger pull to refresh (`overlay-view.pullStart`: check its ignore rule).
- Description: first 3 lines + "Show more". Nothing at all if empty (creator: "Add description or videos").

### [ ] T11.3 🎨 Edit description and steps (M)
- Separate page `/exercises/:id/content` (creator only; ⋯ → "Description & videos"), so the already long
  `exercise-form` does not grow. After creating an exercise: open its page with the "Add …" hint.
- Add / edit / delete steps; reorder with the existing `moveItem` / `dropIndex` helpers (move the drag code out of
  `home-view` instead of copying it) and arrows.
- Delete asks with `confirm-dialog`.

---

## Phase 12 – Videos: backend and server

### [ ] T12.1 🛠 Server preparation (S) – done by Leon, the plan only supplies the snippets
- `apt install ffmpeg`; folder `/opt/exercise-counter/media`, owned by the backend's user, outside the web root
  and **not** inside a folder the deploy replaces; `APP_MEDIA_DIR` in `excountvars.env`.
- nginx: `client_max_body_size 95m` **only** for the upload location (default is 1 MB → 413), longer
  `client_body_timeout` / `proxy_read_timeout`, streaming: `proxy_buffering off` for the video location.
- Check the security headers: a CSP needs `media-src 'self' blob:`. Cloudflare must not cache `/api/**`.
- Back up the media folder together with the database (T6.2); check free disk space first.
- The deploy script is not changed.

### [ ] T12.2 🧱 Store and deliver (L)
- Migration `exercise_video (video_id UUID PK, step_id UNIQUE → exercise_step ON DELETE CASCADE,
  uploaded_by → users ON DELETE SET NULL, status PROCESSING|READY|FAILED, error, size_bytes, duration_ms, width, height, created_at)`.
- Config: `app.media.dir` (empty = feature off, like the push keys; `GET /api/media/config` → `{enabled, maxBytes, maxSeconds}`),
  `app.media.ffmpeg` / `ffprobe`, limits; Spring `multipart.max-file-size` / `max-request-size`, uploads to disk, not memory.
- `PUT /api/exercises/{id}/steps/{stepId}/video` (multipart) → 202 + status PROCESSING; `DELETE` the same path.
- `GET /api/videos/{videoId}` and `/poster`: `requireVisible`, return a `Resource` so **range requests** work
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
- `ffprobe` first: must contain a video stream, ≤ 60 s, sane size; never trust extension or Content-Type.
- `ffmpeg` via `ProcessBuilder` with an argument list (no shell), `-protocol_whitelist file`, only accepted input formats
  (`mov,mp4`, `matroska,webm`), one thread, output limit (`-fs`). Result per D7, `-an -map_metadata -1`,
  rotation applied, HDR → SDR (iPhone), poster from 0.5 s. The original is always deleted.
- Status is polled by the page (every 2 s, only while something is PROCESSING).
- Tests: command building (unit); real conversion only if `ffmpeg` is installed (assumption), small generated clip;
  no location in the output; garbage file → FAILED.

### [ ] T12.4 🧱 Cleaning up files (M)
Cascades delete rows, **not** files – every path needs it:
- video replaced / deleted, step deleted, exercise deleted (`ExerciseService.delete`), account deleted
  (`AccountDeletionService`): collect ids before, delete the files **after commit**. Deleting while converting must be safe.
- Handed-over exercise keeps its videos and counts towards the new creator's quota (quota = videos of own exercises).
- Nightly job deletes files without a row older than 24 h (safety net). It must do nothing if the database is unreachable.
- Tests: `AccountDeletionTest`, delete paths, rollback keeps files.

---

## Phase 13 – Videos: frontend

### [ ] T13.1 🎨 Player (M)
- Generic `components/loop-video.ts`: square / rectangle with poster, `muted loop playsinline preload="none"`,
  tap = play / pause, `object-fit: contain`, states "processing" / "failed" / offline.
- Only one video plays at a time; pauses when swiped away, page hidden or removed. No autoplay (mobile data).
- Enlarge button (full screen), speed 0.5× / 1×, so the movement can be studied.
- The service worker already ignores `/api/**`; verify playback + seeking on a real iPhone (installed app) and Android.

### [ ] T13.2 🎨 Upload (M)
- `input type="file" accept="video/*"` in the step editor (phones offer "record" and "library"), checked before sending:
  size, length (from the metadata, if the browser can read it). Hidden if `/api/media/config` says off.
- `api/http.ts`: `apiUpload` with progress (XMLHttpRequest, `fetch` has no upload progress) and abort; same `ApiError`.
- Progress bar, cancel, retry, warning when leaving during upload; the step's text stays saved if the upload fails.
- Short note next to it: who can see the video (visibility of the exercise), sound is removed.
- Tests: http upload (progress, 413, abort), slice.

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
| I1 | **Guided workout**: steps get a duration, "Start" runs through them (video, countdown, sound, next step, pause between) | L | Best addition; fits "20 min knee". Prepare now: structured `duration_seconds` / `sets` / `reps` instead of only free text |
| I2 | **Personal notes** per exercise, only visible to me ("left knee: lower weight") | S | Yes – others' exercises get useful, too |
| I3 | Tick off steps in the current period (cleared by the reset) | M | Yes, if I1 is not built |
| I4 | Photo instead of a video per step | S | Yes – smaller, enough for poses |
| I5 | Copy an exercise with description and videos ("make it mine") | M | Nice for groups; videos must be copied, too |
| I6 | Cut a clip (start / end) when uploading | M | Good follow-up, `ffmpeg` can do it |
| I7 | Mirror video left / right | S | Cheap, handy for one-sided exercises |
| I8 | Keep videos on the device for offline use | M | Later: needs service worker changes and cleanup on logout |
| I9 | Comments / cheering on the page | M | Better with Phase 7 (`feature-plan.md`) |
| I10 | Link to a YouTube video instead of uploading | S | Useful for existing guides; opens externally, no embedding (privacy) |

---

## Order and dependencies

1. **Phase 10** → can go live behind the toggle (T10.1 → T10.2 → T10.3 → T10.4 → T10.5)
2. **Phase 11** → usable without videos; decide **I1** before T11.1 (changes the step table)
3. **T12.1** any time before Phase 12 goes live; **T12.2 → T12.3 → T12.4 → T13.1 → T13.2** go live together
4. **T6.2** (backup, `feature-plan.md`) before the first real videos
5. **Phase 14**

## Progress

| Phase | Tasks | Done |
|---|---|---|
| 10 – Page and toggle | 5 | 0 |
| 11 – Description and steps | 3 | 0 |
| 12 – Videos: backend and server | 4 | 0 |
| 13 – Videos: frontend | 2 | 0 |
| 14 – Try out and switch over | 4 | 0 |
