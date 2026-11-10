# Reusable building blocks

**Rule:** before you build a component, dialog, helper or style, look here first.
If something similar exists, use it (or extend it). If you add something reusable, add it to
this list **in the same commit**. Status: ✅ available · 🛠 planned (task in `.plan/refactor-plan.md`).

## Shared components — `src/components/`

Generic UI that is not tied to one feature. Import once (side-effect import) where it is used.

| Tag | File | Use it for | API | Used in | Status |
|---|---|---|---|---|---|
| `<confirm-dialog>` | `confirm-dialog.ts` | Asking before a destructive or irreversible action (delete, hide, leave) | props: `open`, `label`, `confirmLabel`, `cancelLabel`, `variant` (`danger` \| `warning` \| `primary`); default slot: message; events: `confirm`, `cancel` | home (delete / hide exercise), groups (leave group) | ✅ |
| `<page-header>` | `page-header.ts` | Title of a page, optional Back button (sub pages only), optional actions | props: `heading`, `backTo` (no Back button if empty); slot `actions` | browse, groups, statistics (with Back), options | ✅ |
| `<overlay-view>` | `views/overlay/overlay-view.ts` | App shell around every logged-in page: header (brand, nav, user menu), bottom nav on mobile, active section highlighted | add main sections to `NAV_ITEMS`; page goes into slot `main` | lit-router | ✅ |
| `<empty-state>` | `empty-state.ts` | "Nothing here yet" message with optional call to action | – | home, browse, statistics, group search | 🛠 T3.7 |
| toast (`toast()`) | `toast.ts` | Short feedback / error messages (`sl-alert`) | – | everywhere (via listener on `*/rejected`) | 🛠 T3.7 |
| `<auth-card>` | `auth-card.ts` | Frame for login / register forms | – | login, register | 🛠 T3.8 |
| `<changelog-dialog>` | `changelog-dialog.ts` | Shows unseen changelog entries after login | – | overlay | 🛠 T4.1 |

## Feature elements — `src/views/<feature>/elements/`

Belong to one feature, listed here so they are not built a second time.

| Tag | File | Purpose | Status |
|---|---|---|---|
| `<exercise-card>` | `views/home/elements/exercise-card.ts` | One exercise on the home page (goal, time left, progress, finishers, done toggle, ⋯ menu). Events (`ExerciseCardEvents`): `move-up`, `move-down`, `hide-exercise`, `delete-exercise`, `edit-exercise` (detail ExerciseDto), `check-changed` (detail boolean) | ✅ |
| `<browse-card>` | `views/home/elements/browse-card.ts` | One exercise in the browse list (title, creator · goal, Add button). Event (`BrowseCardEvents`): `select-exercise` (detail ExerciseDto) | ✅ |
| `<exercise-form-dialog>` | `views/home/elements/exercise-form-dialog.ts` | Create / edit an exercise: "what do you count" + "increase" → type (`toExerciseType`), time picker, visibility with explanation (props `open`, `exercise`, `groups`; events `save` (ExerciseDto), `close`) | ✅ |
| `<exercise-timer>` | `views/home/elements/exercise-timer.ts` | Countdown for time exercises (props `targetSeconds`, `completedSeconds`; event `progress-changed`) | ✅ |
| `<rep-counter>` | `views/home/elements/rep-counter.ts` | Reps input for rep exercises (props `target`, `value`; event `progress-changed`, debounced 500ms) | ✅ |

## Helpers

| What | File | Use it for | Status |
|---|---|---|---|
| `apiGet` / `apiPost` / `apiPut` / `apiDelete`, `apiThunk`, `ApiError` | `src/api/http.ts` | **Every** backend call (inside a Redux slice) | ✅ |
| `ConnectedLitElement` | `src/connectedLitElement.ts` | Base class for elements that read the Redux store (`stateChanged`) | ✅ |
| `navigate(path)` | `src/utils/navigation.ts` | **All** navigation (updates URL + routers; safe in components and tests) | ✅ |
| `validateForm(form)` | `src/utils/form.ts` | Show validation messages of all Shoelace fields and return whether the form is valid (exercise form, create group) | ✅ |
| `formatDuration(seconds)` | `src/utils/format.ts` | `M:SS` / `H:MM:SS` for time exercises | ✅ |
| `formatTimeLeft(seconds)`, `isUrgent(seconds)` | `src/utils/format.ts` | "2 Days and 3 Hours left" / "45 Minutes left"; < 6h left | ✅ |
| `isTimeExercise(type)` / `isRepExercise(type)` / `isIncreaseExercise(type)` | `src/utils/exercise.ts` | Branching on `ExerciseType` (exercise form, exercise card) | ✅ |

## Styles

| What | File | Status |
|---|---|---|
| Design tokens: `--app-bg/surface/border/divider`, `--app-text(-muted/-subtle)`, `--app-accent/success/warning/danger(-soft/-strong)`, `--app-space-1..6`, `--app-radius(-sm/-pill)`, `--app-shadow(-raised)`, `--app-font(-mono)`, `--app-page-max-width` | `src/styles/theme.css` | ✅ |
| Light / dark mode (`getColorScheme`, `setColorScheme`, `initColorScheme`; class `sl-theme-dark` on `<html>`) | `src/styles/color-scheme.ts` | ✅ |
| Page layout `pageStyles` (`static styles = [pageStyles, css`...`]` + `<div class="page-container">`, 768px breakpoint) | `src/styles/page.ts` | ✅ |
