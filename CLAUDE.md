# CLAUDE.md

## Project Overview

Full-stack exercise tracking app with:
- **Backend**: Java/Spring Boot (Maven), REST API under `/api/`
- **Frontend**: Lit (Web Components) + Redux + Shoelace UI, located in `frontend/src/`

## Key Conventions

- Views are Lit custom elements in `frontend/src/views/<name>/<name>-view.ts`
- Styles use Lit's `css` tagged template literal (Shadow DOM scoped)
- Shoelace components (`sl-button`, `sl-input`, `sl-dialog`, etc.) are used throughout the UI
- State management via Redux slices in each view's `slice/` subfolder
- Routing via `CustomRouter` from `../../index`

## Learned

- `statistics-view.ts` uses `@media (max-width: 768px)` breakpoint and `max-width: 800px` container — follow this pattern for responsive views
- Inline styles (`style="color: red"`) should be moved to CSS classes for consistency
- `groupCard` elements should use `width: 100%; box-sizing: border-box` (not `width: fit-content`) to fill containers properly on desktop
- The `.header` class in groups/statistics views uses `display: flex` — the `grid-template-columns` property in the original groups-view was dead code (flex ignores it)
- `exercise-card.ts` shows time left until next reset using `timeLeftSeconds` from the backend DTO (calculated server-side). Display ">= 1 day" as "X Days left", otherwise "X Hours left". Urgent (< 6h) is highlighted in orange.
- `utcOffset` in Exercise is in hours (not minutes). The backend calculates `startTimeUtc = startTime.minusHours(utcOffset)` to convert the user's local reset time to UTC.
- `timeLeftSeconds` in `ExerciseDto` is computed via `SchedulerService.getTimeLeftSeconds()` which calls `ScheduledFuture.getDelay()` — this correctly reflects the actual next-reset time for multi-day exercises (`daysRepeat > 1`). Do NOT recalculate it in `ExerciseController` using date arithmetic; the scheduler is the authoritative source.
- `daysRepeat` controls how often the scheduler fires (every N days), not how many days the exercise runs per cycle. `startTime` is the daily clock time of the reset, but the reset only happens every `daysRepeat` days.
- `exerciseValue` for time exercises (TIMEREPEAT, TIMEINCREASE) is stored as seconds (integer string). Format with `formatTime(secs)` → `M:SS` or `H:MM:SS`.
- `ExerciseLog` entity (composite key: exerciseId + username) stores one "current period" progress per user per exercise. `value` is seconds-completed for time exercises, or reps-completed for rep exercises. Endpoints: `GET /api/log/{exerciseId}` and `POST /api/log/save`.
- Timer in `exercise-card.ts` uses `setInterval` (stored as class property, not `@state`) and Web Audio API for finish sound. Clear the interval in `disconnectedCallback`. Load saved log in `updated()` when `item.exerciseId` first becomes valid.
- Rep counter in `exercise-card.ts` uses a debounced save (500ms) to avoid excessive API calls on rapid +/- clicks.
