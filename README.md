# Software Factory

A learning project for building reliable, scalable web applications with Three.js graphics.
The foundation uses a TypeScript Nx monorepo with npm workspaces and executable quality checks.
It contains no application features or rendering implementation.

## Prerequisites

- Node.js 24.13.0, recorded in `.nvmrc`.
- npm 11.6.2, recorded in `package.json`.
- Git for version control and Spec Kit source installation.
- For Spec Kit commands: [uv](https://docs.astral.sh/uv/getting-started/installation/) and Python 3.11 or later.
- Claude Code for the installed Spec Kit skills.

## Install and verify

If you use nvm, select the recorded Node.js version:

```sh
nvm install
nvm use
```

Install dependencies and run all checks:

```sh
npm ci
npm run check
```

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run all Nx lint targets, including dependency rules. |
| `npm run typecheck` | Check every configured project and the root configuration. |
| `npm test` | Run all Nx test targets once. |
| `npm run test:watch` | Watch the factory tests during development. |
| `npm run build` | Compile the factory tooling as Node.js ES modules. |
| `npm run check` | Run all lint, type-check, test, and build targets through Nx. |
| `npm run nx -- show projects` | List discovered workspace projects. |
| `npm run nx -- graph` | Explore the project dependency graph. |
| `npm run specify -- version` | Run the pinned Spec Kit CLI through uv. |

The GitHub Actions workflow is configured to run `npm ci` and `npm run check` for pushes and pull requests.
The workflow file does not configure branch protection or repository settings.

## Architecture decisions

Use TypeScript for maintained implementation code, including factory commands, generators, and applications.
JavaScript configuration files remain type checked. JSON, YAML, shell scripts, and future shader files serve their respective tools.
Python and uv remain external Spec Kit requirements. The repository contains no Python application or factory implementation.

Keep related products in this monorepo while they share ownership and standards.
If access or ownership requirements differ, future factory generators can target separate repositories.
Nx coordinates development tasks. It does not establish application scalability by itself.

The npm workspace patterns are `apps/*`, `libs/*`, and `tools/*`.
The existing project is `@software-factory/factory` in `tools/factory/`.
The root Nx project, `software-factory`, checks shared configuration files.
The root project disables automatic script discovery to prevent recursive task execution.
Project scripts remain ordinary npm commands, coordinated by Nx.

| Project tag | Permitted internal dependencies |
| --- | --- |
| `type:app` | Libraries only. |
| `type:lib` | Libraries only. |
| `type:tool` | Libraries and other tooling. |
| `runtime:browser` | No Node.js runtime projects. |
| `runtime:node` | No browser runtime projects. |
| `runtime:neutral` | Other runtime-neutral projects only. |

Give each new project one type tag and one runtime tag in its package's `nx.tags` field.
The ESLint configuration enforces these dependency constraints.
Use package entry points for imports between projects.
The factory package uses Node.js module resolution and has no browser globals.
Future browser applications must configure their own DOM types and bundler resolution.

Build one small reference application before extracting reusable runtime libraries or creating custom generators.
Test future generators by installing, checking, and building their output in temporary workspaces.
When conventions change, provide migrations for existing generated projects.

## Nx execution and caching

Nx runs independent targets in parallel and caches successful results locally under `.nx/`.
The workspace currently disables the daemon and has no remote cache connection.
Shared inputs include the lockfile, workspace configuration, compiler defaults, lint configuration, and Node.js version.
The build target declares its `dist/` output so cache hits can restore generated files.
Before adding environment-dependent tasks, declare the relevant environment variables and other inputs.
Do not cache deployment or other tasks with external side effects.

To execute every check without cached results:

```sh
npm run check -- --skipNxCache
```

For a restricted environment that blocks Nx plugin worker sockets, use the supported in-process mode:

```sh
NX_ISOLATE_PLUGINS=false npm run check -- --skipNxCache
```

This environment setting does not change repository permissions.
CI uses the complete quality workflow. Affected-only execution remains deferred until its dependency and Git baseline behaviour is verified.

## Nx agent integration

Claude Code uses the official Nx plugin configured in `.claude/settings.json`.
The plugin supplies Nx skills, agents, and an MCP server for workspace queries and generator assistance.
`CLAUDE.md` contains Nx-managed guidance alongside imports of the shared project instructions.
The project-specific [Nx workflow](AGENTS.md#nx-workflow) requires generators and CLI commands before manual scaffolding.

For a new application or library, the agent must discover an appropriate generator and inspect its options.
It must preview supported generators, generate without prompts, and adapt the result to the workspace conventions.
Builds and checks must use Nx targets or the existing root commands.
Manual scaffolding is a fallback when no suitable generator exists, with the limitation recorded.

The integration was configured with the workspace's pinned Nx implementation:

```sh
NX_AI_FILES_USE_LOCAL=true npm run nx -- configure-ai-agents --agents claude --no-interactive
```

Verify the selected agent with:

```sh
NX_AI_FILES_USE_LOCAL=true npm run nx -- configure-ai-agents --agents claude --check=all
```

`NX_AI_FILES_USE_LOCAL=true` keeps setup and checks on the installed Nx version.
Without that setting, Nx may download its latest configuration implementation.
The unfiltered `--check=all` also reports unconfigured agents that this repository does not use.

The generated sandbox rules allow Nx filesystem and Unix socket access under `/tmp/.nx` and `~/.nx`.
The plugin requires network access for its initial download and MCP package installation.
No Nx Cloud connection or autonomous publication workflow is configured.
Follow the [Nx agent setup guide](https://nx.dev/docs/getting-started/ai-setup) when updating this integration.

## Why these tools

TypeScript checks contracts before execution.
Strict settings also check indexed access and optional properties.
The root JavaScript configuration receives type checks through `checkJs`.
ESLint checks code patterns, including unsafe operations that require type information.
Vitest runs automated tests and supports future browser tooling.
The current test verifies that Vitest can load the factory's TypeScript entry point.
It proves toolchain integration only. It does not validate application behaviour or graphics.

The factory uses ES modules and Node.js module resolution.
No bundler, web framework, or Three.js dependency is selected yet.
Add those tools with the first application specification.

## Spec Kit setup

The repository uses official [GitHub Spec Kit](https://github.com/github/spec-kit) release `v1.4.0`.
The `specify` npm script pins that release without requiring a global CLI installation.
The existing project was switched to Claude Code with the supported integration command:

```sh
npm run specify -- integration switch claude --script sh
```

The Claude Code integration replaces the previous Codex integration. Shared project specifications and principles remain in place.
After cloning this repository, no initialisation command is required because the integration files are included.
Use the [official upgrade guide](https://github.github.com/spec-kit/upgrade.html) when deliberately updating Spec Kit.

Shared templates and scripts live in `.specify/`.
Claude Code skills live in `.claude/skills/` and belong in version control.
`CLAUDE.md` imports the shared agent guidance and project constitution.
The [constitution](.specify/memory/constitution.md) defines the initial project principles.
Machine-local Spec Kit state is excluded by `.specify/.gitignore`.
Claude Code local settings and `CLAUDE.local.md` are excluded by the repository `.gitignore`.

## Spec Kit in this monorepo

This setup follows the [official monorepo guide](https://github.github.io/spec-kit/how-to/monorepo.html).
Each member has an independent Spec Kit project within the shared Git repository.

| Scope | Spec Kit configuration | Feature documents |
| --- | --- | --- |
| Workspace configuration and coordinated changes | `.specify/` | `specs/` |
| Factory tooling behaviour | `tools/factory/.specify/` | `tools/factory/specs/` |
| Future Nx application or library | `<member>/.specify/` | `<member>/specs/` |

The root features remain in place, including the original Nx foundation specification.
The factory member has its own Claude skills and [constitution](tools/factory/.specify/memory/constitution.md).
That constitution explicitly references the shared workspace principles. Spec Kit does not provide automatic inheritance.
Each project numbers features independently.
Git branches and commits remain shared, so include a project name in feature branch descriptions to avoid collisions.
The optional Spec Kit Git extension is not installed. The core feature helper creates documents without creating Git branches.

For factory member work, launch Claude from that member:

```sh
cd tools/factory
claude
```

The shell scripts select the nearest `.specify/` when no explicit override is set.
Before launching Claude, clear any old `SPECIFY_INIT_DIR` override or ensure it targets the intended project.

From the repository root, target the same member explicitly:

```sh
SPECIFY_INIT_DIR=tools/factory npm run specify -- integration status
SPECIFY_INIT_DIR=tools/factory npm run specify -- workflow list
```

To launch an agent from the root with member scope, use an absolute project override:

```sh
SPECIFY_INIT_DIR="$PWD/tools/factory" claude
```

Confirm the agent's shell receives that variable before creating a feature.
When working from the root, the agent must also read the selected member's constitution and use its workflow paths.
An invalid override must fail instead of writing into another project.

`SPECIFY_INIT_DIR` selects the project. `SPECIFY_FEATURE_DIRECTORY` independently selects a feature relative to that project or by absolute path.
Explicit feature paths can point outside the project. Keep member features local unless the plan deliberately needs another location.
For concurrent scripted work, `SPECIFY_FEATURE_NO_PERSIST=1` prevents overwriting the project's machine-local feature pointer.
Normal read-only path checks also leave that pointer unchanged.

The factory member was initialised with:

```sh
npm run specify -- init tools/factory --integration claude --script sh --force --non-interactive
```

For future members, use an Nx generator first, then run the pinned Spec Kit initialiser against the generated member directory.
Review existing files before using `--force`. Do not reinitialise existing members during normal feature work.
Give each new member a local constitution, explicitly link shared principles, and keep its generated integration files in version control.
Do not initialise the `apps/` or `libs/` containers as projects.

For cross-project interfaces, keep one authoritative contract under its owning project's specifications and reference it from consumers.
Use a root workspace feature to coordinate changes spanning several projects.
The factory test target verifies nearest-root selection, explicit overrides, feature paths, and independent numbering for both installed script sets.

## Use on the VM

From the cloned repository, select Node.js 24.13.0 and install dependencies:

```sh
npm ci
npm run check
claude
```

Claude Code must already be installed and authenticated on the VM.
On first use, let Claude Code install the configured Nx plugin and restart the session if requested.
If the plugin CLI reports an unknown marketplace, register and install the project integration explicitly:

```sh
claude plugin marketplace add nrwl/nx-ai-agents-config --scope project
claude plugin install nx@nx-claude-plugins --scope project
```

Use `claude plugin list --json` to inspect the installed plugin.
Inside Claude Code, use `/speckit-specify` to start the next feature.
For implementation scaffolding, the Nx generator workflow applies after Spec Kit establishes the feature scope.
The installed core skills permit model invocation, which supports future automated workflow dispatch.
This increment configures the agent integration. Continuous execution, supervision, and recovery remain future work.

## Learn through the next feature

Start a new Claude Code session in this repository so it discovers the installed skills.
Enter these commands in Claude Code chat, not your terminal:

1. Use `/speckit-constitution` when the project principles need changes.
2. Use `/speckit-specify` to describe one small feature and its observable acceptance conditions.
3. If requirements remain unclear, use `/speckit-clarify`.
4. Use `/speckit-plan` to decide implementation details and verification methods.
5. Use `/speckit-tasks` to create ordered tasks, including behaviour tests.
6. Use `/speckit-analyze` to check consistency.
7. Use `/speckit-implement` to implement the agreed scope.
8. Run `npm run check` and review the result against the specification.

Workspace feature documents belong in the root `specs/<number>-<feature>/` directory.
Member feature documents belong in that member's `specs/<number>-<feature>/` directory.
The [Nx workspace increment](specs/001-nx-workspace/spec.md) records this foundation's scope and verification requirements.
For each increment, record what changed, why it changed, and which checks provide evidence.
Choose a small rendering feature next, such as displaying and disposing of one Three.js scene.
Define browser support, error states, and graphics verification within that specification.

## Repository layout

```text
.claude/skills/          Spec Kit skills for Claude Code
.claude/settings.json    Official Nx Claude plugin configuration
.github/workflows/      Continuous integration checks
.specify/               Templates, scripts, configuration, and constitution
apps/                   Future deployable applications
libs/                   Future reusable runtime libraries
tools/factory/          Factory workspace package, smoke test, and Node.js build
tools/factory/.specify/  Independent factory member configuration and constitution
tools/factory/specs/     Factory member feature specifications
specs/                  Feature specifications, plans, tasks, and verification evidence
nx.json                 Task coordination and local caching
tsconfig.base.json      Shared strict compiler settings
AGENTS.md               Repository guidance for agents
CLAUDE.md               Claude Code instructions importing shared project guidance
```

The factory entry point is intentionally empty until a feature requires executable factory behaviour.
Application rendering, framework selection, custom generators, deployment, and package publication remain deferred.

## Known dependency limitation

On 13 November 2026, `npm audit` reported 15 moderate development dependency warnings after the Nx installation.
These warnings trace to one [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the linting dependency tree.
The advisory concerns denial of service from attacker-controlled glob patterns.
The patched `minimatch` major version exceeds the declared ranges of the installed linting dependencies.
No forced downgrade or incompatible dependency override is applied.
Recheck compatible upstream releases before expanding this foundation.
The quality command runs linting, type checking, tests, and builds. It does not enforce an audit threshold.
