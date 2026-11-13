# Tasks: TypeScript Nx Workspace

- [x] T001 Define scope, acceptance conditions, and architecture decisions.
- [x] T002 Install pinned Nx packages and configure npm workspace discovery.
- [x] T003 Configure task coordination, caching, and dependency boundaries.
- [x] T004 Move the TypeScript starter and remove Python implementation files.
- [x] T005 Update documentation, agent guidance, and project principles.
- [x] T006 Verify installation, quality targets, build output, and failure handling.
- [x] T007 Verify forbidden imports and cache invalidation.
- [x] T008 Review the changes and record actual results and limitations.

## Verification Evidence

Verification environment: macOS, Node.js 24.13.0, npm 11.6.2, and Nx 24.0.6.

- `npm ci --offline --cache /private/tmp/software-factory-npm-cache --no-audit` passed and linked the factory workspace.
- `npm run nx -- show projects` discovered `software-factory` and `@software-factory/factory`.
- `NX_ISOLATE_PLUGINS=false npm run check -- --skipNxCache` passed all six targets.
- The Vitest toolchain smoke test passed. It verifies module loading, not application behaviour.
- Importing `@software-factory/factory` loaded the built Node.js ES module.
- Temporary probes confirmed unsuccessful root commands for floating promises, incorrect types, and failing tests.
- An empty Vitest selection returned an unsuccessful exit code.
- Forbidden-import probes rejected application-to-tooling, library-to-tooling, library-to-application, and application-to-application dependencies.
- A browser library importing a Node.js library failed. A Node.js application importing a Node.js library passed.
- A repeat check reused all six cached targets.
- After deleting `tools/factory/dist/`, a cached build restored the importable output.
- Changing the shared compiler configuration invalidated cached targets. The probe restored the original configuration.
- `nx.json` passed validation against the installed Nx schema.
- Byte comparisons confirmed unchanged upstream Spec Kit assets and installed skills.
- Checks confirmed removal of the Python starter and clean whitespace in repository files.

Temporary fixtures and failure probes were removed after verification.
After the final clean installation, the uncached quality workflow passed again.
The final review found no additional defects within this increment's scope.

## Limits

The execution environment blocks Nx worker sockets. Verification used the supported in-process plugin mode.
Hosted GitHub Actions execution remains unverified.
`npm audit` reports 15 moderate development dependency warnings, tracing to the existing minimatch advisory.
No application rendering, custom generators, remote caching, or affected-only CI was introduced or verified.
