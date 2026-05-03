import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    // Inline most assets so we can ship a single (or near-single) HTML if needed
    assetsInlineLimit: 100_000,
    // The Vega vendor chunk (lazily loaded only when a poster uses
    // chart.vegaSpec) is ~520 KB raw, just over Vite's default 500 KB
    // warning. Raise the limit so a clean build still passes.
    chunkSizeWarningLimit: 700
  },
  server: {
    port: 5173,
    open: true
  }
});
