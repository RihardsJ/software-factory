# Software Factory

A software factory built on Claude Code: people write specs and checks, and agents write code in a loop until the checks pass.
It installs on top of an existing project. It does not set one up.

## Status

Working: planning (idea to reviewed tickets) and building (one ticket at a time, checked and reviewed before it is committed).
Not built yet: publishing tickets to GitHub issues, browser checks by an agent, and scenarios kept out of the builder's reach.

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
factory/        Files copied into a host project: role prompts, plan.sh, build.sh
install.sh      Installs or updates the factory in a host project
bin/factory     The `factory` command
bootstrap.sh    Puts the `factory` command on a machine
VERSION         The factory's version number
AGENTS.md       Rules for working on the factory itself
```

## Install the command

On a Linux machine, one command clones this repository to `~/.software-factory` and links `factory` into `~/.local/bin`:

```sh
curl -fsSL https://raw.githubusercontent.com/RihardsJ/software-factory/main/bootstrap.sh | bash
```

Running it again updates the clone. To read the script before running it, open [bootstrap.sh](bootstrap.sh); it does the same as these three commands:

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
| `factory new <name>` | Creates `./<name>` from [ts-project-template](https://github.com/RihardsJ/ts-project-template), names it, installs the factory, makes the first commit, then runs the project's `setup.sh` |
| `factory install [dir]` | Installs or updates the factory in an existing project, the current directory by default |
| `factory idea <text>` | In a project: refines a sentence into `specs/idea.md` without asking anything, and lists every decision it made for you. `--interview` asks you instead |
| `factory plan` | In a project: idea, stories, your approval, intel, tickets, ticket review |
| `factory build [n]` | In a project: builds up to `n` tickets (default 3), one at a time |
| `factory update` | Pulls the latest factory into `~/.software-factory` |
| `factory -v` | Shows the version, as the number in `VERSION` and the commit it was built from |

`factory new` creates a local Git repository only. It does not create a GitHub repository.
Setup belongs to the template: when the new project has an executable `setup.sh`, the command runs it. The template's script installs dependencies and the test browser, then runs the check command, which takes a few minutes.
A shell script cannot change the folder of the shell that started it, so `cd` into the project afterwards.
Set `FACTORY_TEMPLATE` to a Git URL or path to start from a different template.

To update a project, run `factory update`, then `factory install` in the project.

## How a project gets built

People write the idea and approve the stories. Scripts decide which step runs next and whether work is accepted. An agent does one step in a fresh context and stops.

### Plan

Start with `factory idea "a sentence about what you want"`. It fills the gaps itself, with the simplest conventional choice for each, and writes `specs/idea.md`. Every decision it made that you did not state is listed under Assumptions, so checking the idea is one read. Only what cannot be chosen without facts you hold stays under Undecided.

`factory idea` with no text refines an idea already in `specs/idea.md`. `factory idea --interview` asks you the questions one at a time instead of deciding for you.

Then run `factory plan` from the project root. It stops whenever it needs you, and continues from what is on disk when you run it again.

| Step | Who | Reads | Writes | Accepted when |
| --- | --- | --- | --- | --- |
| Idea | You, with `factory idea` or by hand | | `specs/idea.md` | The file exists and is not the untouched template |
| Stories | Strategist | the idea | `specs/stories.md` | Every story has a MoSCoW rank and `WHEN ... THEN ...` lines |
| Approval | You | the stories | `Status: approved` in that file | You changed the line. No change is never read as approval |
| Intel | Scout | the codebase, the project's instructions | `specs/intel.md` | It names the project's check command |
| Tickets | Strategist | stories, intel | `tickets/NNN-*.md` | Each has a story, `Status: todo` and `WHEN ... THEN ...` lines |
| Ticket review | A fresh run that did not write them | stories, intel, tickets | `tickets/review.md` | `Verdict: pass`. On a fail the strategist gets one round to fix the findings |

### Build

Run `factory build` from the project root, with a clean working tree.

1. Preflight: the script runs the project's check command. If it fails before any work, the run stops, because no builder could turn it green.
2. The script picks the lowest-numbered ticket with `Status: todo`.
3. A builder implements that ticket with tests. It may not touch `specs/`, `factory/` or any ticket.
4. The script, not the builder, decides what happens next:
   - protected files changed: they are restored and the builder tries again;
   - nothing changed: the builder tries again;
   - the check command fails: its output goes back to the builder;
   - the check passes: a reviewer in a fresh context, with read-only tools, rules on every "Done when" line against the staged diff.
5. Approved: the script marks the ticket done, ticks its boxes and commits. Then the next ticket.
6. Not accepted after three attempts: the work is thrown away, the ticket is marked blocked with the last feedback, and the run stops.

### Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `FACTORY_CHECK` | from `specs/intel.md` | Overrides the check command on a machine that cannot run the full one |
| `FACTORY_MAX_TICKETS` | 3 | Tickets per `factory build`, also its first argument |
| `FACTORY_MAX_ATTEMPTS` | 3 | Builder attempts per ticket |
| `FACTORY_BUDGET_USD` | 5 | Spending cap for each agent run |
| `FACTORY_MODEL` | Claude Code's default | Model for every agent run |

Each run keeps every agent reply and check output under `factory/runs/<time>/`, which Git ignores.

### Where the ideas come from

| Idea | Source |
| --- | --- |
| A fresh context per step, with state on disk | Geoffrey Huntley's Ralph loop |
| Scripts own the loop; agents work inside one step; checks run as code | super-simple-software-factory, Fabro |
| Preflight, fail-closed approval, bounded fix loops, a reviewer that treats work as unproven | Fabro |
| `WHEN ... THEN ...` scenarios as the contract between stories, tickets and review | OpenSpec |
| One work unit per run, a short memory file, no state change until validated, a no-progress stop | spec-kit-ralph, Ralphy-Spec |
| Thin vertical slices, tests first, review findings ranked by whether they block | Addy Osmani's agent skills, rrozza-kit |

## What the installer does

1. Stops with a message when the project has no `AGENTS.md` or `CLAUDE.md` containing the words "check command".
2. Removes the files a previous install put under `factory/`, then copies the current ones. Files the project created there are left alone.
3. Records the installed version and file list in `factory/.installed`.
4. Adds the line `@factory/FACTORY.md` to the project's `CLAUDE.md` once. If the project has no `CLAUDE.md`, it creates one that imports `AGENTS.md` and that file.

It changes nothing else in the project.
