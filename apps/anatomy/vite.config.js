import { defineConfig } from 'vite'
import path from 'node:path'
import { assertDistributionClean } from '../../licensing/tools/check-distribution.mjs'

// Licence quarantine (licensing/quarantine-policy.json): the build fails closed if public/ or the
// produced dist/ contains withheld anatomy, so a stale or restored file can never be published.
function licenceQuarantine() {
  let outDir = 'dist'
  return {
    name: 'medcoel-licence-quarantine',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir) },
    buildStart() { assertDistributionClean([path.resolve('public')], 'Atlas public/') },
    closeBundle() { assertDistributionClean([outDir], 'Atlas build output') }
  }
}

// Deployed as a GitHub Pages project site, so production is served from a
// sub-path. Asset URLs in JS are built from import.meta.env.BASE_URL — see
// src/utils/paths.js — because `base` alone does not rewrite string literals.
const REPO_BASE = process.env.ANATOMY_BASE || '/anatomy/viewer/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO_BASE : '/',
  plugins: [licenceQuarantine()],
  build: {
    target: ['es2022', 'safari16'],
    assetsInlineLimit: 0,
    // Never reuse a stale dist/ (it may hold files withdrawn by the licence quarantine).
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: false
  }
}))
