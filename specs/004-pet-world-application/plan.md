# Plan: Pet World Application Setup

1. Read the generator schema and run a dry run with the workspace defaults, `--useProjectJson=false`, and no linter, formatter, or e2e project.
2. Generate the application, then adapt it to `apps/reference`: package-based Nx configuration, matching TypeScript, Vite, and Playwright files.
3. Remove generated items that diverge from the workspace: the root `vitest.config.mts`, separate Vite and Vitest plugin registrations,
   Babel and SWC configuration, the custom element starter, and the favicon.
   Add `apps/pet-world/**/*` to the existing `@nx/vite` and `@nx/playwright` plugin includes instead.
4. Use ports 4201 for development and 4301 for preview so both applications can run together.
5. Initialise Spec Kit with `npm run specify -- init apps/pet-world --integration claude --script sh --force --non-interactive`.
6. Add `npm run dev:pet-world`, widen `npm run e2e` to every browser target, and update the README and agent guidance.
7. Extend the factory Spec Kit scoping tests to the new member.
8. Run the complete workspace check and review the diff.
