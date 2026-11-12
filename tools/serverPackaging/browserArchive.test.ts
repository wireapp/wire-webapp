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

import JSZip from 'jszip';

import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {isArray, isPlainObject, isString} from '@sindresorhus/is';
import {load} from 'js-yaml';

const browserEntryPaths = [
  'app.js',
  'auth.js',
  'checkBrowser.js',
  'runtime.js',
  'vendor.js',
  'dexie.js',
  'pdf.worker.mjs',
  'worker.js',
];

type BrowserArchiveOptions = {
  readonly missingEntryPath?: string;
  readonly runtimeContents?: string;
  readonly corruptArchive?: boolean;
};

async function verifyBrowserArchive(options: BrowserArchiveOptions): Promise<ReturnType<typeof spawnSync>> {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'browser-archive-'));

  try {
    const archive = new JSZip();
    for (const entryPath of browserEntryPaths) {
      if (entryPath !== options.missingEntryPath) {
        archive.file(
          `static/min/${entryPath}`,
          entryPath === 'runtime.js' ? (options.runtimeContents ?? 'rspackChunk_wireapp_webapp') : 'browser entry',
        );
      }
    }
    const archivePath = join(fixtureDirectory, 'ebs.zip');
    const archiveContents = await archive.generateAsync({type: 'nodebuffer'});
    writeFileSync(archivePath, options.corruptArchive === true ? archiveContents.subarray(0, 20) : archiveContents);

    return spawnSync('bash', ['tools/serverPackaging/verifyBrowserArchive.sh', archivePath], {encoding: 'utf8'});
  } finally {
    rmSync(fixtureDirectory, {recursive: true, force: true});
  }
}

describe('browser deployment ZIP verification', () => {
  it('accepts a complete Rspack deployment archive', async () => {
    const verification = await verifyBrowserArchive({});
    expect(verification.status).toBe(0);
  });

  it.each(browserEntryPaths)('rejects a missing %s entry with its path', async missingEntryPath => {
    const verification = await verifyBrowserArchive({missingEntryPath});
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain(`missing required entry script: static/min/${missingEntryPath}`);
  });

  it.each([
    ['unrecognized runtime', 'does not contain the Rspack runtime fingerprint'],
    ['rspackChunk_wireapp_webapp webpackChunk_wireapp_webapp', 'contains the Webpack runtime fingerprint'],
  ])('rejects incorrect runtime fingerprints: %s', async (runtimeContents, expectedError) => {
    const verification = await verifyBrowserArchive({runtimeContents});
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain(expectedError);
  });

  it('rejects a corrupt ZIP with an integrity error', async () => {
    const verification = await verifyBrowserArchive({corruptArchive: true});
    expect(verification.status).toBe(1);
    expect(verification.stderr).toContain('failed integrity verification');
  });

  it('verifies the existing public package outside the Playwright container without apt-get', () => {
    const workflow: unknown = load(readFileSync('.github/workflows/continuous-integration.yml', 'utf8'));
    expect(isPlainObject(workflow) && isPlainObject(workflow.jobs)).toBe(true);
    if (isPlainObject(workflow) === false || isPlainObject(workflow.jobs) === false) {
      throw new Error('CI workflow must define jobs');
    }
    const rspackJob = workflow.jobs['rspack-build'];
    const packageJob = workflow.jobs['public-production-package'];
    if (
      isPlainObject(rspackJob) === false ||
      isPlainObject(packageJob) === false ||
      isArray(packageJob.steps) === false
    ) {
      throw new Error('CI workflow must define production build and package jobs');
    }
    expect(JSON.stringify(rspackJob)).not.toMatch(/apt-get|unzip|verifyBrowserArchive/);
    expect(packageJob.if).toBeUndefined();
    const packageCommands = packageJob.steps
      .flatMap(step => {
        return isPlainObject(step) && isString(step.run) ? [step.run] : [];
      })
      .join('\n');
    expect(packageCommands.match(/npx just package-server-public/g)).toHaveLength(1);
    expect(packageCommands).toContain('npx just validate-build-artifact');
    expect(packageCommands).toContain('bash tools/serverPackaging/verifyBrowserArchive.sh apps/server/dist/s3/ebs.zip');
  });
});
