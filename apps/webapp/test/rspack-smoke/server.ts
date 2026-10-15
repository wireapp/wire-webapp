#!/usr/bin/env node

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

import {generateClientConfig, parseBuildMetadata} from '@wireapp/config';
import type {Env} from '@wireapp/config';
import {isError} from '@sindresorhus/is';
import dotenv from 'dotenv-extended';
import {noop} from 'noop-esm';
import {match, P} from 'ts-pattern';
import {Maybe} from 'true-myth';

import {createReadStream, existsSync, readFileSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import type {IncomingMessage, ServerResponse} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {resolveRspackSmokeAssetPath} from './rspackSmokeAssetPathResolver.ts';
import {parseRspackSmokeServerOptions} from './rspackSmokeServerOptions.ts';
import type {RspackSmokeServerOptions} from './rspackSmokeServerOptions.ts';

type RuntimeConfiguration = ReturnType<typeof generateClientConfig>;

type RequestHandlerOptions = {
  readonly request: IncomingMessage;
  readonly response: ServerResponse;
  readonly serverOptions: RspackSmokeServerOptions;
  readonly buildDirectoryPath: string;
  readonly runtimeConfiguration: RuntimeConfiguration;
};

const firstServerArgumentIndex = 2;
const statusOk = 200;
const statusBadRequest = 400;
const statusNotFound = 404;
const statusMethodNotAllowed = 405;
const smokeBackendApiVersion = 7;
const serverFilePath = fileURLToPath(import.meta.url);
const smokeTestDirectoryPath = path.dirname(serverFilePath);
const webappDirectoryPath = path.resolve(smokeTestDirectoryPath, '../..');
const workspaceRootPath = path.resolve(webappDirectoryPath, '../..');
const buildMetadataPath = path.resolve(workspaceRootPath, 'apps/server/build/metadata/version.json');
const environmentDefaultsPath = path.resolve(workspaceRootPath, '.env.defaults');
const telemetryEmbedAssetPath = path.resolve(workspaceRootPath, 'libraries/telemetry/lib/embed.js');

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function readRuntimeConfiguration(serverOrigin: string, websocketOrigin: string): RuntimeConfiguration {
  const parsedBuildMetadata = parseBuildMetadata(readFileSync(buildMetadataPath, 'utf8'));
  const buildMetadata = parsedBuildMetadata.match({
    Just: buildMetadata => {
      return buildMetadata;
    },
    Nothing: () => {
      throw new Error(`Invalid build metadata at '${buildMetadataPath}'`);
    },
  });

  const environment = dotenv.load({path: environmentDefaultsPath, includeProcessEnv: false}) as Env;
  const smokeEnvironment: Env = {
    ...environment,
    ANALYTICS_API_KEY: '',
    BACKEND_REST: serverOrigin,
    BACKEND_WS: websocketOrigin,
    COUNTLY_API_KEY: '',
    DATADOG_APPLICATION_ID: '',
    DATADOG_CLIENT_TOKEN: '',
    NODE_ENV: 'production',
  };
  return generateClientConfig(
    {
      assetVersion: buildMetadata.assetVersion,
      commit: buildMetadata.commit,
      env: 'production',
      urls: {
        api: serverOrigin,
        base: serverOrigin,
        ws: websocketOrigin,
      },
      version: buildMetadata.version,
    },
    smokeEnvironment,
  );
}

function respondWithText(response: ServerResponse, statusCode: number, contentType: string, body: string): void {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function respondWithMissingAsset(response: ServerResponse, assetPath: string): void {
  respondWithText(response, statusNotFound, 'text/plain; charset=utf-8', `Rspack asset not found: ${assetPath}`);
}

function sendBuildAsset(response: ServerResponse, assetPath: string): void {
  const assetState = match(existsSync(assetPath))
    .with(true, () => {
      return {kind: 'found' as const, assetStatistics: statSync(assetPath)};
    })
    .with(false, () => {
      return {kind: 'missing' as const};
    })
    .exhaustive();

  match(assetState)
    .with({kind: 'found'}, ({assetStatistics}) => {
      return match(assetStatistics.isFile())
        .with(true, () => {
          const contentType = contentTypes[path.extname(assetPath)] ?? 'application/octet-stream';
          response.writeHead(statusOk, {
            'Cache-Control': 'no-store',
            'Content-Length': assetStatistics.size,
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff',
          });

          createReadStream(assetPath).pipe(response);
        })
        .with(false, () => {
          respondWithMissingAsset(response, assetPath);
        })
        .exhaustive();
    })
    .with({kind: 'missing'}, () => {
      respondWithMissingAsset(response, assetPath);
    })
    .exhaustive();
}

function respondToGetRequest(options: RequestHandlerOptions): void {
  const {request, response, serverOptions, buildDirectoryPath, runtimeConfiguration} = options;
  const requestPath = Maybe.of(request.url).unwrapOr('/');
  const requestUrl = new URL(requestPath, `http://127.0.0.1:${serverOptions.port}`);
  return match(requestUrl.pathname)
    .with('/config.js', () => {
      const serializedConfiguration = `window.wire = window.wire || {}; window.wire.env = ${JSON.stringify(runtimeConfiguration)};`;
      respondWithText(response, statusOk, 'application/javascript; charset=utf-8', serializedConfiguration);
    })
    .with('/libs/wire/telemetry/embed.js', () => {
      sendBuildAsset(response, telemetryEmbedAssetPath);
    })
    .with('/api-version', () => {
      respondWithText(
        response,
        statusOk,
        'application/json; charset=utf-8',
        JSON.stringify({supported: [smokeBackendApiVersion]}),
      );
    })
    .with(
      P.when(pathname => {
        return pathname.endsWith('/sso/settings');
      }),
      () => {
        respondWithText(response, statusOk, 'application/json; charset=utf-8', JSON.stringify({default_sso_code: ''}));
      },
    )
    .otherwise(pathname => {
      const assetPath = resolveRspackSmokeAssetPath(pathname, buildDirectoryPath);

      return assetPath.match({
        Ok: resolvedAssetPath => {
          sendBuildAsset(response, resolvedAssetPath);
        },
        Err: assetPathError => {
          const errorMessage = match(assetPathError)
            .with({kind: 'malformedEncoding'}, () => {
              return 'malformed URL encoding';
            })
            .with({kind: 'outsideBuildDirectory'}, () => {
              return 'path escapes the build directory';
            })
            .exhaustive();

          respondWithText(
            response,
            statusBadRequest,
            'text/plain; charset=utf-8',
            `Invalid asset path: ${errorMessage}`,
          );
        },
      });
    });
}

function respondToRequest(options: RequestHandlerOptions): void {
  const {request, response} = options;

  return Maybe.of(request.method).match({
    Just: method => {
      return match(method)
        .with(P.union('GET', 'HEAD'), () => {
          respondToGetRequest(options);
        })
        .otherwise(() => {
          respondWithText(response, statusMethodNotAllowed, 'text/plain; charset=utf-8', 'Method not allowed');
        });
    },
    Nothing: () => {
      respondWithText(response, statusMethodNotAllowed, 'text/plain; charset=utf-8', 'Method not allowed');
    },
  });
}

function startSmokeServer(options: RspackSmokeServerOptions): void {
  const buildDirectoryName = match(options.buildVariant)
    .with('internal', () => {
      return 'rspack-internal';
    })
    .with('public', () => {
      return 'rspack-public';
    })
    .exhaustive();
  const buildDirectoryPath = path.resolve(webappDirectoryPath, 'dist', buildDirectoryName);
  const serverOrigin = `http://127.0.0.1:${options.port}`;
  const websocketOrigin = `ws://127.0.0.1:${options.port}`;
  const applicationIndexPath = path.resolve(buildDirectoryPath, 'index.html');
  match(existsSync(applicationIndexPath))
    .with(true, noop)
    .with(false, () => {
      throw new Error(
        `Rspack ${options.buildVariant} build is missing at '${buildDirectoryPath}'. Build it before running smoke tests.`,
      );
    })
    .exhaustive();

  const runtimeConfiguration = readRuntimeConfiguration(serverOrigin, websocketOrigin);
  const server = createServer((request, response) => {
    respondToRequest({
      request,
      response,
      serverOptions: options,
      buildDirectoryPath,
      runtimeConfiguration,
    });
  });

  server.listen(options.port, '127.0.0.1', () => {
    process.stdout.write(`Serving Rspack ${options.buildVariant} build at ${serverOrigin}\n`);
  });

  function closeServer(): void {
    server.close();
    server.closeAllConnections();
  }
  process.once('SIGINT', closeServer);
  process.once('SIGTERM', closeServer);
}

function run(): void {
  try {
    parseRspackSmokeServerOptions(process.argv.slice(firstServerArgumentIndex)).match({
      Ok: options => {
        startSmokeServer(options);
      },
      Err: error => {
        const errorMessage = match(error)
          .with({kind: 'unknownOption'}, ({optionName}) => {
            return `Unknown smoke server option '${optionName}'`;
          })
          .with({kind: 'invalidArguments'}, () => {
            return 'Usage: node server.ts --variant <internal|public> --port <1-65535>';
          })
          .exhaustive();

        process.stderr.write(`${errorMessage}\n`);
        process.exitCode = 1;
      },
    });
  } catch (error: unknown) {
    const errorMessage = isError(error) ? Maybe.of(error.stack).unwrapOr(error.message) : String(error);
    process.stderr.write(`${errorMessage}\n`);
    process.exitCode = 1;
  }
}

run();
