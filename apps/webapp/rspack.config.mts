/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {rspack} from '@rspack/core';
import type {Configuration} from '@rspack/core';
import browserslist from 'browserslist';
import cssnano from 'cssnano';
import dotenv from 'dotenv-extended';
import HtmlRspackPlugin from 'html-rspack-plugin';

import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {generateClientConfig, generateServerConfig, parseBuildMetadata} from '@wireapp/config';
import type {BuildMetadata, Env} from '@wireapp/config';

type EnvironmentUrls = {
  readonly base: string;
  readonly api: string;
  readonly ws: string;
};

const configFilePath = fileURLToPath(import.meta.url);
const configDirectoryPath = path.dirname(configFilePath);
const rootPath = path.resolve(configDirectoryPath, '../..');
const srcPath = path.resolve(configDirectoryPath, 'src');
const scriptPath = path.resolve(srcPath, 'script');
const authPath = path.resolve(scriptPath, 'auth');
const browserCheckPath = path.resolve(scriptPath, 'browser');
const buildMetadataPath = path.resolve(
  rootPath,
  process.env.WIRE_WEBAPP_BUILD_METADATA_PATH ?? path.resolve(rootPath, 'apps/server/dist/version.json'),
);
function readBuildMetadata(): BuildMetadata {
  const parsedBuildMetadata = parseBuildMetadata(readFileSync(buildMetadataPath, 'utf8'));

  if (parsedBuildMetadata.isNothing) {
    throw new Error(`Invalid build metadata in '${buildMetadataPath}'`);
  }

  return parsedBuildMetadata.value;
}

function createTemplateParameters(): Record<string, string> {
  const buildMetadata = readBuildMetadata();
  const environment = dotenv.load({
    path: path.join(rootPath, '.env'),
    defaults: path.join(rootPath, '.env.defaults'),
    includeProcessEnv: true,
  }) as Env;
  const environmentUrls = createEnvironmentUrls(environment);
  const commonConfig = {
    assetVersion: buildMetadata.assetVersion,
    commit: buildMetadata.commit,
    version: buildMetadata.version,
    env: environment.NODE_ENV || 'production',
    urls: environmentUrls,
  };
  const clientConfig = generateClientConfig(commonConfig, environment);
  const serverConfig = generateServerConfig(commonConfig, environment);

  return {
    VERSION: clientConfig.VERSION,
    ASSET_VERSION: clientConfig.ASSET_VERSION,
    BRAND_NAME: clientConfig.BRAND_NAME,
    APP_BASE: clientConfig.APP_BASE,
    OPEN_GRAPH_TITLE: serverConfig.OPEN_GRAPH.TITLE,
    OPEN_GRAPH_DESCRIPTION: serverConfig.OPEN_GRAPH.DESCRIPTION,
    OPEN_GRAPH_IMAGE_URL: serverConfig.OPEN_GRAPH.IMAGE_URL,
  };
}

function createEnvironmentUrls(environment: Env): EnvironmentUrls {
  if (environment.FEDERATION) {
    return {
      base: `https://local.${environment.FEDERATION}.wire.link:8081`,
      api: `https://nginz-https.${environment.FEDERATION}.wire.link`,
      ws: `wss://nginz-ssl.${environment.FEDERATION}.wire.link`,
    };
  }

  if (!environment.APP_BASE || !environment.BACKEND_REST || !environment.BACKEND_WS) {
    throw new Error('missing environment variables');
  }

  return {
    base: environment.APP_BASE,
    api: environment.BACKEND_REST,
    ws: environment.BACKEND_WS,
  };
}

const templateParameters = createTemplateParameters();

