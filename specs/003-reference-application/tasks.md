# Tasks: Reference Application Setup

- [x] T001 Install and preview Nx application tooling.
- [x] T002 Generate the application and configure its independent Spec Kit member.
- [x] T003 Implement the scene lifecycle and application interface.
- [x] T004 Add lifecycle tests and browser verification.
- [x] T005 Integrate quality targets, CI, and setup documentation.
- [x] T006 Verify the complete workspace and inspect the rendered application.
- [x] T007 Review the changes and record evidence and limitations.

## Verification: 13 November 2026

- Used Node.js 24.13.0 and npm 11.6.2 for installation and verification.
- Inspected the Nx generator, completed its dry run, and generated `apps/reference` through `@nx/web:application`.
- Clean `npm ci --no-audit` succeeded with the committed dependency lockfile.
- `npm run check -- --skipNxCache` passed all 11 quality targets across three Nx projects.
- Factory verification passed 31 tests. Reference lifecycle verification passed six tests.
- Five Chromium checks passed against the production build using software WebGL.
- Desktop and mobile screenshots were inspected for scene visibility and responsive layout.
- The preview server released port 4300 after browser verification.
- `SPECIFY_INIT_DIR=apps/reference npm run specify -- integration status` reported a valid Claude integration.
- Spec Kit reported no modified or missing managed files and no invalid manifest paths.
- Reviewed workspace configuration, application behaviour, failure paths, dependency boundaries, and tests against the acceptance conditions.

## Remaining Limits

The dependency audit reports 20 moderate development warnings from the documented minimatch advisory.
Vite reports a 543.31 kB JavaScript chunk, or 135.42 kB compressed.
The warning remains visible while a representative performance budget is deferred.
Software WebGL verification does not establish all-browser or physical GPU compatibility.
GitHub Actions is configured but has not run remotely for these uncommitted changes.
Publishing, Git history reconciliation, deployment, and Tessl cloud preparation remain outside this increment.
