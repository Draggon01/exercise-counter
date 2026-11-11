# Reusable building blocks

**Rule:** before you build a component, dialog, helper or style, look here first.
If something similar exists, use it (or extend it). If you add something reusable, add it to
this list **in the same commit**. Status: ✅ available · 🛠 planned (task in `.plan/refactor-plan.md`).

## Shared components — `src/components/`

Generic UI that is not tied to one feature. Import once (side-effect import) where it is used.

| Tag | File | Use it for | API | Used in | Status |
|---|---|---|---|---|---|
| `<confirm-dialog>` | `confirm-dialog.ts` | Asking before a destructive or irreversible action (delete, hide, leave) | props: `open`, `label`, `confirmLabel`, `cancelLabel`, `variant` (`danger` \| `warning` \| `primary`); default slot: message; events: `confirm`, `cancel` | home (delete / hide exercise), groups (leave group) | ✅ |
| `<page-header>` | `page-header.ts` | Title of every page (each view needs one): optional Back, actions on the right; sticky. **On phones it is the app's top bar** (full width, back arrow as icon – the app shell shows no header there), so use icon buttons (`sl-icon-button`) or small buttons as actions | props: `heading`, `backTo` (no Back button if empty); slot `actions` | home (edit order icon), browse, groups, statistics, options, exercise edit | ✅ |
| `<overlay-view>` | `views/overlay/overlay-view.ts` | App shell around every logged-in page: header (brand, nav, user menu), bottom nav on mobile, active section highlighted | add main sections to `NAV_ITEMS`; page goes into slot `main` | lit-router | ✅ |
| `<empty-state>` | `empty-state.ts` | "Nothing here yet" / "could not load" with icon and optional actions | props: `icon`, `heading`, `text`; default slot: actions (buttons) | home, browse, groups, statistics | ✅ |
| `toast(message, variant?, duration?)` | `toast.ts` | Short feedback (`sl-alert` toast stack, same message not stacked twice). **API errors are toasted automatically** by `errorToastMiddleware` – do not add own error UI for failed requests | – | browse (added), groups (created, joined, invited), options (copied), all failed requests | ✅ |
| `<auth-card>` | `auth-card.ts` | Centered branded card for pages outside the app shell | props: `heading`, `subtitle`; default slot: form; slot `footer` | login, register | ✅ |
| `<changelog-dialog>` | `changelog-dialog.ts` | "What's new" dialog with unseen changelog entries | props: `open`, `entries`; event `close` (parent marks them seen) | overlay | ✅ |
| `<fab-button>` | `fab-button.ts` | Main "create" action on phones: round button fixed above the bottom nav (hidden above 768px – keep a normal button for desktop with class `desktop-only`, and add ~80px bottom padding so it does not cover the last item) | props: `icon` (default `plus-lg`), `label` (accessible name); `click` | home (New exercise), groups (New group) | ✅ |
| `<changelog-entries>` | `changelog-entries.ts` | List of changelog entries (version, title, date, items) | prop: `entries` | changelog-dialog, options | ✅ |

## Feature elements — `src/views/<feature>/elements/`

Belong to one feature, listed here so they are not built a second time.

