# Factory Tooling Constitution

## Shared Principles

Before planning or implementation, read the [workspace constitution](../../../../.specify/memory/constitution.md).
The workspace constitution owns shared engineering principles, Nx boundaries, verification rules, and delivery permissions.
This reference is maintained explicitly. Spec Kit does not provide automatic constitution inheritance.
If local requirements conflict with shared principles, resolve the conflict in the feature plan before implementation.

## Project Scope

This Spec Kit project owns `@software-factory/factory` under `tools/factory/`.
Keep its feature specifications in this member's `specs/<number>-<feature>/` directories.
Keep workspace configuration and changes spanning several projects in the root Spec Kit project.
Before editing shared files, identify the owning workspace feature and coordinate its requirements.

## Implementation and Verification

Use TypeScript and Node.js for factory implementation code.
Use Nx generators for supported scaffolding before making manual changes.
Keep runtime dependencies compatible with the `type:tool` and `runtime:node` tags.
Test factory behaviour and relevant failure cases through the member's Nx targets.
Before delivery, run the complete workspace quality command from the repository root.
Do not create a custom application generator before a reference application establishes its required conventions.

## Contracts and Feature State

For cross-project interfaces, identify one authoritative contract owner and reference its contract from consuming specifications.
Number member features independently. Manage Git branches and commits in the shared repository.
When selecting this project from outside it, set `SPECIFY_INIT_DIR` to this member's root.
When selecting a feature explicitly, set `SPECIFY_FEATURE_DIRECTORY` relative to this member or use an absolute path.

## Governance

Keep shared principles in the workspace constitution and project-specific requirements in this document.
When shared principles change, review this member's requirements and update the reference if its location changes.
Use semantic versioning for amendments and document material exceptions in the feature plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
