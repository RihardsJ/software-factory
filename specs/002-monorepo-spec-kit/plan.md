# Implementation Plan: Member-scoped Spec Kit

1. Inspect the official monorepo guide and the installed root-resolution scripts.
2. Initialise the existing Nx factory package with the pinned Spec Kit CLI and Claude integration.
3. Define its local constitution and explicitly link the shared workspace principles.
4. Update root and member agent instructions with project ownership and selection rules.
5. Add regression tests for nested roots, explicit overrides, feature selection, and independent feature numbering.
6. Run all Nx quality targets and verify CLI selection for both projects.

Keep generated upstream scripts and skills unchanged.
Preserve `specs/001-nx-workspace/` as a workspace feature.
The root constitution remains the authoritative source of shared principles.
Member constitutions add project-specific requirements and link the shared source explicitly.

Reference: https://github.github.io/spec-kit/how-to/monorepo.html
