/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = (env, argv = {}) => {
  const isDev = argv.mode !== 'production';

  return {
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx|js|jsx)$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({template: './index.html'}),
      ...(isDev ? [new webpack.HotModuleReplacementPlugin()] : []),
    ],
    devServer: {
      port: 5173,
      hot: true,
      open: false,
      historyApiFallback: true,
    },
    devtool: isDev ? 'eval-source-map' : false,
    mode: isDev ? 'development' : 'production',
  };
};
