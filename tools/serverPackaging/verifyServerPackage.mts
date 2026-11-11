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

import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

import {isBuildMetadata} from '../../apps/server/configuration/buildMetadata.ts';
import {validateRuntimeResponses} from '../runtimeVerification/validateRuntimeResponses.ts';

const repositoryDirectory = process.cwd();
const artifactPath = resolve(repositoryDirectory, process.env.BUILD_ARTIFACT_PATH ?? 'apps/server/dist/s3/ebs.zip');
const smokePort = 18080;
const startupAttemptLimit = 80;
const startupRetryMilliseconds = 250;
const runtimeBaseUrl = `http://127.0.0.1:${smokePort}`;
const expectedBackendRest = 'https://runtime.example.test';
const expectedBackendWebSocket = 'wss://runtime.example.test';

async function verifyServerPackage(): Promise<void> {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'packaged-server-'));
  const deploymentDirectory = join(fixtureDirectory, 'runtime');

  try {
    mkdirSync(join(fixtureDirectory, 'apps/server'), {recursive: true});
    for (const manifestPath of ['package.json', 'package-lock.json', '.npmrc', 'apps/server/package.json']) {
      copyFileSync(join(repositoryDirectory, manifestPath), join(fixtureDirectory, manifestPath));
    }

    // Match Docker's lockfile installation, with no webapp or development dependencies.
    execFileSync(
      'npm',
      [
        'clean-install',
        '--omit=dev',
        '--workspace=@wireapp/server',
        '--include-workspace-root=false',
        '--ignore-scripts',
      ],
      {cwd: fixtureDirectory, stdio: 'inherit'},
    );
    execFileSync('unzip', ['-q', artifactPath, '-d', deploymentDirectory]);

    const testArtifactPaths = readdirSync(deploymentDirectory, {recursive: true, encoding: 'utf8'}).filter(
      artifactFilePath => {
        const isTestDirectory = artifactFilePath.split(/[\\/]/).some(pathSegment => {
          return pathSegment === '__tests__' || pathSegment === '__mocks__';
        });

        return isTestDirectory || /\.(test|spec)\.(d\.)?[cm]?[jt]sx?(\.map)?$/.test(artifactFilePath);
      },
    );
    assert.deepEqual(testArtifactPaths, [], 'Production server package must not contain test files or their maps');

    for (const runtimeFile of [
      'index.js',
      'config.js',
      'configuration/client.config.js',
      'configuration/server.config.js',
      'configuration/buildMetadata.js',
      'certificate/development-key.pem',
      'certificate/development-cert.pem',
    ]) {
      assert.equal(existsSync(join(deploymentDirectory, runtimeFile)), true, runtimeFile);
    }
    assert.equal(existsSync(join(deploymentDirectory, 'node_modules')), false);
    assert.equal(existsSync(join(fixtureDirectory, 'node_modules/@rspack/core')), false);
    for (const testDependency of ['jest', '@types/jest', 'ts-node', '@enormora/objectory']) {
      assert.equal(existsSync(join(fixtureDirectory, 'node_modules', testDependency)), false, testDependency);
    }

    const expectedBuildMetadata: unknown = JSON.parse(readFileSync(join(deploymentDirectory, 'version.json'), 'utf8'));
    assert(isBuildMetadata(expectedBuildMetadata));

    const serverProcess = spawn(process.execPath, ['index.js'], {
      cwd: deploymentDirectory,
      env: {
        ...process.env,
        NODE_PATH: '',
        NODE_OPTIONS: '',
        NODE_ENV: 'production',
        PORT: String(smokePort),
        ENFORCE_HTTPS: 'false',
        APP_BASE: `https://localhost:${smokePort}`,
        BACKEND_REST: expectedBackendRest,
        BACKEND_WS: expectedBackendWebSocket,
      },
      stdio: 'inherit',
    });

    try {
      let serverIsReady = false;
      for (let attempt = 0; attempt < startupAttemptLimit; attempt += 1) {
        assert.equal(serverProcess.exitCode, null, 'Packaged server exited before becoming ready');
        try {
          const response = await fetch(`${runtimeBaseUrl}/version`);
          serverIsReady = response.ok;
        } catch {
          serverIsReady = false;
        }
        if (serverIsReady === true) {
          break;
        }
        await delay(startupRetryMilliseconds);
      }
      assert.equal(serverIsReady, true, 'Packaged server did not start within 20 seconds');

      const versionResponse = await fetch(`${runtimeBaseUrl}/version`);
      const configurationResponse = await fetch(`${runtimeBaseUrl}/config.js`);
      assert.equal(configurationResponse.ok, true);
      assert.deepEqual(
        validateRuntimeResponses({
          versionResponse: await versionResponse.text(),
          runtimeConfigurationResponse: await configurationResponse.text(),
          expectedBuildMetadata,
          expectedBackendRest,
          expectedBackendWebSocket,
        }),
        [],
      );
      console.info('Extracted server package passed production startup, metadata, and runtime configuration checks.');
    } finally {
      serverProcess.kill();
      await new Promise<void>(resolveExit => {
        if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
          resolveExit();

          return;
        }
        serverProcess.once('exit', () => {
          resolveExit();
        });
      });
    }
  } finally {
    rmSync(fixtureDirectory, {recursive: true, force: true});
  }
}

async function main(): Promise<void> {
  try {
    await verifyServerPackage();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  }
}

void main();
