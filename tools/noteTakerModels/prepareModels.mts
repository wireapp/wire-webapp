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

import {isUndefined, isNull} from '@sindresorhus/is';
import {task} from 'true-myth';

import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdir, rename, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';

import {readModelManifest} from './verifyModelAssets.mts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'apps/webapp/assets/noteTakerModels');
const parsedManifest = readModelManifest(fileURLToPath(new URL('./modelManifest.json', import.meta.url)));
if (parsedManifest.isErr) {
  throw parsedManifest.error;
}
const manifest = parsedManifest.value;

async function fileHash(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filename)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

const files = manifest.models.flatMap(model => {
  return model.files.map(file => {
    return {model, file};
  });
});
const downloadTimeoutMs = 600_000;
let next = 0;
const prepared = await task.tryOrElse(String, async () => {
  await Promise.all(
    Array.from({length: 3}, async () => {
      while (next < files.length) {
        const entry = files[next++];
        if (isUndefined(entry)) {
          continue;
        }
        const {model, file} = entry;
        const destination = path.join(output, model.id, model.revision, file.path);
        const existing = await task.tryOrElse(String, () => {
          return stat(destination);
        });
        if (existing.isOk && existing.value.size === file.size && (await fileHash(destination)) === file.sha256) {
          continue;
        }
        await mkdir(path.dirname(destination), {recursive: true});
        const temporary = `${destination}.download`;
        try {
          const response = await fetch(
            `https://huggingface.co/${model.repository}/resolve/${model.revision}/${file.path}`,
            {signal: AbortSignal.timeout(downloadTimeoutMs)},
          );
          if (!response.ok || isNull(response.body)) {
            throw new Error(`${model.id}/${file.path}: HTTP ${response.status}`);
          }
          const hash = createHash('sha256');
          let bytes = 0;
          const verify = new Transform({
            transform(chunk, _encoding, callback) {
              hash.update(chunk);
              bytes += chunk.length;
              callback(null, chunk);
            },
          });
          await pipeline(response.body, verify, createWriteStream(temporary));
          if (bytes !== file.size || hash.digest('hex') !== file.sha256) {
            throw new Error(`${model.id}/${file.path}: checksum or size mismatch`);
          }
          await rename(temporary, destination);
          console.info(`Verified ${model.id}/${file.path}`);
        } finally {
          await rm(temporary, {force: true});
        }
      }
    }),
  );
});
if (prepared.isErr) {
  console.error(prepared.error);
  process.exitCode = 1;
} else {
  console.info('All note taker model files are ready for Git LFS.');
}
