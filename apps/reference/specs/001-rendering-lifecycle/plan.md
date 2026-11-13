# Plan: Rendering Lifecycle

Keep scene ownership in `src/scene.ts` and DOM controls in `src/app.ts`.
Use a renderer interface as a test seam, while browser checks use the actual Three.js renderer.
Use Three.js animation-loop ownership and explicit resource-release callbacks.
Keep unit and browser configurations separate from browser source types.
Run Playwright through the Nx browser target against the production build.
Let Playwright own the Vite preview process directly so cleanup also stops the server.
Use software WebGL in Chromium so local and CI machines do not need a physical GPU.
