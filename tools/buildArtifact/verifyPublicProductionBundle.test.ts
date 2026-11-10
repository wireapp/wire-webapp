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

import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  getDatadogReferencesInFile,
  getPublicProductionArtifactFilePaths,
  verifyPublicProductionBundle,
} from './verifyPublicProductionBundle';

function createTemporaryDirectory(): string {
  return mkdtempSync(join(tmpdir(), 'wire-public-production-bundle-'));
}

describe('verifyPublicProductionBundle', (): void => {
  it('recursively scans JavaScript files and source maps', (): void => {
    const temporaryDirectory = createTemporaryDirectory();

    try {
      const nestedDirectory = join(temporaryDirectory, 'min', 'nested');
      mkdirSync(nestedDirectory, {recursive: true});
      writeFileSync(join(temporaryDirectory, 'index.html'), 'ignored html file');
      writeFileSync(join(temporaryDirectory, 'min', 'app.js'), 'console.log("app");');
      writeFileSync(join(nestedDirectory, 'chunk.js.map'), '{"sources":["chunk.ts"]}');
      writeFileSync(join(nestedDirectory, 'worker.mjs'), 'export {};');
      writeFileSync(join(nestedDirectory, 'worker.mjs.map'), '{"sources":["worker.ts"]}');

      const actualFilePaths = getPublicProductionArtifactFilePaths(temporaryDirectory);

      expect(actualFilePaths).toEqual([
        join(temporaryDirectory, 'min', 'app.js'),
        join(nestedDirectory, 'chunk.js.map'),
        join(nestedDirectory, 'worker.mjs'),
        join(nestedDirectory, 'worker.mjs.map'),
      ]);
    } finally {
      rmSync(temporaryDirectory, {force: true, recursive: true});
    }
  });

  it('finds Datadog references in source maps', (): void => {
    const temporaryDirectory = createTemporaryDirectory();

    try {
      const sourceMapFilePath = join(temporaryDirectory, 'app.js.map');
      writeFileSync(sourceMapFilePath, '{"sources":["../../node_modules/@datadog/browser-rum/index.js"]}');

      const actualReferences = getDatadogReferencesInFile(sourceMapFilePath);

      expect(actualReferences).toEqual([
        {
          filePath: sourceMapFilePath,
          lineNumber: 1,
          matchedText: '@datadog/browser-rum',
        },
      ]);
    } finally {
      rmSync(temporaryDirectory, {force: true, recursive: true});
    }
  });

  it('fails verification when Datadog references exist in shipped artifacts', (): void => {
    const temporaryDirectory = createTemporaryDirectory();

    try {
      writeFileSync(join(temporaryDirectory, 'app.mjs'), 'fetch("https://browser-intake-datadoghq.eu");');
      writeFileSync(join(temporaryDirectory, 'app.mjs.map'), '{"sources":["@datadog/browser-rum/index.js"]}');

      const actualResult = verifyPublicProductionBundle(temporaryDirectory);

      expect(actualResult).toEqual({
        references: [
          {
            filePath: join(temporaryDirectory, 'app.mjs'),
            lineNumber: 1,
            matchedText: 'datadoghq.eu',
          },
          {
            filePath: join(temporaryDirectory, 'app.mjs.map'),
            lineNumber: 1,
            matchedText: '@datadog/browser-rum',
          },
        ],
        status: 'failed',
      });
    } finally {
      rmSync(temporaryDirectory, {force: true, recursive: true});
    }
  });

  it('fails verification when no JavaScript artifacts are present', (): void => {
    const temporaryDirectory = createTemporaryDirectory();

    try {
      writeFileSync(join(temporaryDirectory, 'app.js.map'), '{"sources":[]}');

      expect((): void => {
        verifyPublicProductionBundle(temporaryDirectory);
      }).toThrow(`No public production JavaScript artifact files found in ${temporaryDirectory}.`);
    } finally {
      rmSync(temporaryDirectory, {force: true, recursive: true});
    }
  });

  it('uses a custom artifact directory provided to the CLI', (): void => {
    const temporaryDirectory = createTemporaryDirectory();

    try {
      writeFileSync(join(temporaryDirectory, 'app.js'), 'console.log("public app");');

      const cliResult = spawnSync(
        process.execPath,
        [join(__dirname, 'verifyPublicProductionBundle.ts'), temporaryDirectory],
        {encoding: 'utf8'},
      );

      expect(cliResult.error).toBeUndefined();
      expect(cliResult.status).toBe(0);
      expect(cliResult.stdout).toContain('No Datadog SDK references found in 1 public production artifact files.');
    } finally {
      rmSync(temporaryDirectory, {force: true, recursive: true});
    }
  });
});
