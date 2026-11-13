# Tasks: Sprout Care

**Input**: [spec.md](spec.md) and [plan.md](plan.md) in `apps/pet-world/specs/001-sprout-care/`.
Behaviour tests are required by the shared constitution, despite the optional wording in the upstream template.

## Phase 1: Setup

- [x] T001 Generate `apps/pet-world` with `@nx/web:application` after a dry run, and adapt it to `apps/reference` conventions.
- [x] T002 Initialise the member Spec Kit project and link the shared constitution from `.specify/memory/constitution.md`.

## Phase 2: Foundation

- [x] T003 [P] Implement starting values, Feed, Play, clamping, and announcement text in `src/pet-state.ts`.
- [x] T004 [P] Test state transitions and both boundaries in `tests/pet-state.test.ts`.
- [x] T005 Implement time-sampled idle and reaction poses with replacement and reduced motion in `src/animation.ts`.
- [x] T006 Test breathing, blinking, ears, eating, hopping, replacement, and reduced motion in `tests/animation.test.ts`.

## Phase 3: US1 Watch Sprout (P1)

- [x] T007 Build Sprout's body, belly, leaf ears, eyes, mouth, and feet, with pose application and disposal, in `src/character.ts`.
- [x] T008 Test Sprout's parts, colours, poses, and disposal in `tests/character.test.ts`.
- [x] T009 Implement the habitat, lights, ground plane, framing, resize, animation loop, context loss, and disposal in `src/scene.ts`.
- [x] T010 Test the habitat lifecycle through a renderer seam in `tests/scene.test.ts`.

## Phase 4: US2 and US3 Feed and Play (P1)

- [x] T011 Implement indicators, buttons, live announcements, reaction timer, and cleanup in `src/app.ts`, mounted by `src/main.ts`.
- [x] T012 Test indicators, actions, boundaries, replacement, and cleanup in `tests/app.test.ts`.

## Phase 5: US4 Reduced Motion and US5 Graphics Failure (P2)

- [x] T013 Pass the reduced-motion preference to the habitat and keep feedback. Covered by `tests/app.test.ts` and `tests/scene.test.ts`.
- [x] T014 Show the fallback alert with retry while keeping actions available. Covered by `tests/app.test.ts`.

## Phase 6: Browser Verification and Polish

- [x] T015 Verify rendering, keyboard actions, announcements, layout, reduced motion, fallback, and recovery in `tests/e2e/pet-world.spec.ts`.
- [x] T016 Store desktop and mobile screenshots in `evidence/`.
- [x] T017 Run `npm run check` and record the result below.

## Dependencies

T003 and T005 precede T007 to T012. T009 depends on T005 and T007. T011 depends on T003, T005, and T009.
T015 depends on all implementation tasks. T017 runs last.

## Verification: 13 November 2026

- `npm run check -- --skipNxCache` passed lint, type check, test, build, and e2e targets for all four Nx projects.
- Pet World unit tests: 31 passed across state, animation, character, scene, and controls.
- Pet World browser tests: 6 passed in Chromium with SwiftShader software WebGL against the production preview.
- Browser checks cover canvas pixels showing Sprout's mint body, idle motion between frames, keyboard Feed and Play with Enter and Space,
  one live status region with exact announcements, the upper boundary, a 390 by 844 viewport without horizontal scrolling,
  44 pixel action targets, still frames under reduced motion, the WebGL fallback with working actions, context recovery, and page lifecycle cleanup.
- [Desktop screenshot](evidence/desktop.png) at 1280 pixels wide and [mobile screenshot](evidence/mobile.png) at 390 pixels wide were inspected.
- `npm run dev:pet-world` served the application at `http://127.0.0.1:4201`.

## Remaining Limits

Software WebGL verification does not establish compatibility with every physical GPU or browser.
Vite reports a 544.15 kB JavaScript chunk, 136.65 kB compressed, mostly Three.js. No performance budget exists yet.
Reduced motion is read on mount. Changing the preference while the page is open takes effect after a reload.
Screen reader output was not tested with assistive technology. The checks verify roles, labels, and live region text.
