const pkg = require('./package.json');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  entry: {
    filename: `${__dirname}/${pkg.main}`,
  },
  output: {
    filename: `${pkg.name.substr(pkg.name.indexOf('/') + 1)}.js`,
    library: 'CBOR',
    libraryTarget: 'var',
    path: `${__dirname}/dist`,
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 36000,
    maxEntrypointSize: 36000,
  },
  plugins: [new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`)],
};
