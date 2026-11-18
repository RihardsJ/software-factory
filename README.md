# Software Factory

A learning project for building reliable, scalable web applications with Three.js graphics.
The foundation uses a TypeScript Nx monorepo with npm workspaces and executable quality checks.
The first local application, `apps/reference`, demonstrates a Three.js scene and its resource lifecycle.

## Prerequisites

- Node.js 24.13.0, recorded in `.nvmrc`.
- npm 11.6.2, recorded in `package.json`.
- Git for version control.

## Install and verify

If you use nvm, select the recorded Node.js version:

```sh
nvm install
nvm use
```

Install dependencies and run all checks:

```sh
npm ci
npm run browsers:install
npm run check
```

| Command | Purpose |
| --- | --- |
| `npm run lint` | Run all Nx lint targets, including dependency rules. |
| `npm run typecheck` | Check every configured project and the root configuration. |
| `npm test` | Run all Nx test targets once. |
| `npm run test:watch` | Watch the factory tests during development. |
| `npm run build` | Build the factory tooling and reference application. |
| `npm run dev` | Start the reference application at `http://127.0.0.1:4200`. |
| `npm run browsers:install` | Install the Chromium browser used for smoke tests. |
| `npm run e2e` | Build the reference application and run browser checks against its production preview. |
| `npm run check` | Run all lint, type-check, test, build, and browser targets through Nx. |
| `npm run nx -- show projects` | List discovered workspace projects. |
| `npm run nx -- graph` | Explore the project dependency graph. |

The GitHub Actions workflow installs dependencies and Chromium, then runs `npm run check` for pushes and pull requests.
The workflow file does not configure branch protection or repository settings.

## Run the reference application

After setup, run `npm run dev` and open `http://127.0.0.1:4200`.
Use the controls to pause animation, release the scene, or create a fresh scene.
The application starts paused when the browser requests reduced motion.
If WebGL cannot initialise or loses its context, the application displays a retry action.
All visuals are generated locally. Runtime fonts and assets require no external requests.

The repository also records Node.js 24.13.0 and npm 11.6.2 in Volta configuration.
If your shell selects another Node.js version, select the recorded toolchain before installing dependencies.
For Volta users, `volta run --node 24.13.0 --npm 11.6.2 npm run dev` selects it explicitly.

`apps/reference/src/scene.ts` owns the renderer and graphics resources.
`apps/reference/src/app.ts` owns the controls and fallback interface.
Unit tests verify disposal, animation, resize, and failure behaviour through a renderer test seam.
Playwright verifies the production build with real software WebGL, including rendering, controls, context loss, and responsive layout.
The browser target is not cached. It runs against a fresh preview server on port 4300.
These tests do not establish compatibility with every physical GPU or browser.

## Architecture decisions

Use TypeScript for maintained implementation code, including factory commands, generators, and applications.
JavaScript configuration files remain type checked. JSON, YAML, shell scripts, and future shader files serve their respective tools.

Keep related products in this monorepo while they share ownership and standards.
If access or ownership requirements differ, future factory generators can target separate repositories.
Nx coordinates development tasks. It does not establish application scalability by itself.

The npm workspace patterns are `apps/*`, `libs/*`, and `tools/*`.
The existing project is `@software-factory/factory` in `tools/factory/`.
The browser project is `reference` in `apps/reference/`.
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
Factory tests verify toolchain integration.
Reference application tests verify scene behaviour and browser rendering.

The factory uses ES modules and Node.js module resolution.
The reference application uses Vite and Three.js. A UI framework remains deferred.

## Use on the VM

From the cloned repository, select Node.js 24.13.0 and install dependencies:

```sh
npm ci
npm run browsers:install
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
This increment configures the agent integration. Continuous execution, supervision, and recovery remain future work.

## Repository layout

```text
.claude/settings.json    Official Nx Claude plugin configuration
.github/workflows/      Continuous integration checks
apps/                   Deployable application workspaces
apps/reference/         Local Three.js reference application
libs/                   Future reusable runtime libraries
tools/factory/          Factory workspace package, smoke test, and Node.js build
nx.json                 Task coordination and local caching
tsconfig.base.json      Shared strict compiler settings
AGENTS.md               Repository guidance for agents
CLAUDE.md               Claude Code instructions importing shared project guidance
```

The factory entry point is intentionally empty until a feature requires executable factory behaviour.
UI framework selection, shared libraries, custom generators, deployment, and package publication remain deferred.

## Known dependency limitation

On 13 November 2026, `npm audit` reported 20 moderate development dependency warnings after application setup.
These warnings trace to one [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) in the linting dependency tree.
The advisory concerns denial of service from attacker-controlled glob patterns.
The patched `minimatch` major version exceeds the declared ranges of the installed linting dependencies.
No forced downgrade or incompatible dependency override is applied.
Recheck compatible upstream releases before expanding this foundation.
The quality command runs linting, type checking, unit tests, builds, and browser tests. It does not enforce an audit threshold.
The current reference build also reports Vite's default warning for a JavaScript chunk above 500 kB.
The initial measured bundle is approximately 543 kB minified and 135 kB compressed, including the Three.js renderer.
No application performance budget has been established yet. The bundle warning remains visible.
