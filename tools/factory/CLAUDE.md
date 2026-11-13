# Factory Member Instructions

@.specify/memory/constitution.md

This directory is an independent Spec Kit project within the shared Nx workspace.
For member features, use this directory's `.specify/`, `.claude/skills/`, and `specs/`.
The root `CLAUDE.md` supplies shared instructions and the Nx plugin guidance.
Before running a workflow, confirm that `SPECIFY_INIT_DIR` is unset or targets this directory.
For workspace-wide changes, select the root Spec Kit project explicitly.
Run Nx verification commands from the repository root using the member's project name.
Keep project and feature selection separate. Do not reuse another project's feature pointer.
