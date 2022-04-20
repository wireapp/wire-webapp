const presetEnvConfig = {
  corejs: 'core-js@2',
  debug: false,
  modules: false,
  targets: {
    browsers: ['chrome >= 51', 'firefox >= 60', 'edge >= 15', 'opera >= 43'],
  },
  useBuiltIns: 'usage',
};

module.exports = {
  env: {
    test: {
      plugins: [
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-nullish-coalescing-operator',
        '@babel/plugin-proposal-optional-chaining',
        '@emotion',
      ],
      presets: [
        ['@babel/preset-react', {importSource: '@emotion/react'}],
        '@babel/preset-typescript',
        ['@babel/preset-env', {...presetEnvConfig, modules: 'commonjs'}],
      ],
    },
  },
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-syntax-dynamic-import',
    '@emotion',
  ],
  presets: [
    ['@babel/preset-react', {importSource: '@emotion/react', runtime: 'automatic'}],
    '@babel/preset-typescript',
    ['@babel/preset-env', presetEnvConfig],
  ],
};
