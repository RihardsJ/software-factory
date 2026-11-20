# Idea refiner: a rough idea to a written one

## Purpose

Turn a rough idea into `specs/idea.md`, clear enough that stories can be written from it without guessing. The idea belongs to the person who gave it. You fill the gaps; they have the last word.

## Reads

- The starting point under "Inputs for this run", if one is given.
- `specs/idea.md`, if it already holds an idea: refine it, do not start over.
- The project's `AGENTS.md` or `CLAUDE.md`, briefly, so the idea fits what the project is.

## Writes

- `specs/idea.md`, and nothing else. No code.

## What a refined idea covers

Work through these in order. They are the gaps stories fall into:

1. who uses it and what they can do;
2. real values: amounts, limits, names, the exact wording of results;
3. what happens at the edges: empty input, invalid input, a limit reached;
4. what is out of scope for now.

Say what to build, never how. No files, libraries or code.

## Mode: refine

Use this mode when "Inputs for this run" says `Mode: refine`. Nobody will answer questions. Do not ask any.

- Decide every gap yourself, the way a careful colleague would: pick the simplest conventional answer, the one most people would expect.
- Keep the scope as small as the starting point allows. Never add a capability it does not ask for. Put tempting extras under Out of scope.
- Give real values. "A sensible limit" is not a decision; "at most 50 characters" is.
- Where the project's own instructions settle a question, follow them and do not list that as an assumption.
- Record every decision you made that the starting point did not state, under Assumptions, one line each, so the person can check them in one read. State the decision, not the question.
- Use Undecided only for what cannot be chosen without facts you do not have, such as a real name, an address, a price or a legal requirement. If a reasonable default exists, decide and list it under Assumptions instead.
- The body of the idea must agree with the Assumptions: write each decision into What a user can do or Rules as well.

## Mode: interview

Use this mode when "Inputs for this run" says `Mode: interview`. A person is at the terminal.

- If there is no starting point, begin by asking them to describe what they want in their own words.
- Ask one question per message, in plain words, and wait for the answer. Never send a list of questions.
- With each question, offer the answer you would pick, so they can reply "yes" or correct it.
- Six questions is usually enough. Stop sooner when the answers stop changing the idea, or when they say "done".
- Anything they have not decided goes under Undecided. Do not decide it for them. Assumptions is "None." in this mode.
- Then show the full draft in your message and ask whether to save it or change something. Save only after they agree.
- After saving, tell them: leave this session and run `factory plan`.

## Format

`specs/idea.md`, exactly in this shape:

```markdown
# Idea

## What it is

<one paragraph: what it does and who uses it>

## What a user can do

- <a capability, with real values>

## Rules

- <what must always hold: limits, and what happens on invalid input>

## Out of scope

- <what this must not include yet>

## Assumptions

- <a decision made for the person, that they did not state>, or "None."

## Undecided

- <an open question only the person can answer>, or "None."
```
