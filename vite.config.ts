import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // The search index data (regenerated on every content edit) and
            // MiniSearch get their own chunk, so a content change does not
            // invalidate the cached AlgorithmIndex / GraphExplorer code.
            { name: 'atlas-search', test: /src[\\/]generated[\\/]content-search|node_modules[\\/]minisearch|src[\\/]lib[\\/]atlas[\\/]searchClient/ },
          ],
        },
      },
    },
  },
})
