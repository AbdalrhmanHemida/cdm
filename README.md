# cdm

## Branching and deployment workflow

1) Work on `develop` and keep it up to date.
2) When you are ready to publish, open a Pull Request from `develop` → `main`.
3) Review and merge the PR. Pushing to `main` triggers GitHub Actions to build and deploy to Pages.

Notes:
- `vite.config.ts` uses `base: '/cdm/'` (project page). If you convert to a user/organization page, change it to `'/'`.
- The workflow builds with pnpm and deploys the `dist` folder.

## How to release

- From `develop`: create PR to `main`, merge it. That’s it—deployment is automatic.
- For hotfixes: branch from `main`, PR back to `main`, then cherry-pick to `develop`.

## One-time GitHub settings

- Settings → Pages → Build and deployment: set to “GitHub Actions”.
- Settings → Actions → General: ensure workflows can deploy (read/write if org policy requires).

## Local commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## 404 handling and service worker

- `public/404.html` handles GitHub Pages deep links and redirects to `/cdm/` root.
- `public/sw.js` is registered in the app for basic offline caching. Adjust or remove as needed.

