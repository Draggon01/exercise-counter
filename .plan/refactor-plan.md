# Refactor Plan

Goal: make the backend clearer (service layer, less duplication, correct transactions)
and make the frontend look better (shared design tokens, consistent layout, smaller components).

How to use this file:
- Work top to bottom. Each task is small enough for one commit.
- Tick `[x]` when done. Commit message format: `fix: <description> (#ISSUE_NUMBER)` / `refactor: ...`
- Run `mvn clean verify` (backend) or `npm run build` (frontend) before ticking a task.
- **Never edit existing Flyway migrations** – add a new `V<date>_<nr>__*.sql` instead.

Legend: 🔴 bug/security · 🟠 structure · 🟢 visual · ⚠️ breaking API change (backend + frontend together)

---

## Phase 0 – Bugs & security (do first)

### [x] T0.1 🔴 Remove hardcoded in-memory user
- File: `web/security/SecurityConfig.java`
- Steps:
  1. Delete the `inMemoryUserDetailsService()` bean and the `.userDetailsService(inMemoryUserDetailsService())` line.
  2. If a dev user is needed, create it in a `@Profile("dev")` config instead.
- Done: `DevSecurityConfig` (`@Profile("dev")`) provides `user` / `password`; `SecurityConfig` registers it only when present.
- Done when: login with `user` / `password` fails; normal users still log in.

### [x] T0.2 🔴 Cancel scheduler when an exercise is deleted
- Files: `web/scheduler/SchedulerService.java`, `web/rest/exercise/ExerciseController.java`
- Steps:
  1. Make `removeScheduledExerciseUpdate` public (rename to `cancelSchedulerFor(UUID)`), and also `remove` the key from the map.
  2. Call it in `deleteExercise` after `deleteById`.
- Done when: deleting an exercise removes its entry from `scheduledExerciseUpdates`; test added.

### [x] T0.3 🔴 Make scheduler map thread-safe
- File: `SchedulerService.java`
- Steps: `Map<UUID, ScheduledFuture<?>> scheduledExerciseUpdates = new ConcurrentHashMap<>();` and make it `private final`.

### [x] T0.4 🔴 Make the reset job really transactional + avoid stale entity
- Files: `SchedulerService.java`, new `web/scheduler/ExerciseResetJob.java`
- Problem: `@Transactional` on `numberRepeatFunction` / `numberIncreaseFunction` is ignored (self-invocation via lambda, no proxy). The lambda also captures an `Exercise` entity that may be outdated.
- Steps:
  1. Create `@Service ExerciseResetJob` with `@Transactional public void run(UUID exerciseId)`.
  2. Inside: reload the exercise (`findById`, return if absent), increase value if type is `*INCREASE`, set `lastSchedulerRun`, collect + delete checks and logs, write `Period` + `FinishedUser`.
  3. `SchedulerService` schedules `() -> exerciseResetJob.run(id)` only.
  4. Merge the two functions into one (the only difference is the increase step).
- Done when: `SchedulerStartTimeIT` passes, plus a new test that runs `ExerciseResetJob.run` and checks checks/logs are cleared and a period is created.

### [x] T0.5 🔴 Fix the Period time range
- File: `ExerciseResetJob` (from T0.4)
- Problem: `Range.closed(now, now)` with `systemDefault() + offset` – zero-width and not UTC.
- Steps: store `(previous run, now]` instead of a point.
- Decision (done): ranges stay in **exercise-local time** (UTC + utcOffset), because all existing rows use
  that convention and the `period` table has an `EXCLUDE` constraint on overlapping ranges – mixing UTC
  ranges with old local points would break the reset job. The start is clamped to the end of the latest
  stored period so ranges never overlap. `toKeyString()` shows the reset day (`end:end`), so the
  statistics UI is unchanged.

### [x] T0.6 🔴 Restrict group endpoints to the current user
- File: `web/rest/groups/GroupsController.java`
- Steps:
  1. `GET /user/list` → return only the mapping of the logged-in user (frontend uses `selectUserMappingByUser` anyway; adjust `groupSlice` if needed).
  2. `GET /exercises/list` → only mappings for groups the user is a member of.
  3. `POST /user/invite` → check the inviter is a (non-invited) member of the group, otherwise 403.
