# Motion Forge — Web preview setup

## How to reproduce the uncommitted artifacts

This workspace already contains the web app source and workspace config:

- `package.json`
- `pnpm-workspace.yaml`
- `apps/web/package.json`
- `apps/web/index.html`
- `apps/web/src/`

What you must do before the app can run:

1. Keep dependencies installed with the project's package manager:
   - `pnpm install`

2. Keep the workspace build scripts enabled:
   - `esbuild` postinstall must be allowed in pnpm (this workspace uses `allowBuilds: esbuild: true`)

No `.env.local` is required for the current web app.

## How to run the server

From the workspace root:

```sh
pnpm dev:web
```

That runs `pnpm -C apps/web dev`, which starts the Vite dev server for `apps/web`.

Default Vite port for this project: `5173`.

If that port is already in use, start on a free port instead:

```sh
pnpm --silent dev:web -- --port <free-port>
```

## Preview notes

- The app entry is `apps/web/index.html`.
- The live preview should point at the Vite dev server URL, not at the static `index.html`.
- If running on a different port, update the preview URL to match.
