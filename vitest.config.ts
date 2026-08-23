import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./src/test/setup.ts"],
        // scripts/**/*.test.ts covers pure build-script helpers (e.g. narrative-build.ts)
        // that live outside src/ and aren't part of the tsc -b project (scripts/ runs
        // via `bun run`, not the Vite/tsconfig.app build).
        include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    },
});
