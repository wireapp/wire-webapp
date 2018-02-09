const pkg = require('./package.json');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  entry: {
    filename: `${__dirname}/dist/commonjs/index.js`,
  },
  externals: {
    dexie: 'Dexie',
    'fs-extra': false,
  },
  node: {
    fs: 'empty',
    path: 'empty',
  },
  output: {
    filename: `${pkg.name.substr(pkg.name.indexOf('/') + 1)}.js`,
    library: 'cryptobox',
    path: `${__dirname}/dist`,
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 100,
    maxEntrypointSize: 300,
  },
  plugins: [new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`)],
  target: 'web',
};
