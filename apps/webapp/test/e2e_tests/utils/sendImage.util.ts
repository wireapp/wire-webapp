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

import Jimp from 'jimp';
import QRCode from 'qrcode-reader';

import path from 'path';

import {readLocalFile} from './asset.util';

const e2eRootDir = path.join(__dirname, '../');
const fileTransferAssetsDir = path.join(e2eRootDir, 'assets/filetransfer');

export const ImageQRCodeFileName = 'qrcode.jpg';

const getQRCodeValue = async (imageBuffer: Buffer): Promise<string> => {
  const image = await Jimp.read(imageBuffer);
  const qrCode = new QRCode();
  return await new Promise<string>((resolve, reject) => {
    qrCode.callback = (error, value) => {
      if (error !== null && error !== undefined) {
        reject(error);
      } else if (value === null || value === undefined) {
        reject(new Error('No QR code was found in the image.'));
      } else {
        resolve(value.result);
      }
    };
    qrCode.decode(image.bitmap);
  });
};

export const getImageFilePath = (): string => {
  return path.join(fileTransferAssetsDir, ImageQRCodeFileName);
};

export const getLocalQRCodeValue = async (imageFilePath: string): Promise<string> => {
  const imageBuffer = await readLocalFile(imageFilePath);
  if (!imageBuffer) {
    throw new Error(`Image file not found at path: ${imageFilePath}`);
  }

  return await getQRCodeValue(imageBuffer);
};

export const getQRCodeValueFromScreenshot = async (screenshot: Buffer): Promise<string> => {
  return await getQRCodeValue(screenshot);
};
