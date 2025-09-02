import { defineConfig } from 'vite';

export default defineConfig({
  // If this repo is a project page (user.github.io/REPO):
  base: '/cdm/',
  // If this repo is a user/organization page (user.github.io): use base: '/'
  build: { outDir: 'dist', emptyOutDir: true },
});