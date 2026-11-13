# Feature Specification: Rendering Lifecycle

## User Outcomes

A visitor sees one animated Three.js sculpture in a responsive scene.
The visitor can pause or resume motion, stop the scene, and start a fresh scene.
If graphics are unavailable, the visitor sees clear feedback and can retry.
Reduced-motion preferences produce an initial still scene with an explicit resume control.

## Acceptance Conditions

- Render the scene without external runtime services or asset downloads.
- Resize the render buffer and camera to the scene container, with device pixel ratio capped at two.
- Pause without accumulating elapsed time while stopped.
- During cleanup, stop callbacks, disconnect resize observation, remove event listeners, and dispose owned graphics resources exactly once.
- If initialisation partially fails, release resources already allocated.
- If the WebGL context is lost, remove the failed scene and show retry feedback.
- Handle page departure, browser history restoration, and development hot replacement without retaining the old scene.
- Provide labelled controls, visible keyboard focus, live status, and an accessible graphics fallback.
- Verify lifecycle behaviour with unit tests and rendering, controls, resizing, and failures in Chromium.

## Boundaries

This is a reference for local rendering and lifecycle behaviour.
Physical GPU coverage, all-browser compatibility, production performance budgets, and hosting remain deferred.
Workspace integration belongs to `specs/003-reference-application/` at the repository root.
