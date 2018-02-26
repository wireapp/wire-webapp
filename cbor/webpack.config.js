const pkg = require('./package.json');
const webpack = require('webpack');

const projectName = pkg.name.replace('@wireapp/', '');

module.exports = {
  devtool: 'source-map',
  entry: {
    [projectName]: `${__dirname}/${pkg.main}`,
  },
  output: {
    filename: '[name].bundle.js',
    library: projectName.toUpperCase(),
    libraryTarget: 'var',
    path: `${__dirname}/dist`,
  },
  plugins: [new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`)],
};
