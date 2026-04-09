import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// In dev mode: relax CSP for WASM and workers (production CSP is in public/_headers).
function devCspPlugin(): Plugin {
  return {
    name: 'dev-csp',
    transformIndexHtml(html: string) {
      return html
        .replace(
          "script-src 'self'",
          "script-src 'self' 'wasm-unsafe-eval'",
        )
        .replace("object-src 'none';", "object-src 'none'; worker-src 'self' blob:;")
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tsconfigPaths(),
    ...(command === 'serve' ? [devCspPlugin()] : []),
  ],
}))