- Done when: `@WebMvcTest`/IT shows a user cannot invite into a foreign group.

### [x] T0.7 🔴 Set `creator` server-side
- File: `ExerciseController.addExercise`
- Steps: ignore `exercise.creator()`; for new exercises use the authenticated username, for existing ones keep the stored creator.

### [x] T0.8 🔴 Flyway only – no Hibernate DDL
- File: `src/main/resources/application.properties`
- Steps: `spring.jpa.hibernate.ddl-auto=validate`. Start the app; if validation fails, add a new migration for the missing column/table.
- Done: validation found that `V20260328_001` created `groups.group_visibility` while the entity mapped
  `visibility` (Hibernate had silently added that column in prod). Entity now maps `group_visibility`;
  `V20261110_001` copies existing values from `visibility` and drops it (no-op on fresh DBs).

### [x] T0.9 🔴 Delete `TestController` and test-only scheduler code
- Files: `web/rest/test/TestController.java`, `SchedulerService.restartSchedulerForExTest`

### [x] T0.10 🔴 Fix invite-link generation
- File: `web/rest/user/UserController.getInviteLink`
- Steps:
  1. Fix the reuse logic (`> 10` → decide: reuse newest open link or cap at N).
  2. Build the URL with the protocol sent by the frontend (send `window.location.origin` instead of host) or from a config property `app.base-url`.

### [x] T0.11 🔴 Login shows error only on failure
- File: `frontend/src/views/login/login-view.ts`
- Steps: check `saveUserInfo.fulfilled.match(result)`; navigate on success, set `errorMessage` only on failure.

---

## Phase 1 – Clearer backend

### [x] T1.1 🟠 Remove Lombok completely
- Decision: Lombok is not used anymore (see CLAUDE.md).
- Done: all Lombok annotations replaced by plain Java (constructors, accessors, `equals`/`hashCode` via
  `Objects`, SLF4J loggers); dependency, annotation processor and plugin excludes removed from `pom.xml`.

### [x] T1.2 🟠 Use `@AuthenticationPrincipal`
- Replace `((UserDetails) authentication.getPrincipal()).getUsername()` (~20×) with a parameter `@AuthenticationPrincipal UserDetails user`.

### [x] T1.3 🟠 Use Spring's `@Transactional`
- Replace `jakarta.transaction.Transactional` with `org.springframework.transaction.annotation.Transactional`. Add `readOnly = true` on read endpoints/services.

### [x] T1.4 🟠 Introduce `ExerciseMapper`
- New: `web/rest/exercise/ExerciseMapper.java` (`@Component`)
- Steps: one `toDto(Exercise, List<String> groups, long timeLeft, Integer position)` and `toEntity(ExerciseDto, String creator)`. Replace the 4 copies of `new ExerciseDto(...)` in `ExerciseController`.

### [x] T1.5 🟠 Global error handling
- New: `web/rest/GlobalExceptionHandler.java` (`@RestControllerAdvice`)
- Steps:
  1. Add small exceptions: `NotFoundException`, `ForbiddenException` (or use `ResponseStatusException`).
  2. Map them + `NoSuchElementException` (from `orElseThrow()`) to 404/403 with a JSON body `{ "error": "..." }`.
  3. Replace `throw new RuntimeException(...)` in `checkExerciseAuthority` with `ForbiddenException`.

### [x] T1.6 🟠 Service layer – exercises
- New: `web/service/ExerciseService.java`
- Move from `ExerciseController`: list all / selected / available (visibility filter), save (incl. group mappings + selection + scheduler restart), delete, authority check.
- Controller only delegates. Add unit tests for the visibility filter (PUBLIC / PRIVATE / GROUPS).

### [x] T1.7 🟠 Service layer – checks & streaks
- New: `web/service/CheckService.java` + `CheckController` (move `/check/**` out of `ExerciseController`).
- Unit test for streak calculation.

### [x] T1.8 🟠 Service layer – selection
- New: `web/service/SelectionService.java`
- Remove the `ExerciseController` dependency from `UserSelectionController` (use `ExerciseService` instead).

