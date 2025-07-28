/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Locator, Page} from '@playwright/test';

import {readFile} from 'fs';
import path from 'path';

export const DownloadFilePath = './test-results/downloads/';

const e2eRootDir = path.join(__dirname, '../');
const fileTransferAssetsDir = path.join(e2eRootDir, 'assets/filetransfer');
const VideoFileName = 'example.mp4';
const AudioFileName = 'example.mp3';
const TextFileName = 'example.txt';

export const readLocalFile = (filePath: string): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

export const getVideoFilePath = () => {
  return path.join(fileTransferAssetsDir, VideoFileName);
};

export const getAudioFilePath = () => {
  return path.join(fileTransferAssetsDir, AudioFileName);
};

export const getTextFilePath = () => {
  return path.join(fileTransferAssetsDir, TextFileName);
};

export const downloadAssetAndGetFilePath = async (page: Page, downloadButtonLocator: Locator): Promise<string> => {
  const downloadPromise = page.waitForEvent('download');
  await downloadButtonLocator.click();
  const download = await downloadPromise;
  const filePath = `${DownloadFilePath}${download.suggestedFilename()}`;
  await download.saveAs(filePath);
  return filePath;
};

export const isAssetDownloaded = async (filePath: string): Promise<boolean> => {
  try {
    const file = await readLocalFile(filePath);
    return !!file;
  } catch (error) {
    return false;
  }
};

export const shareAssetHelper = async (filePath: string, page: Page, buttonLocator: Locator) => {
  const fileChooserPromise = page.waitForEvent('filechooser');
  await buttonLocator.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
};
