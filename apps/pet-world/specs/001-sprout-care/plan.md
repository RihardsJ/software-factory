# Implementation Plan: Sprout Care

**Feature directory**: `apps/pet-world/specs/001-sprout-care` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

## Summary

Add a procedurally built Three.js pet to a new Vite application. Pure state rules and time-sampled animation poses
keep behaviour testable without WebGL. The scene owns graphics resources. The application module owns the DOM, timers, and fallback.

## Technical Context

- **Language**: TypeScript 6 with the workspace strict settings.
- **Runtime dependencies**: Three.js 0.187.0, matching `apps/reference`.
- **Build and preview**: Vite through the inferred `@nx/vite` targets. Development port 4201, preview port 4301.
- **Unit tests**: Vitest with jsdom and a renderer test seam.
- **Browser tests**: Playwright Chromium with SwiftShader software WebGL against the production preview.
- **Storage**: None. State is in memory.

## Constitution Check

| Principle | Result |
| --- | --- |
| Shared I. Specify observable outcomes | Pass. This spec records outcomes, assumptions, and exclusions. |
| Shared II. Verify behaviour | Pass. Unit and browser tests cover expected and failure paths. |
| Shared III and member lifecycle rules | Pass. State, character, animation, scene, and controls are separate modules with explicit disposal. |
| Shared IV. Grow from evidence | Pass. No new dependency, library, or service. |
| Shared VI. Project boundaries | Pass. `type:app` and `runtime:browser` tags. No imports from other projects. |
| Member separation of concerns | Pass. See module map below. |

No exceptions are required.

## Module Map

| Module | Owns | Depends on |
| --- | --- | --- |
| `src/pet-state.ts` | Starting values, action rules, clamping, announcement text. | Nothing. |
| `src/animation.ts` | Idle and reaction poses sampled from time, reaction replacement, reduced-motion still pose. | `pet-state` types. |
| `src/character.ts` | Sprout's meshes, pose application, and its geometries and materials. | Three.js, `animation`. |
| `src/scene.ts` | Renderer, camera framing, habitat, lights, resize observer, animation loop, context loss, disposal. | Three.js, `animation`, `character`. |
| `src/app.ts` | Markup, indicators, buttons, live announcements, reaction timer, fallback, retry, cleanup. | `pet-state`, `animation`, `scene`. |
| `src/main.ts` | Mounting and page lifecycle, matching `apps/reference`. | `app`. |

## Decisions

- **Animation as poses.** `createPetAnimator().sample(time)` returns a plain pose. The scene applies it each frame.
  Tests check breathing, blinking, ear movement, hop height, and reaction expiry with numbers, not pixels.
- **Reaction replacement.** The animator holds one active reaction. `trigger` replaces it and restarts its one-second window.
  The application clears its reaction timer before starting a new one.
- **Reduced motion.** The scene does not start an animation loop. It renders a still frame on resize and on each action.
  The animator returns the neutral pose, still reporting the active reaction.
- **Indicators.** Native `<meter>` elements with `<label>`, and a text value such as `60 / 100`.
  Values are plain spans, so the announcement paragraph is the only live region.
- **Responsive framing.** The camera moves back on narrow aspect ratios so Sprout and its ears stay in frame. Pixel ratio is capped at 2.
- **Graphics failure.** Renderer creation errors and context loss dispose the habitat and show the alert. Care actions stay available.
- **Generated files.** The Nx web generator also produced a root `vitest.config.mts`, Babel and SWC configuration,
  a custom element starter, a favicon, and separate inferred Vite and Vitest plugin entries.
  These were removed so the application matches `apps/reference`: package-based Nx configuration and the shared plugin entries.

## Verification

- `npm run nx -- run pet-world:test`: state, animation, character, scene, and controls unit tests.
- `npm run nx -- run pet-world:e2e`: Chromium rendering, actions, layout, reduced motion, fallback, and context recovery.
- `npm run check`: the complete workspace quality gate.
- Desktop and mobile screenshots from the browser tests are stored in [evidence/](evidence/).