| Tag | File | Purpose | Status |
|---|---|---|---|
| `<exercise-card>` | `views/home/elements/exercise-card.ts` | One exercise on the home page (goal, time left, progress, finishers, done toggle, ⋯ menu). Events (`ExerciseCardEvents`): `move-up`, `move-down`, `hide-exercise`, `delete-exercise`, `edit-exercise` (detail ExerciseDto), `check-changed` (detail boolean) | ✅ |
| `<browse-card>` | `views/home/elements/browse-card.ts` | One exercise in the browse list (title, creator · goal, Add button). Event (`BrowseCardEvents`): `select-exercise` (detail ExerciseDto) | ✅ |
| `<exercise-form>` | `views/home/elements/exercise-form.ts` | Create / edit form: "what do you count" + "increase" → type (`toExerciseType`), time picker, sharing; sticky Cancel / Save bar (props `exercise`, `groups`, `saving`; events `save` (ExerciseDto), `cancel`) | ✅ |
| `<exercise-edit-view>` | `views/exercise-edit/exercise-edit-view.ts` | Page `/exercises/new` and `/exercises/:id/edit` around `<exercise-form>` (loads exercise + groups, saves, toasts) | ✅ |
| `<exercise-timer>` | `views/home/elements/exercise-timer.ts` | Countdown for time exercises with a large focus view while running (minimize / reopen), keeps the screen on (props `targetSeconds`, `completedSeconds`, `label`; event `progress-changed`) | ✅ |
| `<reminder-settings>` | `views/options/elements/reminder-settings.ts` | Options → General: reminders on/off for this device, hours before the reset, test notification; hints for iPhone (install first), blocked permission, unsupported browsers. Hidden when the server has no push keys (`pushSlice`) | ✅ |
| `<account-settings>` | `views/options/elements/account-settings.ts` | Options → General: signed in as / log out, change password (dialog), for admins (`APP_ADMINS`) one-time password reset links (`accountSlice`) | ✅ |
| `<reset-password-view>` | `views/reset-password/reset-password-view.ts` | Public page `/reset-password/:token` of a reset link: new password twice (`resetPasswordSlice`) | ✅ |
| `<rep-counter>` | `views/home/elements/rep-counter.ts` | Reps input for rep exercises (props `target`, `value`; event `progress-changed`, debounced 500ms) | ✅ |

## Helpers