function createRspackConfiguration(mode: 'development' | 'production' = 'production'): Configuration {
  const isDevelopment = mode === 'development';
  const outputPath = path.resolve(
    rootPath,
    process.env.WIRE_WEBAPP_BUILD_OUTPUT_PATH ??
      path.resolve(configDirectoryPath, isDevelopment ? 'dist/development' : 'dist/internal'),
  );

  return {
    cache: {
      type: 'persistent',
      buildDependencies: [
        configFilePath,
        path.resolve(configDirectoryPath, 'package.json'),
        path.resolve(rootPath, '.browserslistrc'),
        buildMetadataPath,
      ],
      storage: {
        type: 'filesystem',
        directory: path.resolve(rootPath, 'node_modules/.cache/rspack-webapp'),
      },
    },
    devtool: 'source-map',
    entry: {
      app: path.resolve(scriptPath, 'main/index.tsx'),
      auth: path.resolve(authPath, 'main.tsx'),
      checkBrowser: path.resolve(browserCheckPath, 'checkBrowser.ts'),
    },
    externals: {
      'fs-extra': '{}',
      worker_threads: '{}',
    },
    mode,
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          include: scriptPath,
          exclude: /node_modules/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              detectSyntax: 'auto',
              env: {
                coreJs: '3.50.0',
                mode: 'usage',
                targets: browserslist(undefined, {path: configDirectoryPath}),
              },
              isModule: 'unknown',
              jsc: {
                experimental: {
                  cacheRoot: path.resolve(rootPath, 'node_modules/.cache/swc-webapp'),
                  plugins: [['@swc/plugin-emotion', {autoLabel: 'dev-only'}]],
                },
                parser: {
                  decorators: true,
                },
                transform: {
                  legacyDecorator: true,
                  // The existing Babel pipeline transforms legacy decorators but does not emit TypeScript metadata.
                  decoratorMetadata: false,
                  react: {
                    development: isDevelopment,
                    importSource: '@emotion/react',
                    refresh: isDevelopment,
                    runtime: 'automatic',
                  },
                },
              },
              sourceMaps: true,
            },
          },
        },
        {
          test: /\.svg$/,
          loader: 'svg-inline-loader',
          options: {
            removeSVGTagAttrs: false,
          },
        },
        {
          test: /\.(glsl|vert|frag)$/,
          loader: 'raw-loader',
        },
        {
          test: /\.less$/i,
          use: [
            'style-loader',
            {loader: 'css-loader', options: {url: false}},
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: isDevelopment ? [['autoprefixer']] : [['autoprefixer'], [cssnano()]],
                },
              },
            },
            'less-loader',
          ],
        },
        {
          test: /\.css$/i,
          use: ['style-loader', {loader: 'css-loader', options: {url: false}}],
        },
      ],
    },
    optimization: {
      minimize: !isDevelopment,
      minimizer: isDevelopment
        ? []
        : [
            new rspack.SwcJsMinimizerRspackPlugin({
              extractComments: true,
            }),
          ],
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
      clean: true,
      filename: 'min/[name].js',
      path: outputPath,
      publicPath: '/',
    },
    plugins: [
      new rspack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new rspack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(mode),
        },
      }),
      new rspack.CopyRspackPlugin({
        patterns: [
          {
            context: path.resolve(rootPath, 'node_modules/@mediapipe/tasks-vision/wasm'),
            from: '*',
            to: 'min/mediapipe/wasm',
          },
          {
            context: path.resolve(configDirectoryPath, 'resource'),
            from: '**/*',
            to: '.',
          },
          {
            context: path.resolve(configDirectoryPath, 'assets'),
            from: '**/*',
            to: 'assets',
          },
          {from: path.resolve(srcPath, 'page/basicBrowserFeatureCheck.js'), to: 'min/'},
          {from: path.resolve(srcPath, 'page/loader.js'), to: 'min/'},
          {
            from: path.resolve(
              path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json'))),
              'build/pdf.worker.mjs',
            ),
            to: 'min/pdf.worker.mjs',
            info: {minimized: true},
          },
          {
            context: path.resolve(rootPath, 'node_modules/@wireapp/core-crypto/src'),
            from: '**/*',
            to: 'min/[name][ext]',
          },
        ],
      }),
      new rspack.IgnorePlugin({resourceRegExp: /.*\.wasm/}),
      new HtmlRspackPlugin({
        inject: false,
        template: path.resolve(srcPath, 'page/index.ejs'),
        templateParameters,
      }),
      new HtmlRspackPlugin({
        inject: false,
        filename: 'auth/index.html',
        template: path.resolve(srcPath, 'page/auth.ejs'),
        templateParameters,
      }),
      new HtmlRspackPlugin({
        inject: false,
        filename: 'unsupported/index.html',
        template: path.resolve(srcPath, 'page/unsupported.ejs'),
        templateParameters,
      }),
    ],
    resolve: {
      alias: {
        '@enormora/fire-and-forget$': path.resolve(rootPath, 'node_modules/@enormora/fire-and-forget/index.js'),
        Components: path.resolve(scriptPath, 'components'),
        Hooks: path.resolve(scriptPath, 'hooks'),
        Repositories: path.resolve(scriptPath, 'repositories'),
        I18n: path.resolve(srcPath, 'i18n'),
        Resource: path.resolve(configDirectoryPath, 'resource'),
        Util: path.resolve(scriptPath, 'util'),
        src: path.resolve(configDirectoryPath, 'src'),
        test: path.resolve(configDirectoryPath, 'test'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.svg'],
      fallback: {
        crypto: false,
        fs: false,
        os: fileURLToPath(import.meta.resolve('os-browserify')),
        path: fileURLToPath(import.meta.resolve('path-browserify')),
      },
      modules: [authPath, 'node_modules'],
    },
    ...(isDevelopment
      ? {
          snapshot: {
            managedPaths: [/^(.+?[\\/]node_modules[\\/](?!@wireapp))/],
            immutablePaths: [],
          },
        }
      : {}),
  };
}

export {createRspackConfiguration};
export default createRspackConfiguration();
