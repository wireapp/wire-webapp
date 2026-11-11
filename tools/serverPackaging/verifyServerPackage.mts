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
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

import {verifyServerRuntime} from './verifyServerRuntime.mts';

async function main(): Promise<void> {
  const deploymentDirectory = mkdtempSync(join(tmpdir(), 'packaged-server-'));

  try {
    const artifactPath = resolve(process.env.BUILD_ARTIFACT_PATH ?? 'apps/server/dist/s3/ebs.zip');
    execFileSync('unzip', ['-q', artifactPath, '-d', deploymentDirectory]);

    const artifactPaths = readdirSync(deploymentDirectory, {recursive: true, encoding: 'utf8'});
    const forbiddenArtifactPaths = artifactPaths.filter(artifactFilePath => {
      const hasForbiddenSegment = artifactFilePath.split(/[\\/]/).some(pathSegment => {
        return ['node_modules', '__tests__', '__mocks__', 'package.json', 'package-lock.json', '.npmrc'].includes(
          pathSegment,
        );
      });

      return hasForbiddenSegment || /\.(test|spec)\.(d\.)?[cm]?[jt]sx?(\.map)?$/.test(artifactFilePath);
    });
    assert.deepEqual(
      forbiddenArtifactPaths,
      [],
      'Production package must contain no dependencies, manifests, or tests',
    );
    assert.equal(
      readFileSync(join(deploymentDirectory, 'Procfile'), 'utf8').trim(),
      'web: node --enable-source-maps ./index.js',
    );
    const deploymentHooks = artifactPaths.filter(artifactFilePath => {
      return /^\.platform\/(hooks|confighooks)\//.test(artifactFilePath) && artifactFilePath.endsWith('.sh');
    });
    for (const hookPath of deploymentHooks) {
      assert.doesNotMatch(
        readFileSync(join(deploymentDirectory, hookPath), 'utf8'),
        /\bnpm\s+(install|ci|clean-install)\b/,
      );
    }
    await verifyServerRuntime(deploymentDirectory);
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    rmSync(deploymentDirectory, {recursive: true, force: true});
  }
}

void main();
