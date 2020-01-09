/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import * as SparkMD5 from 'spark-md5';

// Note: In favour of 'TextDecoder' which is not supported in MS Edge
export const bufferToString = (buffer: ArrayBuffer): string => {
  let binaryString = '';
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.length; index++) {
    binaryString += String.fromCharCode(bytes[index]);
  }

  return binaryString;
};

export const base64MD5FromBuffer = (buffer: ArrayBuffer) => window.btoa(SparkMD5.ArrayBuffer.hash(buffer, true));

export const concatToBuffer = (...items: any[]) => new Blob(items);