### [x] T1.9 🟠 Service layer – groups, statistics, invites
- New: `GroupService`, `StatisticService`, `InviteService` (from `UserController`). Controllers become thin.

### [x] T1.10 🟠 Typed request DTOs (records)
- Replace raw `String` / `Map` bodies:
  - `/selection/select|unselect` → `ExerciseIdRequest(UUID exerciseId)`
  - `/log/save` → `ExerciseLogRequest(UUID exerciseId, long value)`
  - `/groups/user/join|delete|accept` → `GroupNameRequest(String groupName)`
  - `/groups/user/invite` → `InviteRequest(String username, String groupName)`
  - `/log/{id}` response → `ExerciseLogDto(Long value)`
- ⚠️ Update matching thunks in the frontend slices in the same commit.

### [x] T1.11 🟠 Remove N+1 queries
- `CheckService.getStreak`: one repository query that returns the user's finished periods for an exercise ordered by date desc (JPQL join `Period`/`FinishedUser`), compute streak in memory.
- `ExerciseService.available`: load all `ExerciseGroupMapping`s for the user's groups once, not per exercise.
- `StatisticService.loadStatistic`: one query for all finished users of an exercise, group in memory.

### [x] T1.12 🟠 Rename `Visibiltiy` → `Visibility`
- Java enum rename only (DB stores the enum value, not the class name).

### [x] T1.13 🟠 Remove legacy JSON statistic model
- Prerequisite: `V20260306_001__migrateStatistics` has run on all environments.
- Delete `Statistic`, `StatisticJpa`, `StatisticId`, `StatisticIdKeyDeserializer`, `StatisticRepository`, `TestSerializeStatistic`.
- Decide what happens to the data migration class (keep it if `DataMigrationRunner` needs history, otherwise remove).
- New migration: `DROP TABLE statistic_exercise_data;`
- Done: `V20261110_002` drops the table only if `V20260306_001__migrateStatistics` is recorded in
  `data_migration_history` or the table is empty – otherwise it is kept untouched. The data migration
  framework (`DataMigration`, runner, history) stays for future data migrations.

### [x] T1.14 🟠 CORS origins from config
- Move the list in `SecurityConfig.corsConfigurationSource` to `app.cors.allowed-origins` in `application.properties`.

### [x] T1.15 ⚠️ RESTful endpoints (optional)
- Deferred: do this right after **T2.1** (API client), so the frontend only changes in `src/api/` + slices once.
- `POST /api/exercises` (create), `PUT /api/exercises/{id}`, `DELETE /api/exercises/{id}`, `DELETE /api/checks/{exerciseId}` …
- Do together with T2.1 so only `src/api/` + slices change in the frontend.

---

## Phase 2 – Frontend structure

### [x] T2.1 🟠 Central API client
- New: `frontend/src/api/http.ts` with `apiGet<T>`, `apiPost<T>`, `apiPut<T>`, `apiDelete<T>`
  (always `credentials: "include"`, JSON headers, throws/returns typed error, handles empty bodies).
- Refactor all slices to use it (`exerciseSlice`, `checkSlice`, `groupSlice`, `userSlice`, `optionsSlice`, `registerSlice`, `statisticSlice`, `authSlice`).

### [x] T2.2 🟠 Remove direct fetches from components
- `home-view.connectedCallback`: `/api/exercises/exercisetype` + `/visibility` → new slice `src/othrSlices/meta/metaSlice.ts` (register in `store.ts`).
- `lit-router.ts` `/register/:id` enter: `isInviteLinkValid` → thunk in `registerSlice`.

Reusable pieces are tracked in `frontend/src/components/README.md` – update it with every task below.

### [x] T2.9 🟠 Frontend unit tests (vitest) – do first
- `npm i -D vitest`, script `"test": "vitest run"`; tests next to the code (`*.test.ts`).
- First tests: `src/api/http.ts` (body parsing, error messages).

### [x] T2.3 🟠 Extract `confirm-dialog` (reused 3×)
- New: `frontend/src/components/confirm-dialog.ts` (props: `open`, `label`, `confirmLabel`, `cancelLabel`, `variant`; slot: message; events `confirm` / `cancel`).
- Replace: home delete-exercise dialog, home hide-exercise dialog, groups leave/delete-group dialog.

