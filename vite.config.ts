import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// In dev mode only: extend the CSP meta tag to allow the local backend.
// The production build keeps index.html untouched (tight CSP).
function devCspPlugin(): Plugin {
  return {
    name: 'dev-csp',
    transformIndexHtml(html: string) {
      return html
        .replace(
          "connect-src 'self'",
          "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000",
        )
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
