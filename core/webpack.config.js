const pkg = require('./package.json');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const webpack = require('webpack');

const projectName = pkg.name.replace('@wireapp/', '');

module.exports = {
  devtool: 'source-map',
  entry: {
    [projectName]: `${__dirname}/${pkg.main}`,
    [`${projectName}.test`]: `${__dirname}/src/main/index.test.browser.js`,
  },
  externals: {
    'fs-extra': '{}',
  },
  mode: 'production',
  node: {
    fs: 'empty',
    path: 'empty',
  },
  optimization: {
    minimizer: [
      new UglifyJSPlugin({
        /* Dexie has issues with UglifyJS */
        exclude: /dexie/g,
        sourceMap: true,
      }),
    ],
    splitChunks: {
      cacheGroups: {
        dexie: {
          chunks: 'initial',
          enforce: true,
          name: 'dexie',
          priority: 2,
          test: /dexie/,
        },
      },
    },
  },
  output: {
    filename: '[name].bundle.js',
    library: projectName,
    path: `${__dirname}/dist`,
  },
  plugins: [new webpack.BannerPlugin(`${pkg.name} v${pkg.version}`)],
};
