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
mvn spring-boot:run -Dspring-boot.run.profiles=dev   # run locally with dev login user/password
```
For frontend
```bash
npm install             # install dependencies
npm run dev             # run dev server
npm run build           # build for production
npm test                # frontend unit tests (vitest, *.test.ts next to the code)
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
    - `web/rest/`   — Place for REST Controllers (thin: read request, call a service, return a DTO) and their `dto/` records
    - `web/rest/error/` — `GlobalExceptionHandler`, `NotFoundException` (404), `ForbiddenException` (403); errors are JSON `{"error": "..."}`
    - `web/service/` — Business logic and transactions (`ExerciseService`, `CheckService`, `SelectionService`, `GroupService`, `StatisticService`, `InviteService`)
    - `web/scheduler/`  — Place for Schedulers, that update the checks
    - `web/security/`   — Spring security
- `src/test/java/...` Backend tests
    - `foldername` ${foldername} tests for services and corresponding code that relate to ${foldername}
- `frontend/...` FRONTEND
    - `/`                 — index.html and vite config and package.json
    - `src/`              — general files that not have any relation to distinct views like the index.ts, lit-router.ts, redux store and so on.
    - `src/shared-slices/` — Redux slices that belong to no single view (auth, meta, ...)
    - `web/views/`        — Place for views, f.e. the login page has its own folder, or the home folder includes the main page where the exercises get shown.

## Conventions
- Do NOT use Lombok (it was removed). Write constructors, getters/setters, `equals`/`hashCode` and loggers (`LoggerFactory.getLogger`) in plain Java; prefer records where possible
- Follow existing package and naming patterns
- All endpoints authenticated except `/api/public/**`
- REST style: resources in the path, HTTP verbs for actions (`GET/POST /api/exercises`, `PUT/DELETE /api/exercises/{id}`); unauthenticated API calls get 401
- Frontend: every backend call goes through `src/api/http.ts` (`apiGet/apiPost/apiPut/apiDelete`, `apiThunk`) inside a Redux slice — never `fetch` directly
- Use Records for DTOs, including request bodies — no raw `String` or `Map` request bodies
- Get the current user with `@AuthenticationPrincipal UserDetails user`, never by casting `authentication.getPrincipal()`
- Put logic in a service, not in a controller; use Spring's `@Transactional` (`readOnly = true` for reads)
- Avoid N+1 queries: use fetch-join / batch (`...In(...)`) repository methods; `QueryCountTest` guards the main read paths
- Reusable components/helpers are listed in `frontend/src/components/README.md`: check it BEFORE creating a component, dialog, helper or style, reuse what exists, and add every new reusable piece there in the same commit. Generic UI goes to `frontend/src/components/`, pure helpers to `frontend/src/utils/` (with vitest tests)
- when creating new view in the frontend where data is used make sure to create a corresponding Redux slice and attach it to the store.ts
- try to write unit tests for new code/features if it is possible
- Views are Lit custom elements in `frontend/src/views/<name>/<name>-view.ts`
- Styles use Lit's `css` tagged template literal (Shadow DOM scoped) or create a `styles.css` file for shared styles
- Shoelace components (`sl-button`, `sl-input`, `sl-dialog`, etc.) are used throughout the UI
- State management via Redux slices in each view's `slice/` subfolder
- Always execute api calls etc. in the redux slice, dont diretly fetch data from the backend
- Navigation via `navigate(path)` from `frontend/src/utils/navigation.ts` (updates the URL + routers). Do NOT use the router's `goto()` for navigation: it does not update the URL (breaks the back button and deep links)
- Dont use the updated method in Lit elements if not completely necessary.
- Custom events: kebab-case names exported as constants next to the element (e.g. `ExerciseCardEvents`), `CustomEvent<T>` with a typed `detail`; listeners type the event (`(e: CustomEvent<ExerciseDto>) => ...`, Shoelace targets via `e.target as SlSelect`) — no `any`

