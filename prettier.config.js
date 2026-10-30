module.exports = {
  arrowParens: 'avoid',
  bracketSpacing: false,
  overrides: [
    {
      files: ['*.json'],
      options: {
        printWidth: 200,
      },
    },
  ],
  printWidth: 120,
  proseWrap: 'never',
  singleQuote: true,
};
