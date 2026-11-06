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

import {execFile} from 'node:child_process';
import {createWriteStream, promises as fs} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {promisify} from 'node:util';

import {AccessTokenStore} from '../../libraries/api-client/lib/auth/accessTokenStore';
import {CellsAPI} from '../../libraries/api-client/lib/cells/cellsApi';

const executeFile = promisify(execFile);
const FIRST_PATH_ARGUMENT_INDEX = 2;
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 512 MiB caps temporary disk usage
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;

const requiredEnvironment = (name: string): string => {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const main = async (): Promise<void> => {
  const cellsUrl = requiredEnvironment('CELLS_URL').replace(/\/$/, '');
  const accessToken = requiredEnvironment('CELLS_ACCESS_TOKEN');
  const archiveParentPath = requiredEnvironment('CELLS_ARCHIVE_PARENT_PATH');
  const paths = process.argv.slice(FIRST_PATH_ARGUMENT_INDEX);
  if (paths.length === 0) {
    throw new Error('Pass one or more workspace-qualified Cells paths as arguments.');
  }

  const accessTokenStore = new AccessTokenStore();
  await accessTokenStore.updateToken({
    access_token: accessToken,
    expires_in: 3600,
    token_type: 'Bearer',
    user: process.env.CELLS_USER_ID ?? 'bulk-download-demo',
  });

  const cellsAPI = new CellsAPI({
    accessTokenStore,
    httpClientConfig: {
      urls: {
        name: 'Cells bulk download demo',
        rest: `${cellsUrl}/v2`,
        ws: cellsUrl.replace(/^http/, 'ws'),
      },
      headers: {},
    },
  });
  cellsAPI.initialize({
    cellsConfig: {
      pydio: {url: cellsUrl, segment: '/v2'},
      s3: {
        bucket: process.env.CELLS_S3_BUCKET ?? 'io',
        endpoint: process.env.CELLS_S3_ENDPOINT ?? cellsUrl,
        region: process.env.CELLS_S3_REGION ?? 'us-east-1',
      },
    },
  });

  const abortController = new AbortController();
  const abortOnInterrupt = (): void => {
    abortController.abort();
  };
  process.once('SIGINT', abortOnInterrupt);
  let temporaryPath: string | undefined;

  try {
    const archive = await cellsAPI.downloadSelectionArchive({paths, archiveParentPath, abortController});
    temporaryPath = path.join(tmpdir(), `wpb-29892-${process.pid}-${Date.now()}.zip.part`);
    const archivePath = temporaryPath.slice(0, -'.part'.length);

    let bytesDownloaded = 0;
    const enforceArchiveLimit = new Transform({
      transform(chunk: Uint8Array, _encoding, callback) {
        bytesDownloaded += chunk.byteLength;
        if (bytesDownloaded > MAX_ARCHIVE_BYTES) {
          callback(new Error('Archive exceeds the demo size limit'));
          return;
        }
        callback(null, chunk);
      },
    });

    await pipeline(
      Readable.fromWeb(archive as import('node:stream/web').ReadableStream<Uint8Array>),
      enforceArchiveLimit,
      createWriteStream(temporaryPath, {flags: 'wx'}),
    );
    await executeFile('unzip', ['-t', temporaryPath], {signal: abortController.signal});
    await fs.rename(temporaryPath, archivePath);
    console.info(`Archive saved and ZIP integrity checked: ${archivePath}`);
    console.info('Inspect contents with: unzip -l "<archive path>"');
    console.info('Extract a file with: unzip -p "<archive path>" "<entry path>"');
  } finally {
    process.off('SIGINT', abortOnInterrupt);
    if (temporaryPath !== undefined) {
      await fs.rm(temporaryPath, {force: true});
    }
  }
};

void main().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  console.error(`Bulk download demo failed (${errorName}). No completed archive was saved.`);
  process.exitCode = 1;
});
