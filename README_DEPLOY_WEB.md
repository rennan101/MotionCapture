# Motion Forge — Web deploy notes

This repo is a monorepo. The web app is the only part intended for Vercel right now.

## What gets deployed

- `apps/web` is a Vite + React SPA.
- The production build is `pnpm --silent build:web` from the repo root.
- Output: `apps/web/dist/index.html` + hashed JS/CSS + the FBX templates under `apps/web/dist/models/`.

So on Vercel you point the project at the monorepo root and set the web app as the frontend output.

## Vercel settings

- Install command: `pnpm install`
- Build command: `pnpm install && pnpm --silent build:web`
- Output directory: `apps/web/dist`
- Framework preset: `Other` / `Custom`, not Next.js
- Environment variables: none are currently required for the default web build

## Important caveats

- The web app is camera-only in the browser. Webcam features depend on the visitor's device and browser permissions.
- MediaPipe assets are loaded at runtime from public CDNs (`@mediapipe/tasks-vision` WASM + the pose landmarker model). That means the deployed app is not fully offline by default.
- The default characters (Eric/Carla) are bundled FBX files in `apps/web/public/models` and therefore ship inside `apps/web/dist/models`. They are not fetched at runtime.
- Custom FBX import is a runtime file load from the user's machine. That path does not require any server upload.

## Recommended first deploy

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Keep the default root project root.
4. Set the build/output above.
5. Deploy.
6. Open the production URL and verify:
   - the page loads
   - the character loads
   - the provider selector renders
   - the camera button exists and requests permission on click

If you want the web app to be the canonical "public" face of the project, it is cleaner to keep the web app deployable by itself and treat the desktop app as a separate artifact.

## If Vercel builds fail

Likely causes:

- pnpm version mismatch on the Vercel build image
- lockfile/platform issues in the build container
- FBX assets or gitignored artifacts not present in the pushed commit

Before debugging the platform, confirm that `pnpm --silent build:web` still succeeds locally and that `apps/web/dist/index.html` is present after the build.
