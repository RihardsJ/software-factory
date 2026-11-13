# Feature Specification: Member-scoped Spec Kit

**Date**: 2026-11-13
**Scope**: Workspace configuration

## Outcome

Use Spec Kit's documented monorepo model within the existing Nx workspace.
Keep root specifications for workspace changes and independent member specifications for project behaviour.

## Acceptance Conditions

- Keep the root Spec Kit project and existing feature documents.
- Initialise `tools/factory/` with its own Claude integration, constitution, and independent feature numbering.
- Resolve member scope from nested working directories or an explicit `SPECIFY_INIT_DIR`.
- Reject invalid explicit project overrides without falling back to the root project.
- Document project selection separately from feature selection.
- Explicitly reference shared principles from the member constitution, without claiming automatic inheritance.
- Document the shared Git branch namespace and one authoritative owner for cross-project contracts.
- Use Nx generators before initialising Spec Kit in future applications and libraries.
- Verify scope resolution and feature numbering through the existing Nx test target.

## Exclusions

Do not create application or library placeholders, add Git repositories, install the optional Git extension, or alter cloud automations.
Keep Spec Kit 1.4.0 and the existing Nx toolchain.
