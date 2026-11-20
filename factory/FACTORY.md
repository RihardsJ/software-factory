# Software factory

This project has a software factory installed under `factory/`.

- The project's commands, including its check command, are recorded in the project's `AGENTS.md` or `CLAUDE.md`. Read them there. Do not assume them.
- Work counts as done only when the project's check command passes.
- `specs/idea.md` is written by a person. `specs/stories.md` is drafted by the factory and approved by a person. `specs/intel.md` and `tickets/` are written by the factory.
- `factory/plan.sh` and `factory/build.sh` decide which step runs next and whether work is accepted. An agent started by them does one step and stops.
- Files listed in `factory/.installed` belong to the factory and are replaced on update. Do not edit them here; change them in the factory repository.
