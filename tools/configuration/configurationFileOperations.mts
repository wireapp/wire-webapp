/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {isUndefined} from '@sindresorhus/is';
import axios from 'axios';
import copy from 'copy';
import fsExtra from 'fs-extra';
import JSZip from 'jszip';
import {rimraf} from 'rimraf';
import type File from 'vinyl';

import {exec} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';

export async function copyAsync(source: string, destination: string): Promise<File[]> {
  if (isFile(destination)) {
    await fsExtra.ensureDir(path.dirname(destination));
  } else {
    await fsExtra.ensureDir(destination);
  }

  return new Promise((resolve, reject) => {
    return copy(source, destination, (error, files = []) => {
      return Boolean(error) ? reject(error) : resolve(files);
    });
  });
}

export async function downloadFileAsync(url: string, baseDir: string): Promise<void> {
  const zipFile = path.join(baseDir, 'archive.zip');
  await fsExtra.ensureDir(baseDir);

  await new Promise<void>((resolve, reject) => {
    const writer = createWriteStream(zipFile).on('error', reject).on('finish', resolve);

    return axios
      .request({
        method: 'get',
        responseType: 'stream',
        url,
      })
      .then(response => {
        response.data.pipe(writer);
      });
  });

  await extractAsync(zipFile, baseDir);
  await fsExtra.remove(zipFile);
}

export async function extractAsync(zipFile: string, destination: string): Promise<void> {
  const jszip = new JSZip();
  await fsExtra.ensureDir(destination);

  const data = await fsExtra.readFile(zipFile);
  const entries: [string, JSZip.JSZipObject][] = [];

  await jszip.loadAsync(data, {createFolders: true});
  jszip.forEach((filePath, entry) => {
    entries.push([filePath, entry]);
  });
  const firstEntry = entries[0];
  if (isUndefined(firstEntry)) {
    throw new Error('The archive contains no entries');
  }
  const stripEntry = firstEntry[0];

  await Promise.all(
    entries.map(async ([filePath, entry]) => {
      const resolvedFilePath = path.join(destination, filePath.replace(stripEntry, ''));
      if (entry.dir) {
        await fsExtra.ensureDir(resolvedFilePath);
      } else {
        const content = await entry.async('nodebuffer');
        await fsExtra.writeFile(resolvedFilePath, content);
      }
    }),
  );
}

export const isFile = (path: string): boolean => {
  return /\w\.\w+$/.test(path);
};
export const rimrafAsync = rimraf;
export const execAsync = promisify(exec);
