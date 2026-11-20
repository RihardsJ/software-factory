# Software Factory

A software factory built on Claude Code: people write specs and checks, and agents write code in a loop until the checks pass.
It installs on top of an existing project. It does not set one up.

## Status

Working: refining an idea, planning it into tickets with a lint and a review gate on every document, building one ticket at a time, and a status view.
Not built yet: a web panel, publishing tickets to GitHub issues, browser checks by an agent, and scenarios kept out of the builder's reach.

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
| `factory run <text>` | In a project: idea, plan and build in one go. Each step stops the run if its gate fails |
| `factory idea <text>` | In a project: refines a sentence into `specs/idea.md` without asking anything, and lists every decision it made for you. `--interview` asks you instead |
| `factory plan` | In a project: stories, intel, tickets, ticket review. Stops for you only when the stories have open questions |
| `factory build [n]` | In a project: the Ralph loop. One ticket per fresh run until none are left, at most `n` (default 25) |
| `factory status` | In a project: each document and its gate, the ticket board, what is running, the latest run's events. `--watch` follows it |
| `factory stop` | In a project: stops the run in progress and the agent or check it started. Nothing else on the machine is touched |
| `factory update` | Pulls the latest factory into `~/.software-factory` |
| `factory -v` | Shows the version, as the number in `VERSION` and the commit it was built from |

`factory new` creates a local Git repository only. It does not create a GitHub repository.
Setup belongs to the template: when the new project has an executable `setup.sh`, the command runs it. The template's script installs dependencies and the test browser, then runs the check command, which takes a few minutes.
A shell script cannot change the folder of the shell that started it, so `cd` into the project afterwards.
Set `FACTORY_TEMPLATE` to a Git URL or path to start from a different template.

After `factory update`, the next `factory` command you run in a project brings that project's copy in step and commits the change. Set `FACTORY_PIN=1` to keep a project on the copy it has.

## How a project gets built

People write the idea and approve the stories. Scripts decide which step runs next and whether work is accepted. An agent does one step in a fresh context and stops.

### In one command

`factory run "a sentence about what you want"` does all of it: refine the idea, plan it into reviewed tickets, then loop over the tickets until none are left. It stops early only when a gate fails or the stories have a question for you. Use the separate commands below when you want to read the idea before anything is planned.

### Plan

Start with `factory idea "a sentence about what you want"`. It fills the gaps itself, with the simplest conventional choice for each, and writes `specs/idea.md`. Every decision it made that you did not state is listed under Assumptions, so checking the idea is one read. Only what cannot be chosen without facts you hold stays under Undecided.

Every agent runs headless, as `claude -p` started by a script with a fixed prompt, limited tools and a spending cap. Nothing opens an interactive session unless you ask for one with `factory idea --interview`.

`factory idea` with no text refines an idea already in `specs/idea.md`, and refuses when there is none. `factory idea --interview` asks you the questions one at a time instead of deciding for you.

Then run `factory plan` from the project root. It stops whenever it needs you, and continues from what is on disk when you run it again.

| Step | Who | Writes | Lint (a script) | Review (a fresh agent run) |
| --- | --- | --- | --- | --- |
| Idea | The refiner, or you | `specs/idea.md` | Every section filled, no template placeholders, no words that cannot be checked, at most three Undecided | Faithful to what you asked, nothing invented, every rule checkable, edges covered, no contradictions |
| Stories | Strategist | `specs/stories.md` | Unique story numbers, every story has `WHEN ... THEN ...` lines | Every capability, rule and "Done means" line of the idea is covered; nothing invented; ranks fit |
| Approval | The script, or you | `Status: approved` | No open questions: approved automatically. Any open question: it stops for you | |
| Intel | Scout | `specs/intel.md` | It names the project's check command | |
| Tickets | Strategist | `tickets/NNN-*.md` | Every Must and Should acceptance line appears in exactly one ticket, word for word; dependencies point to earlier tickets that exist | Nothing invented, nothing already built, one behaviour per ticket, each ticket stands alone |

Each document passes a gate before the next step reads it. The lint runs first because it costs nothing; the review is a separate agent run that did not write the document. A failed gate sends the findings back to the writer, for up to three rounds. If it still fails, planning stops, and `factory build` refuses tickets that did not pass. Each review is kept beside its document: `specs/idea.review.md`, `specs/stories.review.md`, `tickets/review.md`.

The idea is judged again whenever you edit it, so a hand-written or hand-corrected idea goes through the same gate.

### Watching it

`factory status` shows each document with its gate result, the ticket board, whether anything is running, and the latest run's events. `factory status --watch` refreshes it every three seconds; run it in a second terminal while `factory plan` or `factory build` works.

To stop a run, press Ctrl+C in its terminal, or run `factory stop` from the project in another one. No run is endless: the loop ends at its ticket cap, each ticket at its attempt cap, each planning document at its round cap, and each agent run at its spending cap.

Each run keeps every agent reply, check output and an `events.log` under `factory/runs/<time>/`, which Git ignores. The documents themselves are committed at each step, so `git log` is the history of what the factory produced.

### Build

Run `factory build` from the project root, with a clean working tree. This is a Ralph loop: the same builder prompt, run again and again, each time in a fresh context, one ticket per run. What earlier runs did is on disk, in the tickets, `tickets/memory.md` and Git, so no run needs the context of the one before. The project's check command is the backpressure.

It differs from the plainest Ralph loop in three ways. The script picks the next ticket, so the order never depends on an agent's choice. The script runs the check command and decides whether work is accepted, so an agent cannot declare itself done. And a second fresh run reviews each ticket before it is committed.

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
| `FACTORY_APPROVE` | `auto` | `manual` makes `factory plan` always stop for you to approve the stories |
| `FACTORY_REVIEW_ROUNDS` | 3 | Writer and reviewer rounds for each planning document before the run stops |
| `FACTORY_MAX_TICKETS` | 25 | The loop's cap: tickets per `factory build`, also its first argument |
| `FACTORY_MAX_ATTEMPTS` | 3 | Builder attempts per ticket |
| `FACTORY_BUDGET_USD` | 5 | Spending cap for each agent run |
| `FACTORY_MODEL` | Claude Code's default | Model for every agent run |
| `FACTORY_PIN` | unset | Set it to stop a project's copy of the factory being updated automatically |

### Where the ideas come from

| Idea | Source |
| --- | --- |
| A fresh context per step, with state on disk | Geoffrey Huntley's Ralph loop |
| Refining an idea makes it clearer, never different; everything the person did not say is listed as an assumption | super-simple-software-factory |
| Informed guesses recorded as assumptions, at most three open questions, a fixed list of gaps to scan | GitHub Spec Kit |
| One question at a time with a suggested answer; out of scope stated every time; no guessing when the ask is too thin | Addy Osmani's agent skills |
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
