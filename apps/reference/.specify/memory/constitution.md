# Reference Application Constitution

## Shared Principles

Before planning or implementation, read the [workspace constitution](../../../../.specify/memory/constitution.md).
This document explicitly links shared principles. Spec Kit does not provide automatic constitution inheritance.
Keep workspace setup requirements in root specifications and rendering behaviour in this member's specifications.

## Application Scope

This project owns the `reference` browser application in `apps/reference/`.
Use TypeScript, Vite, and Three.js for its local rendering implementation.
Keep its `type:app` and `runtime:browser` dependency tags.
Do not import factory tooling or Node.js runtime code into browser source files.
Use Nx generators before manual scaffolding when a suitable generator exists.
Do not extract shared libraries before a concrete reuse requirement exists.

## Rendering Lifecycle

Own each geometry, material, renderer, observer, and listener within its scene lifecycle.
Stop animation and release owned resources on cleanup, including failed initialisation and context loss.
Make cleanup safe to call more than once.
Resize to the container and bound pixel density to avoid unbounded render-buffer growth.
Honour reduced-motion preferences and keep controls keyboard accessible.
Provide visible feedback when graphics cannot initialise, with a retry action.

## Verification

Use the member's Nx targets for linting, type checking, unit tests, builds, and browser tests.
Browser tests must verify real WebGL rendering and the fallback path.
Software WebGL tests do not prove compatibility with every physical GPU or browser.
Run the complete workspace quality command before delivery.

## Governance

Keep feature documents under `specs/<number>-<feature>/` in this member.
Reference shared principles rather than duplicating them.
Use semantic versioning for amendments and record material changes in the relevant feature plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
