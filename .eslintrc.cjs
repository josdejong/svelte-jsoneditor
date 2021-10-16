module.exports = {
  root: true,
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['svelte3'],
  parser: '@typescript-eslint/parser',
  ignorePatterns: ['*.cjs'],
  overrides: [
    { files: ['*.svelte'], processor: 'svelte3/svelte3' },
    {
      files: ['**/*.ts', '**/*.tsx'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      plugins: ['@typescript-eslint']
    }
  ],
  settings: {
    'svelte3/typescript': () => require('typescript')
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2019
  },
  env: {
    browser: true,
    es2017: true,
    node: true,
    mocha: true
  },
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
}
