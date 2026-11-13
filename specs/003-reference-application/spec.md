# Feature Specification: Reference Application Setup

## Outcome

Create the first local web application through Nx, using TypeScript, Vite, and Three.js.
Establish browser verification and rendering lifecycle conventions before extracting shared libraries.
The [member rendering specification](../../apps/reference/specs/001-rendering-lifecycle/spec.md) owns detailed application behaviour.

## Acceptance Conditions

- Generate `apps/reference` through the pinned Nx web generator, after reviewing its dry run.
- Give the application `type:app` and `runtime:browser` tags.
- Initialise its independent Claude Spec Kit project and link shared engineering principles.
- Render one animated scene and resize it to its container, including high-density displays.
- Provide accessible controls to pause animation and release/restart the scene.
- If graphics initialisation or the WebGL context fails, show a useful fallback with a retry action.
- Stop animation, disconnect observers, remove listeners, and dispose owned graphics resources during cleanup.
- Honour reduced-motion preferences on initialisation.
- Test expected behaviour, failure paths, and idempotent cleanup.
- Verify real WebGL rendering, responsive layout, controls, and failure feedback in Chromium.
- Include application linting, type checking, tests, build, and browser checks in local and CI quality commands.
- Use Node.js 24.13.0 and npm 11.6.2, and keep dependency versions locked.

## Exclusions

Do not publish, reconcile Git histories, deploy, activate cloud runs, create shared runtime libraries, or introduce custom application generators.
The reference demonstrates local rendering and lifecycle behaviour. It does not establish production scalability or universal GPU compatibility.
