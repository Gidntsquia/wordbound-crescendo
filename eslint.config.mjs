import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/recordings/**',
      '.cache/**',
      'public/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
      // These are React Compiler static-analysis diagnostics that
      // eslint-plugin-react-hooks v7 folded into "recommended". This repo
      // doesn't run the React Compiler babel plugin, and RoundSandbox's
      // ref-based state (fight.current read in the render body) predates
      // it -- off rather than a from-scratch rewrite of that architecture.
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Node-run scripts, not the bundled app: CJS require() is expected here.
    files: ['tools/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'none', args: 'none' },
      ],
    },
  },
  eslintConfigPrettier,
);
