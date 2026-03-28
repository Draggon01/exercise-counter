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
