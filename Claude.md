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
The frontend is bundled with Vite and uses Lit components.
The frontend routing is done with lit/labs router

Spring Boot 4.0.3 
Maven build, Java 21, PostgreSQL database.

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

## Project Structure
- `src/main/java/...` BACKEND
    - `migration/`  — Place for Data migrations that need java code to run
    - `web/`        — General place for the backend code
    - `web/data/`   — Place for Spring Data Repositories and entities
    - `web/rest/`   — Place for REST Controllers
    - `web/scheduler/`  — Place for Schedulers, that update the checks
    - `web/security/`   — Spring security
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

## Git
- Always run: `git add -A && git commit -m "fix: description (#ISSUE_NUMBER)"`
- Commit before finishing — do not leave changes uncommitted

## Do Not Touch
nothing distinct for now

## Learned
*(Claude will append discoveries here over time)*