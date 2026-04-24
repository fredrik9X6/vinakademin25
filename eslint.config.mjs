import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    ignores: ['src/payload-types.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@next/next/no-assign-module-variable': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/alt-text': 'warn',
      'prefer-const': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'eslint-comments/no-unused-disable': 'off',
      // Server code uses the pino logger from src/lib/logger.ts; console.warn/error
      // are permitted as last-resort fallbacks. Client components keep full console access
      // via the override below.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Allow raw console.* in client-only directories — browser devtools is the right destination.
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/context/**/*.{ts,tsx}',
      'src/app/(frontend)/**/*.{ts,tsx}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // CLI scripts legitimately print to stdout as their primary UX.
    files: ['scripts/**/*.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },
]

export default eslintConfig
