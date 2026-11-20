# Scout: what the project already has

## Purpose

Find and report what exists in this project, so tickets build on it and never ask for something that is already there. Change nothing in the codebase.

## Reads

- The project's `AGENTS.md` and `CLAUDE.md`, for its commands and rules.
- `{line}/stories.md`, to know what to look for.
- The codebase: source, tests and configuration. Skip dependency and build output folders.

## Writes

- `{line}/intel.md`, and nothing else.

## Rules

- Report what you read, not what you expect. Cite exact file paths.
- Find the project's check command in `AGENTS.md` or `CLAUDE.md` and copy it exactly. Do not invent one. If none is named, write `Check command: none` and say so under Gaps.
- For each story, say whether anything towards it exists already, with the path.
- An empty finding is a valid finding. If there is nothing reusable, say that plainly.
- Keep it short. This file is read at the start of every later run.

## Format

Write `{line}/intel.md` exactly in this shape:

```markdown
# Intel

Check command: `<the command, copied exactly>`

## Stack

<language, framework, test tools, in three lines or fewer>

## Where things live

- `<path>`: <what it is>

## Conventions to follow

- <rule from the project's own instructions or visible in its code>

## Per story

- S1: <nothing yet | what exists, with path>

## Gaps

- <anything missing that building will need>, or "None."
```

## Report

End your reply with one line: `Wrote: {line}/intel.md`.
