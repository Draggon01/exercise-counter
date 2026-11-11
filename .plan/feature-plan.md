# Feature Plan

Goal: keep the app running reliably on the server, and make it more fun to challenge each other
(see what friends do, cheer them on, keep streaks alive on sick days, compare within a group).

How to use this file: same rules as `refactor-plan.md` – top to bottom, one commit per task, tick `[x]`,
`mvn clean verify` + `npm test` / `npm run build` before ticking, never edit existing Flyway migrations,
every user-facing change extends the newest `changelog.json` entry.

Legend: 🛠 operations · 👥 social · 🔥 streaks · 🧹 small · **S/M/L** = effort (S ≈ 1–2 h, M ≈ half a day, L ≈ a day)

Already done (not part of this plan): DST-safe reset times (`time_zone`), change password + admin reset links.

---

## Phase 6 – Operations (do first: protects the data and keeps the site up)

### [ ] T6.1 🛠 Run the backend as a systemd service (S)
Today `sciptex` starts the jar with `nohup` – after a reboot or crash the site stays down until the next deploy,
and `backend.log` is overwritten on every deploy.
- New file `development/deploy/exercise-counter.service` (template, no secrets):
  `ExecStart=<java> -jar /opt/exercise-counter/exercise-counter.jar`, `EnvironmentFile=/opt/exercise-counter/build/excountvars.env`,
  `User=` a non-root user, `Restart=on-failure`, `RestartSec=5`, `SuccessExitStatus=143` (Spring's clean shutdown).
- Copy the jar to a fixed name (`exercise-counter.jar`) so the unit never changes.
- `sciptex`: replace the PID-file block with `sudo systemctl restart exercise-counter` and wait for
  `curl -fs localhost:8090/api/public/userinfo` (max 60 s) – fail the deploy otherwise.
- Logs: `journalctl -u exercise-counter` (kept across deploys, rotated by journald).
- Done when: `sudo reboot` → site is back without running the script; `kill -9 <pid>` → restarted within seconds.

### [ ] T6.2 🛠 Nightly database backup (S)
- New file `development/deploy/backup-db.sh`: `pg_dump -Fc` from the container into `/opt/exercise-counter/backups/db_<date>.dump`,
  delete dumps older than 14 days. Cron: `30 3 * * *`.
- Optional: copy the newest dump off the server (another machine / storage box) – a backup on the same disk does not survive a disk failure.
- `sciptex` keeps its own backup right before each deploy (migrations).
- Document the restore in `development/deploy/README.md` (`pg_restore --clean --if-exists -d db`) and try it once
  against a throwaway container.
- Done when: a restore of last night's dump into a test container shows today's data.

### [ ] T6.3 🛠 Health check endpoint (S)
- `spring-boot-starter-actuator` with only `health` exposed (`/actuator/health`, no details for anonymous users);
  permit it in `SecurityConfig`. The deploy script and an optional uptime monitor (e.g. UptimeRobot) use it.
- Done when: `curl /actuator/health` → `{"status":"UP"}`, other actuator endpoints → 404.

---

## Phase 7 – Challenge friends

### [ ] T7.1 👥 Remember when an exercise was finished (S) – prerequisite for T7.2–T7.5
`checks` only stores *who* finished, not *when*; `finished_user` neither.
- Migration: `ALTER TABLE checks ADD COLUMN checked_at TIMESTAMP` (UTC, null for old rows),
  `ALTER TABLE finished_user ADD COLUMN finished_at TIMESTAMP`.
- `CheckRepository.insertIfAbsent` sets `checked_at = now()` (keep `ON CONFLICT DO NOTHING` – the first tap counts).
- `ExerciseResetJob` copies `checked_at` into `finished_user.finished_at`; "missed entry" (`StatisticService.addMissedEntry`) leaves it null.
- Tests: `CheckServiceTest` (time stored, second check keeps the first time), `ExerciseResetJobTest` (copied).

### [ ] T7.2 👥 Activity: what your friends did (M)
Who sees what: the same people who already see each other in "Finished by" – everyone who has the
exercise on their home page (`UserSelectionRepository.findUsernamesByExerciseId`).
- Backend `ActivityService` + `GET /api/activity?days=7` → `[{username, exerciseId, exerciseTitle, finishedAt, streak}]`,
  newest first, from `checks` (current period) + `finished_user` (closed periods), only exercises on the caller's
  home list, own entries included. One query each (fetch join) – add the endpoint to `QueryCountTest`.
- Frontend: bell icon in the home `page-header` → page `/activity` (`views/activity/`, `activitySlice`),
  grouped by day ("Today", "Yesterday", "Mon 9.11"): "anna finished Push-ups · 🔥 12 · 18:42".
  Unread dot on the bell: newest `finishedAt` > `last_seen_activity` (new column in `options`, set when the page opens).
- Pull to refresh (`onAppRefresh`), empty state ("Nothing yet – your friends' finished exercises show up here").
- Tests: service (visibility: no activity of exercises I don't have), utils for day grouping (vitest).

### [ ] T7.3 👥 Cheers 👏 (M)
- Table `cheer(exercise_id, to_user, from_user, created_at)`, PK `(exercise_id, to_user, from_user)`, FKs with
  `ON DELETE CASCADE`; cleared by `ExerciseResetJob` like checks (one cheer per person and period).
- `PUT /api/checks/{exerciseId}/{username}/cheers` (idempotent like checks), `DELETE` to take it back;
  only allowed if both have the exercise on their home list and `username` finished it (403/409 otherwise).
- `CheckDto` gets `cheers: number` and `cheeredByMe: boolean` (filled in `listPerSelectedExercise` with one extra query).
- Card: tap a "Finished by" chip → 👏 toggle (optimistic, reuse `LatestValueSync`); chip shows `anna 🔥3 👏2`.
  Also on the activity page.
- Tests: service rules, reset clears cheers, `LatestValueSync` reuse needs no new helper.

### [ ] T7.4 👥 Push: "Anna just finished – your turn!" (M)
- Opt-in per user in Options → Reminders: "When friends finish" (switch, `options.notify_friends`, default off).
- After a successful check (`CheckService.check`), send asynchronously (`@Async` / task executor, never block the
  request) to everyone with the exercise on their home list who opted in, has a device, has **not** finished yet,
  and was not notified about this exercise in this period (reuse `push_reminder`-style table `push_friend_notice`).
- One notification per exercise and period at most ("anna and 2 others finished Push-ups" if several finish before it is sent).
- Quiet hours: nothing between 22:00 and 07:00 in the receiver's time zone → needs `options.time_zone`
  (sent by the browser when push is turned on).
- Tests: who is notified (not the finisher, not people who are done, only once), quiet hours (pure function + Clock).

### [ ] T7.5 👥 Weekly recap (S)
- Sunday 18:00 in the user's time zone (`options.time_zone`, see T7.4), only for users with a push device.
- Text: "This week: 6 of 7 done 💪 · best streak: Push-ups 🔥 14" (+ "top of your group" when T7.7 exists).
- `RecapService` + scheduler run every 15 min that picks users whose local time just passed Sunday 18:00 and
  who have no recap for this week (`options.last_recap`).
- Numbers from `finished_user`/`period` of the last 7 days (reuse the statistics calculation, no new SQL per exercise).
- Tests: week boundaries in different zones, no duplicate recap.

---

## Phase 8 – Streaks & groups

### [ ] T8.1 🔥 Rest day (streak freeze) (M)
A long streak breaking on the first sick day makes people quit.
- "Take a rest day" in the card's ⋯ menu for the **current** period (only while not done).
- Table `rest_day(exercise_id, username, period_start)`; at reset, `ExerciseResetJob` turns it into a
  `finished_user` row with `rest = true` (new column) – keeps one place for history.
- Rules: max **1 rest day per 7 periods** per exercise and person (rolling window), not for the current period
  after it was marked done; streaks skip rest periods (neither +1 nor break); completion % counts them as not done.
- Statistics grid: own mark (light striped square, legend "Rest day"); `summarize()` / `StreakCalculator` updated
  together (backend and frontend calculate streaks – keep both in sync, tests on both sides).
- Open: allowance per exercise or per person in total? (plan: per exercise)

### [ ] T8.2 👥 Group leaderboard (M)
- Group detail page `/groups/:name` (tap a group card): members, shared exercises, ranking.
- `GET /api/groups/{name}/leaderboard?periods=30` (members only, 403 otherwise): per member done / possible over the
  last N periods of every exercise shared with the group (`ExerciseGroupMapping`), current streak, sorted by %.
- Possible periods only count from the day a member joined the exercise (avoid punishing newcomers) –
  needs `show_exercise_for_user.selected_at` (new column, null → count all).
- UI: ranked list with meter bars (reuse statistics `meter` styles), 🥇🥈🥉 for the top 3, "you" highlighted;
  range buttons 7 / 30 / all like the statistics page.
- Tests: ranking, newcomers, non-members get 403, `QueryCountTest` entry.

---

## Phase 9 – Smaller things

### [ ] T9.1 🧹 Next reset as clock time (S)
- `ExerciseDto.nextResetAt` (ISO instant = now + `getTimeLeftSeconds`), card subtitle:
  "resets today 20:00" / "resets Thu 20:00" in the viewer's local time, keep "3 hours left" when urgent.
- Pure formatter in `utils/format.ts` + tests.

### [ ] T9.2 🧹 Export my data (S)
- Options → Account → "Download my data": `GET /api/account/export` → JSON (profile, own exercises, groups,
  finished periods, options – no password hash, no push keys). Frontend saves it as `exercise-counter-<user>.json`.

### [ ] T9.3 🧹 Delete account (M)
- Options → Account → "Delete account" (confirm with password, `confirm-dialog` variant danger).
- Open question before building: what happens to exercises the user created that others still use?
  Proposal: they stay and belong to nobody (creator column nullable, "former member" shown, nobody can edit them),
  private ones are deleted. Group memberships, checks, logs, push devices, reset links: deleted (mostly cascades).
- Tests: cascade, others' statistics unchanged.

---

## Order and dependencies

1. **T6.1 → T6.2 → T6.3** (independent of the app code, highest value per hour)
2. **T7.1** (small, needed by everything social) → **T7.2** → **T7.3** → **T7.4** → **T7.5**
3. **T8.2** (uses the statistics calculation) and **T8.1** (touches streaks in backend + frontend) in either order
4. Phase 9 whenever there is time; T9.3 only after the open question is decided

## Progress

| Phase | Tasks | Done |
|---|---|---|
| 6 – Operations | 3 | 0 |
| 7 – Challenge friends | 5 | 0 |
| 8 – Streaks & groups | 2 | 0 |
| 9 – Smaller things | 3 | 0 |
