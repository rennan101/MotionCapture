# Motion Forge — Web preview setup

Last validated after Sprint 4 close-out (provider-gated pipeline + low-confidence handling + error banner).

Force flag added to the web dev script to reduce stale module graph issues during iterative preview work.

Current active preview URL: http://localhost:5173
Process: launchd job `motionforge-static-server` (static file server serving apps/web/dist)
Static server entry: /tmp/stay-alive-server.js

Verified:
- `apps/web` typecheck passes with `node node_modules/typescript/bin/tsc --noEmit`
- production build passes with `node node_modules/vite/bin/vite.js build`
- served bundle matches disk build (index.html points to current hashed assets; main JS byte-for-byte identical to dist)

Static server start (when the preview needs to be re-launched from scratch):

```sh
cd /Users/rennan/Documents/Websites_Work/MotionCapture
launchctl remove motionforge-static-server 2>/dev/null
launchctl submit -l motionforge-static-server -- /bin/sh -c \
  "export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin; \
   node /tmp/stay-alive-server.js > /Users/rennan/Documents/Websites_Work/MotionCapture/.freebuff/preview-f1957dea-276c-4a43-b29a-4b2bf8c97765.log 2>&1"
```

The static server reads `apps/web/dist/index.html` and serves the hashed assets from
`apps/web/dist/assets` on port 5173. When a new production build changes the asset hashes,
rebuild and restart the static server.

## Filesystem stability note

The dev server is occasionally killed by OS-level EAGAIN/EIO reads on files under
`node_modules/.pnpm` and built-in chunks. The recurring shape is:

- a launchd-hosted Vite process fails at `extractExportsData` with
  `Unknown system error -11` while reading a cached pnpm-vendor chunk
- the same holds for `pnpm-lock.yaml` and `node_modules/.modules.yaml` in the
  moments right after `pnpm add` rewrites them

Practical recovery, in order:

1. Re-materialize the files that failed to read:
   ```sh
   cd /Users/rennan/Documents/Websites_Work/MotionCapture
   cat pnpm-lock.yaml node_modules/.modules.yaml > /dev/null 2>&1
   ```
   If that still fails, rewrite each one with `cp "$f" /tmp/keep-$(basename "$f") && cp /tmp/keep-$(basename "$f") "$f"`.
2. If the chunk itself is unreadable, rewrite it the same way from `/tmp`.
3. Restart the preview:
   ```sh
   launchctl remove motionforge-static-server 2>/dev/null
   launchctl submit -l motionforge-static-server -- /bin/sh -c \
     "export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin; \
       node /tmp/stay-alive-server.js > /Users/rennan/Documents/Websites_Work/MotionCapture/.freebuff/preview-f1957dea-276c-4a43-b29a-4b2bf8c97765.log 2>&1"
   ```
4. Confirm readiness:
   ```sh
   sleep 10
   curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 http://localhost:5173/
   ```
   Expect `HTTP 200`. A fresh reload in the Preview tab is usually also needed after
   the dev server restarts, because the in-memory client can hold a stale error page.

Do not rely on `nohup ... & disown` for this server here — the runner can reap the
process group and the preview will look healthy for a few seconds before the OS reaps
it. The launchd path is the one that survives this host.

## Current sprint status

Web: Sprint 9 closed (GLB export + inline export-done confirmation in ClipPanel). Work
resumed into Sprint 10 (web hardening and readiness) — doc rewritten to concrete web
scope; camera/UX, worker reliability, and local-only clarity are IMPLEMENT, diagnostics
is PARTIAL, WebGPU inference is PARTIAL (kept as the MediaPipe GPU→CPU fallback path),
and quality profiles / cross-device matrix / hand-face / direct FBX on web are deferred.