## Git
- Always run: `git add -A && git commit -m "fix: description (#ISSUE_NUMBER)"`
- Commit before finishing — do not leave changes uncommitted
- Do not make a pr, there is a workflow for that



## Do Not Touch
nothing distinct for now

## Learned

- Every view uses the shared layout from `frontend/src/styles/page.ts` (`static styles = [pageStyles, css`...`]` + `<div class="page-container">`): centered column of `--app-page-max-width` (800px), mobile breakpoint `@media (max-width: 768px)`
- Inline styles (`style="color: red"`) should be moved to CSS classes for consistency
- Colors, spacing, radius, shadows and fonts come from the design tokens in `frontend/src/styles/theme.css` (`var(--app-...)`) — no hard-coded hex colors, so dark mode keeps working
- Sub pages use `<page-header heading="...">` (Back button + title + `actions` slot) instead of their own `.header` markup/CSS
- `exercise-card.ts` shows time left until next reset using `timeLeftSeconds` from the backend DTO (calculated server-side), formatted by `formatTimeLeft()` in `src/utils/format.ts` ("2 Days and 3 Hours left", "5 Hours left", "30 Minutes left", rounded up). Urgent (< 6h, `isUrgent()`) is highlighted in orange.
- `utcOffset` in Exercise is in hours (not minutes). The backend calculates `startTimeUtc = startTime.minusHours(utcOffset)` to convert the user's local reset time to UTC.
- `timeLeftSeconds` in `ExerciseDto` is computed via `SchedulerService.getTimeLeftSeconds()` which calls `ScheduledFuture.getDelay()` — this correctly reflects the actual next-reset time for multi-day exercises (`daysRepeat > 1`). Do NOT recalculate it in `ExerciseService`/controllers using date arithmetic; the scheduler is the authoritative source.
- `daysRepeat` controls how often the scheduler fires (every N days), not how many days the exercise runs per cycle. `startTime` is the daily clock time of the reset, but the reset only happens every `daysRepeat` days.
- `exerciseValue` for time exercises (TIMEREPEAT, TIMEINCREASE) is stored as seconds (integer string). Format with `formatDuration(secs)` from `src/utils/format.ts` → `M:SS` or `H:MM:SS`; use `isTimeExercise()`/`isRepExercise()` from `src/utils/exercise.ts` to branch on the type.
- `ExerciseLog` entity (composite key: exerciseId + username) stores one "current period" progress per user per exercise. `value` is seconds-completed for time exercises, or reps-completed for rep exercises. Endpoints: `GET /api/log/{exerciseId}` and `PUT /api/log/{exerciseId}` (body `{value}`).
- Timer lives in `views/home/elements/exercise-timer.ts` (`setInterval` as class field, Web Audio finish sound, cleared in `disconnectedCallback`; a running timer reports its progress when removed). It emits `progress-changed` (seconds done); `exercise-card` saves it via `saveExerciseLog`. Without a saved log it starts at the full duration.
- Rep counter lives in `views/home/elements/rep-counter.ts` and emits `progress-changed` 500ms after the last change (debounced) – `exercise-card` saves it.
- `Exercise.lastSchedulerRun` (UTC `LocalDateTime`, nullable) records when the scheduler last fired. On startup, `SchedulerService.calculateNextRunInstant()` uses it to compute the remaining delay: `lastSchedulerRun + daysRepeat days` at the configured reset time. If that time is past, the task is scheduled immediately. New exercises (null) fall back to the original `generateStartTime` logic.
- `exercise-card.ts` layout uses a flex column with three sections: `.card-header` (title + icon-button actions), `.card-body` (2-column grid of label/value pairs), and `.card-footer` (Statistics button + Finished checkbox). The timer / rep counter sit in the body grid as `<exercise-timer>` / `<rep-counter>`. Icon button colors go via CSS classes (`.hide-icon`, `.trash-icon`) — do NOT use inline `style=` attributes on them.