| What | File | Use it for | Status |
|---|---|---|---|
| Shoelace components | `src/shoelace.ts` | Only the imported components are bundled – **add the import there when using a new `<sl-...>` element** (otherwise it renders as an empty tag) | ✅ |
| `apiGet` / `apiPost` / `apiPut` / `apiDelete`, `apiThunk`, `ApiError` | `src/api/http.ts` | **Every** backend call (inside a Redux slice) | ✅ |
| `errorToastMiddleware` | `src/shared-slices/notifications/errorToastMiddleware.ts` | Error toast for every rejected `apiThunk` (except 401 and expected failures in `SILENT_ACTIONS`) | ✅ |
| Loading placeholders | `<sl-skeleton effect="pulse">` with `--border-radius: var(--app-radius)` | While a list loads (home, browse) | ✅ |
| `ConnectedLitElement` | `src/connectedLitElement.ts` | Base class for elements that read the Redux store (`stateChanged`) | ✅ |
| `navigate(path)` | `src/utils/navigation.ts` | **All** navigation (updates URL + routers; safe in components and tests) | ✅ |
| `validateForm(form)` | `src/utils/form.ts` | Show validation messages of all Shoelace fields and return whether the form is valid (exercise form, create group) | ✅ |
| `formatDuration(seconds)` | `src/utils/format.ts` | `M:SS` / `H:MM:SS` for time exercises | ✅ |
| `formatTimeLeft(seconds)`, `isUrgent(seconds)` | `src/utils/format.ts` | "2 Days and 3 Hours left" / "45 Minutes left"; < 6h left | ✅ |
| `closedPeriods`, `participants`, `summarize` (streaks, completion), `addableDays` (own missed days that can still be added, last `MISSED_ENTRY_PERIODS`) | `src/utils/statistics.ts` | Statistics of an exercise from the backend's `finishedInformation` | ✅ |
| `moveItem`, `dropIndex`, `shiftFor` | `src/utils/reorder.ts` | Sorting a list by drag & drop (home edit order: grip handle `data-drag-handle` on the card, pointer events in the view) | ✅ |
| `onAppRefresh(load)` / `requestAppRefresh()`, `pullDistance` | `src/utils/refresh.ts` | Pull to refresh: pages register their loader in `connectedCallback` (call the returned function in `disconnectedCallback`); the app shell shows the indicator until the loaders are done | ✅ |
| `pushSupport(env)`, `currentPushEnvironment()`, `base64UrlToBytes`, `REMINDER_HOURS`, `reminderHoursLabel` | `src/utils/push.ts` | Push reminders: what the browser can do, the server key for `pushManager.subscribe` | ✅ |
| `LatestValueSync` | `src/utils/latest-value-sync.ts` | Saving a toggle per item without flooding the server: shown at once, one request at a time, only the latest wish is sent (home: "Mark as done") | ✅ |
| `placeTooltip(anchor, size, area)` | `src/utils/tooltip.ts` | Position of a custom tooltip: above (below if no room), always inside the visible area (statistics grid) | ✅ |
| `newPasswordProblem(password, repeated)`, `MIN_PASSWORD_LENGTH` | `src/utils/password.ts` | New-password checks (same minimum as the backend): change password, reset page | ✅ |
| `browserTimeZone()`, `exerciseTimeZone(exercise)` | `src/utils/exercise.ts` | Time zone sent with an exercise (existing keeps theirs, new get the browser's) | ✅ |
| `isTimeExercise(type)` / `isRepExercise(type)` / `isIncreaseExercise(type)` | `src/utils/exercise.ts` | Branching on `ExerciseType` (exercise form, exercise card) | ✅ |

## App / PWA

| What | File | Notes | Status |
|---|---|---|---|
| Web app manifest | `public/manifest.webmanifest` | name, colors, icons; linked in `index.html` | ✅ |
| App icons | `public/icons/` | `icon.svg` / `icon-maskable.svg` are the sources; PNGs are rendered from them | ✅ |
| Service worker | `public/sw.js` | production only (registered in `main.ts`); never caches `/api/**`; bump `CACHE_VERSION` when the caching logic changes | ✅ |
| Push notifications | `public/sw.js` (`push`, `notificationclick`), `public/icons/badge.svg` → `badge-96.png` | message JSON `{title, body, url, tag}` from the backend; tap focuses / opens the app at `url` (same origin only) | ✅ |
| Offline start screen | `lit-router.ts` | "Server not reachable" with retry instead of an endless spinner; retries on `online` | ✅ |

## Styles

| What | File | Status |
|---|---|---|
| Design tokens: `--app-bg/surface/border/divider`, `--app-text(-muted/-subtle)`, `--app-accent/success/warning/danger(-soft/-strong)`, `--app-space-1..6`, `--app-radius(-sm/-pill)`, `--app-shadow(-raised)`, `--app-font(-mono)`, `--app-page-max-width`, `--app-bottom-nav-height` | `src/styles/theme.css` | ✅ |
| Light / dark mode (`getColorScheme`, `setColorScheme`, `initColorScheme`; class `sl-theme-dark` on `<html>`) | `src/styles/color-scheme.ts` | ✅ |
| Chart colors `--app-chart-done`, `--app-chart-track`, `--app-chart-empty-border` (validated with the dataviz checks; dark mode has its own step) | `src/styles/theme.css` | ✅ |
| Touch targets `touchStyles` (44px for icon buttons, switches, checkboxes, radio buttons, tab arrows on touch devices); buttons/inputs via touch tokens in `theme.css` | `src/styles/touch.ts` | ✅ |
| Full-screen dialogs on phones `fullscreenDialogStyles` (add to `static styles` of the element that renders the `sl-dialog`; small confirm dialogs stay compact) | `src/styles/dialog.ts` | ✅ |
| Setting rows `settingStyles` (`.setting-row`, `.setting-label`, `.setting-description`, `.setting-control`) | `src/styles/settings.ts` | ✅ |
| Page layout `pageStyles` (`static styles = [pageStyles, css`...`]` + `<div class="page-container">`, 768px breakpoint) | `src/styles/page.ts` | ✅ |
