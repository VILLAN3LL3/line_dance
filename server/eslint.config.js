import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist', 'coverage', 'line_dance.db', 'dance_groups.db', '**/*.db', 'test-temp'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts'] })),
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.ts'],
    rules: { 'no-unused-vars': 'off' },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    },
  },
  {
    files: [
      'routes/dance-courses.js',
      'routes/dance-groups.js',
      'routes/course-pdf.js',
      'routes/choreography-ratings.js',
      'routes/choreography-metadata.js',
      'routes/sessions.js',
      'routes/step-figure-suggestions.js',
      'routes/saved-filters.js',
      'routes/step-figures.js',
      'routes/choreographies.js',
      'routes/choreography-search.js',
      'routes/url-check.ts',
      'routes/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/scripts/db.js', '**/scripts/db.ts', 'sqlite3'] },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use an application flow.' }],
    },
  },
  {
    files: [
      'features/**/*flow.{js,ts}',
      'features/**/*validation.{js,ts}',
      'features/**/*operations.{js,ts}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['**/scripts/db.js', '**/scripts/db.ts', 'sqlite3', 'express', '**/routes/**'],
        },
      ],
    },
  },
  {
    files: ['features/**/*validation.{js,ts}', 'features/**/*operations.{js,ts}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/scripts/db.js',
            '**/scripts/db.ts',
            'sqlite3',
            'express',
            '**/routes/**',
            '**/*repository.js',
            '**/*repository.ts',
            '**/*flow.js',
            '**/*flow.ts',
            '**/*gateway.js',
            '**/*gateway.ts',
          ],
        },
      ],
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Operations must be pure.' }],
    },
  },
];
