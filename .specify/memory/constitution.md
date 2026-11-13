# Software Factory Constitution

## Core Principles

### I. Specify Observable Outcomes

Before implementing a feature, record its purpose, scope, acceptance conditions, and exclusions.
Keep workspace specifications under the root `specs/<number>-<feature>/` directory.
Keep member specifications under that member's `specs/<number>-<feature>/` directory.
Give each member an independent `.specify/` project and explicitly reference shared principles from its constitution.
Resolve decisions that block implementation before changing dependent code.

### II. Verify Behaviour

For behaviour changes, add tests that cover expected outcomes and relevant failures.
For bug fixes, add a regression test when executable reproduction is practical.
Before delivery, run `npm run check` and review the changes against their acceptance conditions.
Report failed or unavailable checks explicitly.
Passing unit tests do not prove rendering quality, scalability, or deployment success.

### III. Keep Boundaries Explicit

Use strict TypeScript for maintained factory and application implementation code.
Keep JavaScript configuration files within linting and type checking.
Validate untrusted data at system boundaries.
When adding rendering, separate application logic from browser and Three.js lifecycle effects.
Define resource ownership and disposal when adding graphics resources.

### IV. Grow From Evidence

Start with the smallest structure that satisfies the current specification.
Add services, packages, infrastructure, and dependencies only when a concrete requirement justifies them.
When performance matters, define a representative workload and measure the result.
Do not claim scalability from architecture choices alone.

### V. Make Learning Reproducible

Document setup commands, material decisions, and verification limits beside the relevant work.
Use the committed dependency lockfile for repeatable installation.
Keep local and continuous integration checks aligned.
Keep secrets and machine-local state outside version control.

### VI. Enforce Project Boundaries

Place deployable applications in `apps/`, reusable runtime libraries in `libs/`, and factory tooling in `tools/`.
Applications consume libraries. Libraries must not consume applications or factory tooling.
Give each workspace project one type tag and one runtime tag.
Enforce dependency constraints with ESLint, including browser and Node.js runtime separation.
Use Nx generators first for supported application, library, project, and workspace scaffolding.
Before generation, inspect generator options and preview supported changes without interactive prompts.
If no suitable generator exists, record the limitation before making minimal manual changes.
After Nx generates a member project, initialise its own Claude Spec Kit integration before specifying member behaviour.
For cross-project interfaces, identify one authoritative contract owner and reference that contract from consuming specifications.
Run project builds, checks, and supported maintenance through the workspace Nx CLI.
When ownership or access requirements differ, allow products to live in separate repositories.

### VII. Prove and Maintain Generation

Build a reference application before extracting libraries or introducing custom generators.
For generators, test installation, quality checks, and builds in temporary output workspaces.
Version factory conventions and provide migrations when existing generated projects require structural updates.

### VIII. Make Automation Inspectable

Record task results and failures so contributors can diagnose automation outcomes.
Before enabling cached results, declare relevant task inputs and outputs.
Do not cache deployment or other tasks with external side effects.
Measure representative application workloads before claiming scalability or performance improvements.

## Technical Constraints

The target is web applications with Three.js graphics rendering.
The foundation uses Node.js 24, npm workspaces, Nx, TypeScript, ESLint, and Vitest.
The reference application uses Vite, Three.js, and Playwright with software WebGL browser verification.
Spec Kit provides specification templates, shell scripts, and Claude Code skills.
Python and uv are external Spec Kit prerequisites. This repository contains no maintained Python implementation.
Application UI framework, persistence, and hosting decisions remain deferred.

## Development Workflow

1. Define the next feature with `/speckit-specify`.
2. If requirements remain unclear, use `/speckit-clarify`.
3. Use `/speckit-plan` to record implementation decisions and verification methods.
4. Use `/speckit-tasks` to create ordered tasks, including required behaviour tests.
5. Use `/speckit-analyze` to check consistency before implementation.
6. Implement the agreed scope and run the applicable checks.
7. Review the diff and report results, decisions, and remaining limits.

Keep tests in feature scope even when an upstream template describes tests as optional.
Implementation authorisation does not authorise publication, merging, or deployment.

## Governance

This constitution defines project principles. `AGENTS.md` provides repository navigation and commands.
For amendments, document the reason and update affected guidance.
Use a major version for incompatible principle changes, a minor version for additions, and a patch version for clarifications.
During review, check compliance and explain any necessary exception in the feature plan.

**Version**: 2.3.0 | **Ratified**: 2026-11-13 | **Last Amended**: 2026-11-13
