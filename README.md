# Software Factory

A software factory built on Claude Code: people write specs and checks, and agents write code in a loop until the checks pass.
It installs on top of an existing project. It does not set one up.

## Status

Nothing is installable yet. The first role, the strategist, is being built.

## How it fits with a project

The factory and the project are maintained separately.

| Thing | Owns | Changes |
| --- | --- | --- |
| The project | Its code, tests, toolchain, and the commands that check it | Rarely, mostly dependency updates |
| The factory | Role prompts, the loop script, ticket format, later hooks and agents | Often |

Any project can host the factory, whatever its language, package manager or test runner.
[ts-project-template](https://github.com/RihardsJ/ts-project-template) is one ready-made host.

## What the factory needs from a project

One thing: the project's commands are written down in `AGENTS.md` or `CLAUDE.md` at its root, including one check command that must pass before work counts as done.

The factory reads its commands from there. It never assumes them.

## Layout

Everything the factory installs lives under `factory/` in the host project, so it can be updated or removed without touching the project's own files.

```text
factory/        Files copied into a host project
AGENTS.md       Rules for working on the factory itself
```

## Installer requirements

The installer is not written yet. When it is, it must:

1. Stop with a clear message when the host project has no `AGENTS.md` or `CLAUDE.md` naming a check command.
2. Be safe to rerun, since updating an installed factory is the normal case.
3. Write only under `factory/`, and add one import line to the host's `CLAUDE.md` without replacing anything.
4. Record which factory version it installed.
