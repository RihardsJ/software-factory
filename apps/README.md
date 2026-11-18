# Applications

Place future deployable applications in `apps/<product>/`.
Register each application as an npm workspace with `type:app` and a runtime tag.
Applications can consume libraries but cannot consume other applications or factory tooling.
The first application will establish rendering conventions before custom generators are built.
