const pkg = require('./package.json');
const TerserJSPlugin = require('terser-webpack-plugin');
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
      new TerserJSPlugin({
        /* Dexie has issues with Terser */
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
