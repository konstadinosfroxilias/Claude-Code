import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vitejs.dev/config/
//
// base: './'        → relative asset paths
// viteSingleFile()  → inlines ALL JS + CSS into a single dist/index.html,
//                     so the production build opens by double-clicking the
//                     file directly (file://) — no local server required.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    // inline everything so dist/index.html is fully self-contained
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
  },
})
