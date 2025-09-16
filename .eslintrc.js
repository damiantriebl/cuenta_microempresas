module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      },
    ],
    'no-unused-vars': 'off', // Turn off base rule as it conflicts with @typescript-eslint version
    'prefer-const': 'error',
    'no-unreachable': 'error',
  },
};
