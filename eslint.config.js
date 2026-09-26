import js from '@eslint/js'
import globals from 'globals'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { recommended } from '@vitavision/config-eslint'

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
      // useThemeVariant / useFormControlMode are hooks (not components) but
      // live alongside their *Provider component — explicitly allow them.
      'react-refresh/only-export-components': ['error', {
        allowConstantExport: true,
        allowExportNames: ['useThemeVariant', 'useFormControlMode'],
      }],
    },
  },
])
