# Software factory

This project has a software factory installed under `factory/`.

- The project's commands, including its check command, are recorded in the project's `AGENTS.md` or `CLAUDE.md`. Read them there. Do not assume them.
- Work counts as done only when the project's check command passes.
- Everything the factory produces lives under `work/`. Each feature is a folder in `work/features/` and each bug a folder in `work/bugs/`, numbered in the order they were asked for.
- Inside a folder: `request.md` is what a person asked for, `idea.md` what was agreed, `stories.md` the acceptance lines, `intel.md` what the scout found, `tickets/` the work, `acceptance.md` what an audit observed, and `summary.md` what was built. `work/memory.md` holds notes builders leave for each other.
- The scripts in `factory/` decide which step runs next and whether work is accepted. An agent started by them does one step and stops.
- Files listed in `factory/.installed` belong to the factory and are replaced on update. Do not edit them here; change them in the factory repository.
