/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const DIST_PATH = path.resolve(__dirname, 'server/dist');
const ROOT_PATH = path.resolve(__dirname);
const SRC_PATH = path.resolve(__dirname, 'src');

const dist = path.resolve(DIST_PATH, 'static');
const auth = path.resolve(SRC_PATH, 'script/auth');
const checkBrowser = path.resolve(SRC_PATH, 'script/browser');
const srcScript = path.resolve(SRC_PATH, 'script');

const HOME_TEMPLATE_PATH = path.resolve(SRC_PATH, 'page/index.ejs');
const AUTH_TEMPLATE_PATH = path.resolve(SRC_PATH, 'page/auth.ejs');
const UNSUPPORTED_TEMPLATE_PATH = path.resolve(SRC_PATH, 'page/unsupported.ejs');

const {clientConfig, serverConfig} = require(path.resolve(DIST_PATH, 'config/index.js'));

const templateParameters = {
  VERSION: clientConfig.VERSION,
  BRAND_NAME: clientConfig.BRAND_NAME,
  APP_BASE: clientConfig.APP_BASE,
  OPEN_GRAPH_TITLE: serverConfig.OPEN_GRAPH.TITLE,
  OPEN_GRAPH_DESCRIPTION: serverConfig.OPEN_GRAPH.DESCRIPTION,
  OPEN_GRAPH_IMAGE_URL: serverConfig.OPEN_GRAPH.IMAGE_URL,
};

module.exports = {
  cache: {
    buildDependencies: {
      // https://webpack.js.org/blog/2020-10-10-webpack-5-release/#persistent-caching
      config: [__filename],
    },
    type: 'filesystem',
  },
  devtool: 'source-map',
  entry: {
    app: path.resolve(srcScript, 'main/index.tsx'),
    auth: path.resolve(auth, 'main.tsx'),
    checkBrowser: path.resolve(checkBrowser, 'CheckBrowser.ts'),
  },
  externals: {
    'fs-extra': '{}',
    worker_threads: '{}',
  },
  mode: 'production',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        include: srcScript,
        loader: 'babel-loader',
        test: /\.[tj]sx?$/,
      },
      {
        loader: 'svg-inline-loader',
        options: {
          removeSVGTagAttrs: false,
        },
        test: /\.svg$/,
      },
      {
        loader: 'raw-loader',
        test: /\.glsl$/,
      },
      {
        test: /\.less$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: false,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [['autoprefixer'], [require('cssnano')()]],
              },
            },
          },
          {loader: 'less-loader'},
        ],
      },
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: false,
            },
          },
        ],
      },
    ],
  },
  optimization: {
    moduleIds: 'named',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        dexie: {
          chunks: 'initial',
          enforce: true,
          name: 'dexie',
          priority: 2,
          test: /dexie/,
        },
        vendor: {
          chunks: 'initial',
          minChunks: 2,
          name: 'vendor',
          priority: 1,
          test: /node_modules/,
        },
      },
    },
  },
  output: {
    chunkFilename: 'min/[name].js',
    filename: 'min/[name].js',
    path: dist,
    publicPath: '/',
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
    new WorkboxPlugin.InjectManifest({
      maximumFileSizeToCacheInBytes: process.env.NODE_ENV !== 'production' ? 10 * 1024 * 1024 : undefined,
      swDest: path.resolve(dist, 'sw.js'),
      swSrc: path.resolve(SRC_PATH, 'sw.js'),
    }),
    /* All wasm files will be ignored from webpack and copied over to the destination folder, they don't need any webpack processing */
    new CopyPlugin({
      patterns: [
        {
          context: 'node_modules/@mediapipe/tasks-vision/wasm',
          from: '*',
          to: `${dist}/min/mediapipe/wasm`,
        },
        // copying all static resources (audio, images, fonts...)
        {from: 'resource', to: dist},
        {from: `assets`, to: `${dist}/assets`},
        {from: 'src/page/basicBrowserFeatureCheck.js', to: `${dist}/min/`},
        {from: 'src/page/loader.js', to: `${dist}/min/`},
        // Copy PDF worker for react-pdf package
        {
          from: path.dirname(require.resolve('pdfjs-dist/package.json')) + '/build/pdf.worker.mjs',
          to: `${dist}/min/pdf.worker.mjs`,
          // Prevents content hashing
          info: {minimized: true},
        },
        // Copy Core-Crypto worker for @wireapp/core-crypto package
        {
          context: 'node_modules/@wireapp/core-crypto/src',
          from: '*',
          to: `${dist}/min/`,
        },
      ],
    }),
    new webpack.IgnorePlugin({resourceRegExp: /.*\.wasm/}),
    // @todo: We should merge these when main & auth app are merged.
    new HtmlWebpackPlugin({
      inject: false,
      template: HOME_TEMPLATE_PATH,
      templateParameters,
    }),
    new HtmlWebpackPlugin({
      inject: false,
      filename: 'auth/index.html',
      template: AUTH_TEMPLATE_PATH,
      templateParameters,
    }),
    new HtmlWebpackPlugin({
      inject: false,
      filename: 'unsupported/index.html',
      template: UNSUPPORTED_TEMPLATE_PATH,
      templateParameters,
    }),
  ],
  resolve: {
    alias: {
      Components: path.resolve(srcScript, 'components'),
      Hooks: path.resolve(srcScript, 'hooks'),
      Repositories: path.resolve(srcScript, 'repositories'),
      I18n: path.resolve(SRC_PATH, 'i18n'),
      Resource: path.resolve(ROOT_PATH, 'resource'),
      Util: path.resolve(srcScript, 'util'),
      src: path.resolve(ROOT_PATH, 'src'),
      test: path.resolve(ROOT_PATH, 'test'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg'],
    fallback: {
      crypto: false,
      fs: false,
      os: require.resolve('os-browserify'),
      path: require.resolve('path-browserify'),
    },
    modules: [auth, 'node_modules'],
  },
};
