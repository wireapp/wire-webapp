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
 *
 */

import getPort from 'get-port';
import {StatusCodes} from 'http-status-codes';

import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

import {isBuildMetadata} from '../../apps/server/configuration/buildMetadata.ts';
import {validateRuntimeResponses} from '../runtimeVerification/validateRuntimeResponses.ts';

const repositoryDirectory = realpathSync(process.cwd());
const startupAttemptLimit = 80;
const startupRetryMilliseconds = 250;
const requestTimeoutMilliseconds = 1000;
const processTimeoutMilliseconds = 20000;
const nodeOptions = ['--enable-source-maps', '--no-global-search-paths'];

export async function verifyServerRuntime(artifactDirectory: string): Promise<void> {
  const port = await getPort();
  const runtimeBaseUrl = `http://127.0.0.1:${port}`;
  const runtimeDirectory = realpathSync(mkdtempSync(join(tmpdir(), 'bundled-server-')));

  try {
    assert(
      relative(repositoryDirectory, runtimeDirectory).startsWith(`..${sep}`),
      'Runtime must be outside the repository',
    );
    cpSync(artifactDirectory, runtimeDirectory, {recursive: true});
    // Check only Node's ancestor package locations; do not inspect every copied asset.
    for (let directory = runtimeDirectory; ; directory = dirname(directory)) {
      assert(!existsSync(join(directory, 'node_modules')), `Runtime can resolve installed packages from ${directory}`);
      if (directory === dirname(directory)) {
        break;
      }
    }
    for (const requiredRuntimePath of [
      'index.js',
      'index.js.map',
      'dbs/GeoLite2-Country.mmdb',
      'templates',
      'certificate/development-key.pem',
      'certificate/development-cert.pem',
      'robots',
      'libs/wire/telemetry/embed.js',
      'static/index.html',
      '.env.defaults',
      'version.json',
    ]) {
      assert(existsSync(join(runtimeDirectory, requiredRuntimePath)), `Missing runtime asset: ${requiredRuntimePath}`);
    }
    const expectedBuildMetadata: unknown = JSON.parse(readFileSync(join(runtimeDirectory, 'version.json'), 'utf8'));
    assert(isBuildMetadata(expectedBuildMetadata));
    const environment = {
      NODE_ENV: 'production',
      NODE_PATH: '',
      NODE_OPTIONS: '',
      PORT: String(port),
      ENFORCE_HTTPS: 'false',
      APP_BASE: 'https://runtime.example.test',
      BACKEND_REST: 'https://runtime.example.test',
      BACKEND_WS: 'wss://runtime.example.test',
    };
    const serverProcess = spawn(process.execPath, [...nodeOptions, 'index.js'], {
      cwd: runtimeDirectory,
      env: environment,
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: processTimeoutMilliseconds,
      killSignal: 'SIGKILL',
    });
    let serverErrors = '';
    serverProcess.stderr.setEncoding('utf8').on('data', (output: string) => {
      serverErrors += output;
    });
    const processExit = once(serverProcess, 'exit');

    try {
      let serverIsReady = false;
      for (let attempt = 0; attempt < startupAttemptLimit; attempt += 1) {
        assert.equal(serverProcess.exitCode, null, serverErrors);
        assert.equal(serverProcess.signalCode, null, serverErrors);
        try {
          const response = await fetch(`${runtimeBaseUrl}/_health`, {
            signal: AbortSignal.timeout(requestTimeoutMilliseconds),
          });
          serverIsReady = response.status === StatusCodes.OK && (await response.text()) === 'OK';
        } catch {
          serverIsReady = false;
        }
        if (serverIsReady) {
          break;
        }
        await delay(startupRetryMilliseconds);
      }
      assert(serverIsReady, `Bundled server did not start: ${serverErrors}`);
      const authResponse = await fetch(`${runtimeBaseUrl}/auth`, {
        headers: {'X-Forwarded-For': '8.8.8.8'},
        signal: AbortSignal.timeout(requestTimeoutMilliseconds),
      });
      assert.equal(authResponse.status, StatusCodes.OK);
      assert.match(await authResponse.text(), /name="geoip" content="US"/);
      const versionResponse = await fetch(`${runtimeBaseUrl}/version`, {
        signal: AbortSignal.timeout(requestTimeoutMilliseconds),
      });
      const configurationResponse = await fetch(`${runtimeBaseUrl}/config.js`, {
        signal: AbortSignal.timeout(requestTimeoutMilliseconds),
      });
      assert.equal(versionResponse.status, StatusCodes.OK);
      assert.equal(configurationResponse.status, StatusCodes.OK);
      assert.deepEqual(
        validateRuntimeResponses({
          versionResponse: await versionResponse.text(),
          runtimeConfigurationResponse: await configurationResponse.text(),
          expectedBuildMetadata,
          expectedBackendRest: environment.BACKEND_REST,
          expectedBackendWebSocket: environment.BACKEND_WS,
        }),
        [],
      );
      const sourceMapResponse = await fetch(`${runtimeBaseUrl}/index.js.map`, {
        signal: AbortSignal.timeout(requestTimeoutMilliseconds),
      });
      assert.equal(sourceMapResponse.status, StatusCodes.NOT_FOUND, 'Server source maps must stay private');
      assert.equal(serverProcess.exitCode, null, serverErrors);
      assert.equal(serverProcess.signalCode, null, serverErrors);
    } finally {
      serverProcess.kill();
      await processExit;
    }

    // The existing production URL guard provides a controlled exception without changing server code.
    const serverSource = readFileSync(resolve(repositoryDirectory, 'apps/server/Server.ts'), 'utf8');
    const exceptionLineNumber =
      serverSource.split('\n').findIndex(line => {
        return line.includes("throw new Error(`Config variable 'APP_BASE'");
      }) + 1;
    assert(exceptionLineNumber > 0);
    const exceptionProcess = spawnSync(
      process.execPath,
      [
        ...nodeOptions,
        '--eval',
        "try { require('./index.js'); } catch (error) { console.error(error.stack); process.exitCode = 1; }",
      ],
      {
        cwd: runtimeDirectory,
        env: {...environment, APP_BASE: 'http://invalid.example.test'},
        encoding: 'utf8',
        timeout: processTimeoutMilliseconds,
      },
    );
    assert.equal(exceptionProcess.error, undefined);
    assert.equal(exceptionProcess.status, 1);
    assert(exceptionProcess.stderr.includes(`Server.ts:${exceptionLineNumber}:`), exceptionProcess.stderr);
    console.info(
      'Server passed standalone startup, metadata, runtime configuration, template/GeoIP, and source-map checks.',
    );
  } finally {
    rmSync(runtimeDirectory, {recursive: true, force: true});
  }
}
