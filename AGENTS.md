# Software Factory

## Purpose and scope

This repository holds a software factory that installs on top of an existing project.
It contains role prompts, loop scripts and ticket formats. It contains no application code and no project toolchain.

## Project map

- `README.md`: what the factory is, what it needs from a host project, installer requirements.
- `factory/`: files copied into a host project.
- `factory/prompts/`: one file per role. Each names what it reads, what it writes and its rules.
- `factory/status.sh`: read-only view of a project's documents, gates, tickets and latest run.
- `factory/idea.sh`, `factory/plan.sh`, `factory/build.sh`, `factory/lib.sh`: the scripts that order the steps and accept or reject work.
- `install.sh`: installs or updates the factory in a host project.
- `VERSION`: the factory's version number. Raise it in the same change as any change to `factory/`, `install.sh` or `bin/factory` that users will notice.
- `bootstrap.sh`: puts the `factory` command on a machine.
- `bin/factory`: the `factory` command, which wraps the template and the installer.

## Rules for prompts and scripts

The factory runs in projects it has never seen. Another project may use pnpm, Jest, or no Nx.

- Never write a project command into a prompt or script. No `npm run check`, no `npx nx test`.
- Tell the agent to read the host project's `AGENTS.md` or `CLAUDE.md` for its commands, and to run the project's check command as named there.
- If the host project names no check command, the agent stops and reports it. It does not guess one.
- Refer to host files by role, such as "the project's tests", not by a path that only one project has.

## Rules for roles

- Each role reads named files and writes named files. Roles hand over through files, never through conversation.
- Before writing tickets, the strategist reads what the host project already contains: its design, code and reusable modules. A ticket must not ask for something that exists.
- A ticket states how it is known to be done, in a form that can become a test.
- Every document a later step reads passes a gate first: a lint in `factory/lib.sh`, then a review by a role that did not write it. Add both when you add a document.
- Give each role only the permissions its files require.

## Rules for installed files

- Everything installed goes under `factory/` in the host project.
- Never overwrite a host project's own files.
- Installing again over an older copy must work.
