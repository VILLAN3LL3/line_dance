import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['coverage', 'line_dance.db', 'dance_groups.db', '**/*.db', 'test-temp'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
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
    files: [
      'routes/trainers.js',
      'routes/dance-courses.js',
      'routes/dance-groups.js',
      'routes/course-pdf.js',
      'routes/choreography-ratings.js',
    ],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/scripts/db.js', 'sqlite3'] }],
    },
  },
  {
    files: ['features/**/*flow.js', 'features/**/*validation.js', 'features/**/*operations.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/scripts/db.js', 'sqlite3', 'express', '**/routes/**'] },
      ],
    },
  },
  {
    files: ['features/**/*validation.js', 'features/**/*operations.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '**/scripts/db.js',
            'sqlite3',
            'express',
            '**/routes/**',
            '**/*repository.js',
            '**/*flow.js',
          ],
        },
      ],
    },
  },
];
