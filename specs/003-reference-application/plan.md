# Plan: Reference Application Setup

1. Select the pinned Node.js environment and install matching Nx web tooling through `nx add`.
2. Inspect generator options and implementation, preview the application, and generate it without interactive prompts.
3. Configure the application, strict browser types, test tooling, and an independent Spec Kit member.
4. Implement the scene lifecycle, accessible controls, error feedback, and responsive layout.
5. Add lifecycle unit tests and real-browser smoke tests, then include their targets in CI.
6. Run clean installation, all quality targets, and a visual browser check.
7. Review the diff and record executed checks and remaining limits.

Keep factory tooling on Node.js and browser runtime code within the application project.
Adapt generated files to the existing npm workspace and Nx dependency rules.
Retain the full quality workflow and local cache policy.