### [x] T2.8 🟠 Extract `page-header` (reused 4×)
- New: `frontend/src/components/page-header.ts` (Back button + `heading`, `backTo`, slot `actions`).
- Replace the Back-button headers in browse, groups, statistics, options.

### [x] T2.4 🟠 Extract `exercise-form-dialog`
- New: `frontend/src/views/home/elements/exercise-form-dialog.ts`
- Moves: `renderEditExercise`, `renderOptionsForType`, `renderOptionsForVisibility`, `handleEditExercise`, `currentType`, `currentVisibility`.
- New helper `src/utils/form.ts` `validateForm(form)` – also used by the groups create dialog (same loop today).
- `home-view` keeps only: action bar, list, event wiring. Target < 200 lines.

### [x] T2.5 🟠 Split `exercise-card` + shared helpers
- New: `exercise-timer.ts` (interval, Web Audio, save log) and `rep-counter.ts` (debounced save).
- New helpers with tests: `src/utils/format.ts` (`formatDuration`, `formatTimeLeft`), `src/utils/exercise.ts` (`isTimeExercise`, `isRepExercise`, `isIncreaseExercise`) – also used by the exercise form.
- Fix: `_getTimeLeft()` shows negative minutes when less than an hour is left ("-30 Minutes left").
- Card keeps header/body/footer layout only. Keep `disconnectedCallback` cleanup in the timer.

### [x] T2.6 🟠 Typed custom events
- Replace `(e: any)` with `CustomEvent<ExerciseDto>` etc. Define event names as constants.

### [x] T2.7 🟠 Small cleanups
- Rename `src/othrSlices/` → `src/shared-slices/` (update imports + CLAUDE.md).
- `main.ts`: remove duplicate `import '@shoelace-style/shoelace'`, register only needed components or keep autoloader – pick one.
- Fix: clearing the group search dispatches `{type: 'group/clearSearch'}` – the action is `clearPublicGroupSearch`, so old results stay.

---

## Phase 3 – Better looking frontend

### [x] T3.1 🟢 Design tokens + theme file
- New: `frontend/src/styles/theme.css` (imported in `main.ts`):
  ```css
  :root {
    --app-bg: var(--sl-color-neutral-50);
    --app-surface: var(--sl-color-neutral-0);
    --app-border: var(--sl-color-neutral-200);
    --app-text: var(--sl-color-neutral-900);
    --app-text-muted: var(--sl-color-neutral-600);
    --app-accent: var(--sl-color-primary-600);
    --app-success: var(--sl-color-success-600);
    --app-danger: var(--sl-color-danger-600);
    --app-warning: var(--sl-color-warning-600);
    --app-radius: 12px;
    --app-space-1: 4px; --app-space-2: 8px; --app-space-3: 16px; --app-space-4: 24px;
    --app-shadow: var(--sl-shadow-small);
  }
  ```
- Replace all hardcoded colors (`#c8e0e0`, `#666`, `teal`, `red`, `green`, `#aaa`, …) in views with tokens.
- Move remaining inline `style="..."` to classes (overlay, groups, statistics, browse-card, exercise-card).

### [ ] T3.2 🟢 Dark mode
- Import `@shoelace-style/shoelace/dist/themes/dark.css`, toggle `sl-theme-dark` class on `<html>` from `prefers-color-scheme` (optional switch in options view → `optionsSlice`).
- Works automatically if T3.1 used only tokens.

### [ ] T3.3 🟢 Shared page layout
- New shared style `src/styles/page.ts` (Lit `css`) with `.page-container { max-width: 800px; margin: 0 auto; padding: var(--app-space-3); }` and the 768px breakpoint.
- Use in home, browse, groups, statistics, options.
- `exercise-card`: remove `width: 50%; min-width: 340px` → `width: 100%` inside the container.

### [ ] T3.4 🟢 New app shell (`overlay-view`)
- CSS grid: `header / main / bottom-nav`, `height: 100dvh`; remove `position:absolute` and `calc(100vh - 48px)`.
- Header: 56px, title left, user dropdown right (fix the clipped `height: 1rem` header).
- Mobile (< 768px): bottom navigation with icons Home / Browse / Groups / Options; desktop: links in header.
- Highlight the active route.

