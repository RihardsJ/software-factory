# Software Factory

A software factory built on Claude Code: people write specs and checks, and agents write code in a loop until the checks pass.
It installs on top of an existing project. It does not set one up.

## Status

The installer works. It installs the factory's rules for agents and nothing else yet: the first role, the strategist, is being built.

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
install.sh      Installs or updates the factory in a host project
bin/factory     The `factory` command
AGENTS.md       Rules for working on the factory itself
```

## Install the command

On a Linux machine, clone this repository to a fixed place and link the command onto your `PATH`:

```sh
git clone https://github.com/RihardsJ/software-factory.git ~/.software-factory
mkdir -p ~/.local/bin
ln -sf ~/.software-factory/bin/factory ~/.local/bin/factory
```

If `factory` is then not found, `~/.local/bin` is not on your `PATH`. Add it and open a new shell:

```sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

To give every user on the machine the command, link it into `/usr/local/bin` with `sudo` in place of `~/.local/bin`.

The command needs `git` and `bash`. Nothing is compiled or installed apart from the link.

## Use it

| Command | What it does |
| --- | --- |
| `factory new <name>` | Creates `./<name>` from [ts-project-template](https://github.com/RihardsJ/ts-project-template), names it, installs the factory, and makes the first commit |
| `factory install [dir]` | Installs or updates the factory in an existing project, the current directory by default |
| `factory update` | Pulls the latest factory into `~/.software-factory` |

`factory new` creates a local Git repository only. It does not create a GitHub repository, install dependencies or run checks; the new project's README covers those.
Set `FACTORY_TEMPLATE` to a Git URL or path to start from a different template.

To update a project, run `factory update`, then `factory install` in the project.

## What the installer does

1. Stops with a message when the project has no `AGENTS.md` or `CLAUDE.md` containing the words "check command".
2. Removes the files a previous install put under `factory/`, then copies the current ones. Files the project created there are left alone.
3. Records the installed version and file list in `factory/.installed`.
4. Adds the line `@factory/FACTORY.md` to the project's `CLAUDE.md` once. If the project has no `CLAUDE.md`, it creates one that imports `AGENTS.md` and that file.

It changes nothing else in the project.
