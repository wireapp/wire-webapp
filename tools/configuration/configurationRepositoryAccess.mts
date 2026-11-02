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

import {isNull, isUndefined} from '@sindresorhus/is';
import axios from 'axios';
import copy from 'copy';
import fsExtra from 'fs-extra';
import JSZip from 'jszip';
import {rimraf} from 'rimraf';
import type VinylFile from 'vinyl';

import {exec} from 'node:child_process';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';

type ShellCommandOutput = {
  readonly stdout: string;
  readonly stderr: string;
};

export async function copyMatchingFiles(sourcePattern: string, destinationPath: string): Promise<VinylFile[]> {
  if (pathHasFileExtension(destinationPath)) {
    await fsExtra.ensureDir(path.dirname(destinationPath));
  } else {
    await fsExtra.ensureDir(destinationPath);
  }

  return new Promise((resolve, reject) => {
    copy(sourcePattern, destinationPath, (copyOperationError, copiedVinylFiles = []) => {
      if (Boolean(copyOperationError)) {
        reject(copyOperationError);

        return;
      }

      resolve(copiedVinylFiles);
    });
  });
}

export async function downloadConfigurationZip(archiveUrl: string, configurationDirectoryPath: string): Promise<void> {
  const zipArchivePath = path.join(configurationDirectoryPath, 'archive.zip');
  await fsExtra.ensureDir(configurationDirectoryPath);

  const configurationArchiveResponse = await axios.request({
    method: 'get',
    responseType: 'stream',
    url: archiveUrl,
  });
  const zipArchiveWriter = fsExtra.createWriteStream(zipArchivePath);
  await pipeline(configurationArchiveResponse.data, zipArchiveWriter);

  await extractZipArchive(zipArchivePath, configurationDirectoryPath);
  await fsExtra.remove(zipArchivePath);
}

export async function extractZipArchive(zipArchivePath: string, destinationDirectoryPath: string): Promise<void> {
  const zipArchive = new JSZip();
  await fsExtra.ensureDir(destinationDirectoryPath);

  const zipArchiveContents = await fsExtra.readFile(zipArchivePath);
  const zipArchiveEntries: [string, JSZip.JSZipObject][] = [];

  await zipArchive.loadAsync(zipArchiveContents, {createFolders: true});
  zipArchive.forEach((zipArchiveEntryPath, zipArchiveEntry) => {
    zipArchiveEntries.push([zipArchiveEntryPath, zipArchiveEntry]);
  });
  const firstZipArchiveEntry = zipArchiveEntries[0];
  if (isUndefined(firstZipArchiveEntry)) {
    throw new Error('The archive contains no entries');
  }
  const topLevelArchiveEntryPath = firstZipArchiveEntry[0];

  await Promise.all(
    zipArchiveEntries.map(async ([zipArchiveEntryPath, zipArchiveEntry]) => {
      const resolvedFilePath = path.join(
        destinationDirectoryPath,
        zipArchiveEntryPath.replace(topLevelArchiveEntryPath, ''),
      );
      if (zipArchiveEntry.dir) {
        await fsExtra.ensureDir(resolvedFilePath);
      } else {
        const zipArchiveEntryContents = await zipArchiveEntry.async('nodebuffer');
        await fsExtra.writeFile(resolvedFilePath, zipArchiveEntryContents);
      }
    }),
  );
}

export function pathHasFileExtension(configurationPath: string): boolean {
  return /\w\.\w+$/.test(configurationPath);
}

export function removePathRecursively(pathToRemove: string): Promise<boolean> {
  return rimraf(pathToRemove);
}

export function executeShellCommand(shellCommand: string): Promise<ShellCommandOutput> {
  return new Promise((resolve, reject): void => {
    exec(shellCommand, {encoding: 'utf8'}, (shellCommandError, standardOutput, standardError): void => {
      if (!isNull(shellCommandError)) {
        reject(shellCommandError);

        return;
      }

      resolve({stdout: standardOutput, stderr: standardError});
    });
  });
}
