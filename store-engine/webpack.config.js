const pkg = require('./package.json');
const webpack = require('webpack');

const projectName = pkg.name.replace('@wireapp/', '');

module.exports = {
  devtool: 'source-map',
  entry: {
    [`${projectName}.demo`]: `${__dirname}/src/demo/index.js`,
    [`${projectName}.test`]: `${__dirname}/src/main/index.test.browser.js`,
    [projectName]: `${__dirname}/${pkg.main}`,
  },
  externals: {
    'fs-extra': '{}',
  },
  node: {
    path: 'empty',
  },
  output: {
    filename: '[name].bundle.js',
    library: 'StoreEngine',
    path: `${__dirname}/dist`,
    publicPath: '/',
  },
  plugins: [new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`)],
};
