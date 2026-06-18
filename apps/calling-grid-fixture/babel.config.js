module.exports = {
  plugins: [['@babel/plugin-proposal-decorators', {legacy: true}], '@emotion'],
  presets: [
    ['@babel/preset-react', {importSource: '@emotion/react', runtime: 'automatic'}],
    '@babel/preset-typescript',
    ['@babel/preset-env', {modules: false, useBuiltIns: 'usage', corejs: {version: '3'}}],
  ],
};
