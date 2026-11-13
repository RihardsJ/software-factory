# Feature Specification: Pet World Application Setup

## Outcome

Add a second browser application, `apps/pet-world`, through Nx, and include it in the workspace quality gate.
The [member specification](../../apps/pet-world/specs/001-sprout-care/spec.md) owns Sprout's behaviour.
Source: GitHub issue #1.

## Acceptance Conditions

- Inspect the installed `@nx/web:application` generator, preview it with `--dry-run --no-interactive`, and generate `apps/pet-world` without prompts.
- Give the application `type:app` and `runtime:browser` tags.
- Initialise its independent Claude Spec Kit project with the pinned CLI and link the shared constitution explicitly.
- Nx discovers the application's `build`, `dev`, `preview`, and `e2e` targets, plus its `lint`, `typecheck`, and `test` scripts.
- `npm run check` runs the application's lint, type check, unit tests, build, and browser tests. `npm run e2e` runs every browser target.
- Document the exact startup command.
- Factory Spec Kit scoping tests also cover the new member.

## Exclusions

Do not publish, merge, deploy, create shared runtime libraries, or introduce custom generators.
Keep implementation within `apps/pet-world` until reuse justifies shared libraries.
