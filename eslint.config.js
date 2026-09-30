import js from '@eslint/js'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { recommended, tokensOnly } from '@vitavision/config-eslint'

export default defineConfig([
  // ds-bundle/ and .ds-sync/ hold generated /design-sync output (the compiled
  // bundle and the staged converter scripts). Both are gitignored, so CI never
  // sees them, but eslint flat config does not read .gitignore — without this
  // a local `bun run lint` fails on generated code.
  globalIgnores(['dist', '.venv/**', 'py/**', 'ds-bundle/**', '.ds-sync/**', 'e2e/.screens/**', 'test-results/**']),
  js.configs.recommended,
  // The shared vitavision config: type-aware typescript-eslint, @eslint-react and the
  // hooks rules (@vitavision/config-eslint).
  ...recommended({ tsconfigRootDir: import.meta.dirname }),
  {
    // Build scripts, root config files and the design-sync previews sit outside the tsc
    // projects, so they get syntactic rules only (Node globals for the scripts).
    files: ['scripts/**', '*.config.{js,ts}', 'e2e/**', '.design-sync/**'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: { ...globals.node, Bun: 'readonly' },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  // Gate G5.1 (lab-ui PLAN §5, visual-language §7): in src/, colour comes from the
  // @vitavision/ui tokens or the editorial token layer (src/styles/editorial-tokens.css) —
  // no raw Tailwind palette classes, no hex literals. Tests are exempt by the rule.
  tokensOnly(['src/**']),
  {
    // Literal colours on purpose, one reason each:
    files: [
      // Build output of scripts/content-build.ts: Shiki writes its theme's colours inline.
      'src/generated/**',
      // Feature colours are data: stored on each feature, exported with it, shown as its swatch.
      'src/store/editor/featureColors.ts',
      // A printed target is black ink on white paper whatever the viewer's theme.
      'src/components/targetgen/printColors.ts',
      // The ChESS figure's SR/DR/MR hues: the article text names the terms by these colours.
      'src/components/illustrations/_shared/dataColors.ts',
    ],
    rules: { 'vitavision/tokens-only': 'off' },
  },
])
