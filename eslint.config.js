import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noRemovedRegistryMethods from './eslint-plugins/no-removed-registry-methods.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'no-removed-registry-methods': {
        rules: {
          'no-removed-registry-methods': noRemovedRegistryMethods,
        },
      },
    },
    rules: {
      'no-removed-registry-methods/no-removed-registry-methods': 'error',
    },
  },
])
