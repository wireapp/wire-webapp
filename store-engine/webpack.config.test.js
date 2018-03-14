const webpackConfig = require('./webpack.config');

module.exports = Object.assign(webpackConfig, {
  externals: {
    'fs-extra': '{}',
  },
});