### [ ] T3.5 🟢 Exercise card redesign
- Done state: colored left border (`--app-success`) + muted body when checked.
- Streak badge (`🔥 n`) in the header (data already in `CheckDto.streak`).
- `sl-progress-bar` for reps/time vs target.
- Edit-order mode: compact drag handle (or keep ↑/↓ but as small icon buttons).

### [ ] T3.6 🟢 Exercise form UX
- Refresh time: `<sl-input type="time" step="1">` instead of regex (current regex rejects 14:00–19:59!).
- Exercise type as radio cards with short description; show value/increase only when relevant.
- Visibility as `sl-radio-group`, groups as multi `sl-select`.

### [ ] T3.7 🟢 Loading, empty and error states
- `sl-skeleton` cards while `status === "loading"`.
- Empty state on home: "No exercises yet" + Browse / Add buttons.
- Toast helper `src/components/toast.ts` (`sl-alert` + `toast()`), triggered from a listener middleware on any `*/rejected` action.

### [ ] T3.8 🟢 Login / register polish
- Shared `auth-card` component (logo, title, slot for form).
- Inline error via `sl-alert`, submit button with `loading` attribute while the thunk runs.

### [ ] T3.9 🟢 Groups view polish
- Card list with member count / visibility badge, invite as `sl-dialog` instead of inline inputs, pending invites section on top.

### [ ] T3.10 🟢 Statistics view
- Calendar heatmap (or bar chart via existing `chart.js`) per user instead of the period key list.
- Summary row: current streak, best streak, completion rate.

---

## Phase 4 – Features

### [ ] T4.1 ✨ Show the newest changelog after login
Goal: when a user logs in and there is a changelog entry they have not seen yet, show it once in a dialog.

- Open question (decide before starting): should brand-new users see the current changelog on their
  first login, or start with everything marked as seen? Default below: new users see nothing old.

**Backend**
1. Changelog source: `src/main/resources/changelog.json` – list of entries, newest first:
   ```json
   [{ "version": "2026.11.1", "date": "2026-11-10", "title": "…", "items": ["…", "…"] }]
   ```
   Load it once at startup in a `ChangelogService` (records `ChangelogEntry(String version, LocalDate date, String title, List<String> items)`).
2. New migration `V<date>_001__add_last_seen_changelog.sql`:
   `ALTER TABLE options ADD COLUMN last_seen_changelog VARCHAR(32);` + field in `UserOptions`
   (no Lombok – plain getter/setter).
3. On registration (`UserController.register`) store the current newest version as seen (see open question).
4. `ChangelogController` (`/api/changelog`):
   - `GET /unseen` → entries newer than the user's `last_seen_changelog` (empty list if none)
   - `POST /seen` → sets `last_seen_changelog` to the newest version
   - `GET` → full changelog (for an optional "What's new" page later)
5. Tests: unseen entries for null / old / current version; `seen` updates the options row.

**Frontend**
6. `src/shared-slices/changelog/changelogSlice.ts` (register in `store.ts`): thunks `loadUnseenChangelog`, `markChangelogSeen`.
7. Dispatch `loadUnseenChangelog` after a successful login and on app start when already logged in
   (listener on `saveUserInfo.fulfilled` / `readUserInfo.fulfilled` in a listener middleware – no fetch in components).
8. `src/components/changelog-dialog.ts`: `sl-dialog` showing title, date and items of the unseen entries
   (newest first); closing it dispatches `markChangelogSeen`. Render it once in `overlay-view`.
9. Optional: "What's new" entry in the user dropdown that opens the full changelog.

11. Migrate the existing hand-written "What's new" list in `options-view.ts` into `changelog.json`
    and render it from the slice instead (keep the history).

**Process**
10. Add a "Changelog" section to CLAUDE.md: every user-facing change adds an entry to `changelog.json`.

---

## Progress

| Phase | Tasks | Done |
|---|---|---|
| 0 – Bugs & security | 11 | 11 |
| 1 – Backend | 15 | 15 |
| 2 – Frontend structure | 9 | 9 |
| 3 – Visual | 10 | 0 |
| 4 – Features | 1 | 0 |
