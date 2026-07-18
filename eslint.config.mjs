import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'hosting/**',
      'dist/**',
      'scripts/**',
      'prisma/migrations/**',
      'next-env.d.ts',
      'public/**',
    ],
  },
  {
    rules: {
      // Valid client hydration from localStorage/sessionStorage (React 19 compiler rule is too strict here)
      'react-hooks/set-state-in-effect': 'off',
      // Local/public assets and blob previews — OptimizedImage covers remote product photos
      '@next/next/no-img-element': 'off',
    },
  },
]

export default eslintConfig
