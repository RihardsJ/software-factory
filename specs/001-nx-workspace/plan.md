# Implementation Plan: TypeScript Nx Workspace

## Decisions

- Use TypeScript for maintained factory and application implementation code.
- Retain npm, add workspaces, and use Nx for task coordination and dependency enforcement.
- Place the first workspace package in `tools/factory/`.
- Keep root configuration checks as explicit Nx targets.
- Use shared strict compiler settings with separate runtime settings per project.
- Use local task caching with declared inputs and outputs.
- Keep full CI checks until affected-task selection has separate verification.
- Delay custom generators until a reference application establishes a useful pattern.

## Ordered Changes

1. Install compatible pinned Nx packages.
2. Configure workspace discovery, explicit quality targets, and dependency rules.
3. Move the TypeScript starter and smoke test into the factory package.
4. Remove the Python starter and update repository documentation and constitution.
5. Verify installation, task discovery, quality checks, build output, failure handling, and dependency boundaries.
6. Review the changes and record evidence in `tasks.md`.

## Verification

- Run `npm ci` and inspect the npm workspace link.
- Inspect `nx show projects` and factory target configuration.
- Run `npm run check` without cached task results.
- Check that the build produces an importable Node.js ES module.
- Use temporary probes for invalid types, floating promises, failed tests, and forbidden imports.
- Confirm cache reuse and invalidation after shared compiler configuration changes.
- Verify that no maintained Python implementation files remain.
- Preserve existing Spec Kit assets, except the project-owned constitution.

## Risks and Limits

Nx and its plugins must use matching versions.
Cached results require complete shared configuration inputs.
The initial repository has no Git commits, so affected-only execution remains deferred.
The previous dependency audit reported moderate development dependency warnings. Reassess after installation.
Hosted GitHub Actions execution remains outside local verification.

## Implementation Notes

Nx 24.0.6 and its ESLint plugin use matching pinned versions.
The plugin's published rule declarations use an older ESLint context type.
The lint configuration registers the runtime rules through one explicit compatibility assertion.
Forbidden-import probes verified that the registered rules execute correctly.
No lint or compiler checks were disabled to accommodate the plugin declarations.
The constitution moved to version 2.0.0 because TypeScript-only implementation replaces the previous permission to use JavaScript implementation code.
