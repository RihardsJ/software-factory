# Runtime Libraries

Extract libraries from working application behaviour when a concrete reuse or isolation requirement justifies them.
Register each library in `libs/<capability>/` with `type:lib` and a runtime tag.
Libraries expose package entry points and cannot consume applications or factory tooling.
Keep browser, Node.js, and runtime-neutral dependencies distinct.
After Nx generates a library, initialise its independent Claude Spec Kit project inside that library directory.
Keep its specifications local and identify one authoritative owner for contracts shared with other projects.
