# CLAUDE.md

## Project
The complete Project is used to challange friends and family to do daily workouts,
therefore a simple frontend is provided that allows users to create workouts and track 
the progress. Groups can be created and users can join them when invited.
Also they automatically get updated after a certain time span. So there are schedulers 
hooked into the backend.

The Backend is a REST API that provides the data for the frontend.
It is written in Java and uses Spring Boot.
The database is PostgreSQL.
The frontend is bundled with Vite and uses Lit components, Redux and Shoelace UI.
The frontend routing is done with lit/labs router

Spring Boot 4.0.3 
Maven build, Java 23, PostgreSQL database.

## Build & Test
For backend
```bash
mvn clean verify        # full build + tests
mvn test                # tests only
mvn spring-boot:run     # run locally (needs DB)
```
For frontend
```bash
npm install             # install dependencies
npm run dev             # run dev server
npm run build           # build for production
```

## Database
- PostgreSQL via Docker Compose: `docker compose up db`
- Flyway migrations in `src/main/resources/db/migration/`
- NEVER edit existing migration files — always add new ones with next version number
- When creating Repositorys in the backend make sure a corresponding table exists in the database migrations

## Project Structure
- `src/main/java/...` BACKEND
    - `migration/`  — Place for Data migrations that need java code to run
    - `web/`        — General place for the backend code
    - `web/data/`   — Place for Spring Data Repositories and entities
    - `web/rest/`   — Place for REST Controllers
    - `web/scheduler/`  — Place for Schedulers, that update the checks
    - `web/security/`   — Spring security
- `src/test/java/...` Backend tests
    - `foldername` ${foldername} tests for services and corresponding code that relate to ${foldername}
- `frontend/...` FRONTEND
    - `/`                 — index.html and vite config and package.json
    - `src/`              — general files that not have any relation to distinct views like the index.ts, lit-router.ts, redux store and so on.
    - `src/othrSlices/`   — Place for Redux slices that have no distinct view
    - `web/views/`        — Place for views, f.e. the login page has its own folder, or the home folder includes the main page where the exercises get shown.

## Conventions
- Lombok is used — prefer `@RequiredArgsConstructor`, `@Data`
- Follow existing package and naming patterns
- All endpoints authenticated except `/api/public/**`
- Try to use Records for new Dto objects
- when creating new view in the frontend where data is used make sure to create a corresponding Redux slice and attach it to the store.ts
- try to write unit tests for new code/features if it is possible
- Views are Lit custom elements in `frontend/src/views/<name>/<name>-view.ts`
- Styles use Lit's `css` tagged template literal (Shadow DOM scoped) or create a `styles.css` file for shared styles
- Shoelace components (`sl-button`, `sl-input`, `sl-dialog`, etc.) are used throughout the UI
- State management via Redux slices in each view's `slice/` subfolder
- Always execute api calls etc. in the redux slice, dont diretly fetch data from the backend
- Routing via `CustomRouter` from `../../index`

## Git
- Always run: `git add -A && git commit -m "fix: description (#ISSUE_NUMBER)"`
- Commit before finishing — do not leave changes uncommitted
- Do not make a pr, there is a workflow for that



## Do Not Touch
nothing distinct for now

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
- `Exercise.lastSchedulerRun` (UTC `LocalDateTime`, nullable) records when the scheduler last fired. On startup, `SchedulerService.calculateNextRunInstant()` uses it to compute the remaining delay: `lastSchedulerRun + daysRepeat days` at the configured reset time. If that time is past, the task is scheduled immediately. New exercises (null) fall back to the original `generateStartTime` logic.
- `exercise-card.ts` layout uses a flex column with three sections: `.card-header` (title + icon-button actions), `.card-body` (2-column grid of label/value pairs), and `.card-footer` (Statistics button + Finished checkbox). Timer display and controls are inlined in a `.timer-row` flex row to reduce card height. Icon button colors go via CSS classes (`.hide-icon`, `.trash-icon`) — do NOT use inline `style=` attributes on them.
