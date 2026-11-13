# Tasks: Member-scoped Spec Kit

- [x] T001 Inspect the guide, workspace projects, and installed resolution behaviour.
- [x] T002 Initialise the factory member with the official CLI.
- [x] T003 Define shared and member scope in constitutions and agent guidance.
- [x] T004 Add scope and numbering regression tests.
- [x] T005 Verify both projects, run quality checks, and review the changes.

## Verification

- The pinned Spec Kit 1.4.0 CLI initialised `tools/factory/` with the Claude integration and shell scripts.
- Root and member `integration status` commands report OK, with no missing or modified managed files.
- `SPECIFY_INIT_DIR=tools/factory npm run specify -- workflow list` reports the member's installed workflow.
- The uncached Nx quality command passed all six targets with Node.js 24.13.0 and npm 11.6.2.
- All 17 tests passed, including 16 scope tests across the root and member script sets.
- Scope tests cover nested directories, relative project overrides, invalid overrides, read-only feature paths, and independent numbering.
- Feature creation tests use disposable projects to confirm member template ownership without writing root specifications.
- Root and member upstream assets match their installation manifests. All shell scripts pass syntax checks.
- Documentation links, member state exclusions, and repository whitespace checks passed.
- Review found no further defects within this increment's scope.

## Limits

Interactive Claude slash-command execution was not run. The documented launch procedure must preserve the selected project environment.
No feature documents were moved, no new applications or libraries were generated, and no Git extension was installed.
The existing Tessl cloud setup was not changed.
