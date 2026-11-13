# Software Factory

## Purpose and scope

This learning project will build reliable web applications with Three.js graphics.
The workspace includes factory tooling and a local TypeScript, Vite, and Three.js reference application.
Deployment, service architecture, and shared runtime libraries remain deferred.

## Project map

- `README.md`: setup, checks, and learning workflow.
- `.specify/memory/constitution.md`: project principles and delivery requirements.
- `.specify/templates/`: upstream specification templates.
- `.specify/scripts/bash/`: upstream workflow scripts.
- `CLAUDE.md`: Claude Code entry point importing this guidance and the constitution.
- `.claude/settings.json`: official Nx Claude plugin and sandbox configuration.
- `.claude/skills/speckit-*/`: installed Claude Code workflow skills.
- `specs/<number>-<feature>/`: workspace specifications, plans, and tasks.
- `tools/factory/.specify/`: the factory member's independent Spec Kit project.
- `tools/factory/specs/`: factory member specifications, with independent feature numbering.
- `apps/reference/`: the first browser application, with its own Spec Kit project and rendering specifications.
- `apps/reference/tests/`: lifecycle unit tests and Playwright browser checks.
- `apps/`: deployable application workspaces.
- `libs/`: future reusable runtime workspaces.
- `tools/factory/`: factory package, Node.js build, and toolchain smoke test.
- `nx.json`: task coordination, shared inputs, and local caching.
- `tsconfig.base.json`: shared strict compiler settings.
- `eslint.config.mjs`: typed linting and dependency constraints.

## Commands

Use Node.js from `.nvmrc` and npm with `package-lock.json`.

```sh
npm ci
npm run browsers:install
npm run dev
npm run check
npm run check -- --skipNxCache
npm run lint
npm run typecheck
npm test
npm run test:watch
npm run build
npm run e2e
npm run nx -- show projects
npm run specify -- version
```

The Spec Kit command requires `uv`, Python 3.11 or later, and network access on first use.
No local services are currently required. Spec Kit project selection can use `SPECIFY_INIT_DIR`.
Python is an external Spec Kit prerequisite. Maintained implementation code uses TypeScript.
When worker sockets are unavailable, prefix Nx commands with `NX_ISOLATE_PLUGINS=false`.

## Nx workflow

For scaffolding requests, invoke the Nx plugin's `nx-generate` skill before exploring or creating files.
Use Nx generators first when creating applications, libraries, projects, or supported workspace configuration.
Prefer an existing workspace generator when it meets the requirement.
Discover plugin capabilities with `npm run nx -- list <plugin>`.
Read the generator's help, schema, and implementation before selecting options.
Preview supported generators with `--dry-run --no-interactive` before generating files.
If dry-run is unsupported, inspect and record the expected changes before execution.
Execute generators with `--no-interactive` to prevent unattended prompts.
After generation, adapt the output to this workspace's TypeScript settings, npm scripts, tests, and dependency tags.
If no suitable generator exists, record the limitation before making minimal manual changes.

Use `npm run nx -- <command>` to run the installed workspace CLI.
For workspace questions, invoke the plugin's `nx-workspace` skill and inspect the project graph.
Inspect available targets with `npm run nx -- show project <project> --json`.
Run builds, tests, linting, and type checks through Nx targets or the existing root wrappers.
Prefer `npm run nx -- run <project>:<target>` for a single project.
Use `npm run nx -- run-many -t <targets>` when several projects require verification.
Keep full checks as the delivery gate until affected-only execution has separate verification.

For plugin initialisation, use `nx add` with a version compatible with the installed Nx release.
Do not rerun `nx init` in this existing Nx workspace.
For Nx upgrades, use `nx migrate` and review the generated migrations before executing them.
When flags or APIs are unclear, consult Nx documentation or CLI help instead of guessing.
If plugin skills or MCP tools are unavailable, follow this workflow through the Nx CLI and report the limitation.
Keep project-specific rules outside the managed Nx block in `CLAUDE.md` so updates preserve them.

## Spec Kit project scope

Use the root Spec Kit project for workspace configuration and coordinated changes spanning projects.
Use `tools/factory/.specify/` for factory member behaviour and its local `specs/` for feature documents.
Use `apps/reference/.specify/` for reference rendering behaviour and its local `specs/` for feature documents.
Before starting a workflow, identify the owning Spec Kit project and read its constitution.
When targeting a member from the repository root, set `SPECIFY_INIT_DIR` to that member's root.
Use an absolute project path when launching an agent whose working directory might change.
Read constitution and feature files from the selected project, even when running scripts from the repository root.
Use `SPECIFY_FEATURE_DIRECTORY` separately to select the feature within that project.
Keep member specifications under their member directory unless a feature plan explicitly requires another location.
Do not reuse one project's `.specify/feature.json` for another project.
If an explicit project path is invalid, stop instead of falling back to the root project.

After Nx generates a new application or library, initialise Spec Kit in that member with the pinned CLI.
Use the Claude integration and shell scripts, matching the existing projects.
Give each member its own constitution, feature directory, and installed skills.
Link the shared constitution explicitly. Do not assume automatic inheritance.
For cross-project contracts, record one authoritative owner and reference that contract from consumers.
Manage branches and commits at the repository root. Member feature numbering does not isolate Git branch names.
Keep a single Git repository for this workspace.

## Working rules

Read the constitution before planning or implementation.
Keep new behaviour within the current feature specification.
Preserve unrelated work.
Use npm workspace packages under `apps/*`, `libs/*`, or `tools/*`.
Give each project one type tag and one runtime tag.
Applications consume libraries. Libraries must not consume applications or factory tooling.
Keep browser code separate from Node.js tooling through dependency tags.
Declare task inputs and outputs before relying on cached results.
Keep full CI checks until affected-only execution has separate verification.
Build a reference application before extracting libraries or creating custom generators.
Keep upstream Spec Kit assets unchanged unless a project requirement justifies customisation.
Include meaningful behaviour tests in feature plans, despite optional wording in upstream templates.
Before delivery, run `npm run check` and review the complete diff.
The quality command includes browser tests and requires Chromium installation through `npm run browsers:install`.
For CI on Linux, install Chromium and its system dependencies with `npm exec playwright install --with-deps chromium`.
Report executed checks and remaining limitations accurately.
Do not publish, merge, or deploy without explicit authorisation.
