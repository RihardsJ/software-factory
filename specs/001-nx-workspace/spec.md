# Feature Specification: TypeScript Nx Workspace

**Status**: Accepted for implementation
**Date**: 2026-11-13

## Purpose

Establish one implementation language and a workspace that can coordinate future applications, libraries, and factory tooling.

## User Scenarios

### US1: Run consistent checks

As a contributor, I can install dependencies and run the complete quality workflow from the repository root.

Acceptance conditions:

- `npm ci` installs the locked dependencies and links the factory workspace.
- Nx discovers the factory project under `tools/factory/`.
- `npm run check` runs linting, type checking, tests, and the factory build.
- The root configuration files receive linting and type checking.
- Intentional lint, type, and test failures return unsuccessful exit codes.

### US2: Maintain clear project boundaries

As a contributor, I can distinguish deployable applications, reusable libraries, and factory tooling.

Acceptance conditions:

- npm workspace patterns cover `apps/*`, `libs/*`, and `tools/*`.
- Applications can consume libraries, but cannot consume applications or factory tooling.
- Libraries cannot consume applications or factory tooling.
- Browser projects cannot consume Node.js runtime libraries.
- ESLint enforces these dependency rules.
- No application, rendering library, or custom generator is introduced in this increment.

### US3: Use TypeScript for maintained implementation code

As a maintainer, I have one implementation language for the factory and its initial products.

Acceptance conditions:

- Remove the Python starter, its manifest, and its version file.
- Move the existing TypeScript entry point and smoke test into the factory workspace.
- Keep Spec Kit intact, including its external Python runtime dependency.
- Update repository instructions and principles to describe the chosen architecture.

## Constraints and Exclusions

Retain npm, the existing Node.js version, ESLint, Vitest, and the pinned Spec Kit release.
Use a Node.js environment for factory tooling. Browser projects will define their own runtime configuration.
Keep local and CI quality commands aligned.
Defer remote caching, affected-only CI, application generation, rendering, deployment, and package publication.
Support separate product repositories later when ownership or access requirements justify them.

## Success Criteria

The acceptance conditions pass executable verification, and the documented commands match the implemented workspace.
Record any environment limits or dependency warnings without claiming production or rendering readiness.
