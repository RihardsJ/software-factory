# Tasks: Pet World Application Setup

- [x] T001 Inspect and preview the Nx web application generator.
- [x] T002 Generate `apps/pet-world` and adapt the output to workspace conventions.
- [x] T003 Initialise the member Spec Kit project and link the shared constitution.
- [x] T004 Register the application with the existing Vite and Playwright plugin includes.
- [x] T005 Add the startup command, widen the browser command, and update documentation.
- [x] T006 Extend the factory Spec Kit scoping tests to the new member.
- [x] T007 Run the complete workspace check and record the evidence.

## Verification: 13 November 2026

- Generator dry run: `npm run nx -- g @nx/web:application apps/pet-world --name=pet-world --bundler=vite --unitTestRunner=vitest --e2eTestRunner=none --linter=none --formatter=none --useProjectJson=false --tags=type:app,runtime:browser --port=4201 --dry-run --no-interactive`.
  The same command without `--dry-run` generated the application.
- `npm run nx -- show project pet-world --json` lists `build`, `dev`, `preview`, `e2e`, `lint`, `typecheck`, and `test`, with `type:app` and `runtime:browser` tags.
- `npm run check -- --skipNxCache` passed for the root, factory, reference, and pet-world projects.
- Factory tests: 49 passed, including Spec Kit scoping for `apps/pet-world`. Reference: 6 unit and 5 browser tests passed.
- Installation used `npm ci` from the committed lockfile with npm 11.6.2. The run used Node.js 24.22.2, inside the declared engine range, rather than the pinned 24.13.0.
- Chromium needed system libraries in this environment, installed with `playwright install-deps chromium`, as CI does with `--with-deps`.
