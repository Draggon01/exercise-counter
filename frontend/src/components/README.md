# Reusable building blocks

**Rule:** before you build a component, dialog, helper or style, look here first.
If something similar exists, use it (or extend it). If you add something reusable, add it to
this list **in the same commit**. Status: ✅ available · 🛠 planned (task in `.plan/refactor-plan.md`).

## Shared components — `src/components/`

Generic UI that is not tied to one feature. Import once (side-effect import) where it is used.

| Tag | File | Use it for | API | Used in | Status |
|---|---|---|---|---|---|
| `<confirm-dialog>` | `confirm-dialog.ts` | Asking before a destructive or irreversible action (delete, hide, leave) | props: `open`, `label`, `confirmLabel`, `cancelLabel`, `variant` (`danger` \| `warning` \| `primary`); default slot: message; events: `confirm`, `cancel` | home (delete / hide exercise), groups (leave group) | ✅ |
| `<page-header>` | `page-header.ts` | Top of every sub page: Back button + title, optional actions | props: `heading`, `backTo` (default `/`); slot `actions` | browse, groups, statistics, options | ✅ |
| `<empty-state>` | `empty-state.ts` | "Nothing here yet" message with optional call to action | – | home, browse, statistics, group search | 🛠 T3.7 |
| toast (`toast()`) | `toast.ts` | Short feedback / error messages (`sl-alert`) | – | everywhere (via listener on `*/rejected`) | 🛠 T3.7 |
| `<auth-card>` | `auth-card.ts` | Frame for login / register forms | – | login, register | 🛠 T3.8 |
| `<changelog-dialog>` | `changelog-dialog.ts` | Shows unseen changelog entries after login | – | overlay | 🛠 T4.1 |

## Feature elements — `src/views/<feature>/elements/`

Belong to one feature, listed here so they are not built a second time.

| Tag | File | Purpose | Status |
|---|---|---|---|
| `<exercise-card>` | `views/home/elements/exercise-card.ts` | One exercise on the home page (header, goal, progress, finished-by, footer) | ✅ |
| `<browse-card>` | `views/home/elements/browse-card.ts` | One exercise in the browse list with a Select button | ✅ |
| `<exercise-form-dialog>` | `views/home/elements/exercise-form-dialog.ts` | Create / edit an exercise | 🛠 T2.4 |
| `<exercise-timer>` | `views/home/elements/exercise-timer.ts` | Countdown for time exercises (start/pause/reset, finish sound, saves progress) | 🛠 T2.5 |
| `<rep-counter>` | `views/home/elements/rep-counter.ts` | Reps input for rep exercises (debounced save) | 🛠 T2.5 |

## Helpers

| What | File | Use it for | Status |
|---|---|---|---|
| `apiGet` / `apiPost` / `apiPut` / `apiDelete`, `apiThunk`, `ApiError` | `src/api/http.ts` | **Every** backend call (inside a Redux slice) | ✅ |
| `ConnectedLitElement` | `src/connectedLitElement.ts` | Base class for elements that read the Redux store (`stateChanged`) | ✅ |
| `navigate(path)` | `src/utils/navigation.ts` | Navigation without importing the app/router (safe in components and tests); `CustomRouter.goto` in `src/index.ts` still works in views | ✅ |
| `validateForm(form)` | `src/utils/form.ts` | Show validation messages of all Shoelace fields and return whether the form is valid | 🛠 T2.4 |
| `formatDuration(seconds)` | `src/utils/format.ts` | `M:SS` / `H:MM:SS` for time exercises | 🛠 T2.5 |
| `formatTimeLeft(seconds)` | `src/utils/format.ts` | "2 Days and 3 Hours left" / "45 Minutes left" | 🛠 T2.5 |
| `isTimeExercise(type)` / `isRepExercise(type)` / `isIncreaseExercise(type)` | `src/utils/exercise.ts` | Branching on `ExerciseType` | 🛠 T2.5 |

## Styles

| What | File | Status |
|---|---|---|
| Design tokens (`--app-*` colors, spacing, radius) | `src/styles/theme.css` | 🛠 T3.1 |
| Page layout (`.page-container`, 768px breakpoint) | `src/styles/page.ts` | 🛠 T3.3 |
