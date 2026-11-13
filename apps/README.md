# Applications

Place future deployable applications in `apps/<product>/`.
Register each application as an npm workspace with `type:app` and a runtime tag.
Applications can consume libraries but cannot consume other applications or factory tooling.
The first application will establish rendering conventions before custom generators are built.
After Nx generates an application, initialise its independent Claude Spec Kit project inside that application directory.
Keep its specifications local and reference the root engineering principles explicitly from its constitution.
