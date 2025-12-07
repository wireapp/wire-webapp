/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ENCRYPTED_BACKUP_FORMAT} from 'Repositories/backup/BackUpHeader';
import {isCPBackup, peekCrossPlatformData} from 'Repositories/backup/CrossPlatformBackup';

export const checkBackupEncryption = async (data: ArrayBuffer | Blob): Promise<boolean> => {
  if (data instanceof Blob) {
    data = await readBlobAsArrayBuffer(data);
  }

  if (await isCPBackup(data)) {
    const peekedData = await peekCrossPlatformData(data);
    return peekedData.isEncrypted;
  }

  const fileBytes = await getFileBytes(data);
  const encrptedFileFormat = new TextEncoder().encode(ENCRYPTED_BACKUP_FORMAT);

  for (let i = 0; i < encrptedFileFormat.length; i++) {
    const eachFileByte = fileBytes[i];
    const encrptedFileByte = encrptedFileFormat[i];
    if (eachFileByte !== encrptedFileByte) {
      // The number doesn't match, indicating the file is not encrypted
      return false;
    }
  }
  // All file format bytes match, indicating the file is encrypted
  return true;
};

const getFileBytes = async (data: ArrayBuffer | Blob): Promise<Uint8Array> => {
  if (data instanceof ArrayBuffer) {
    return Promise.resolve(new Uint8Array(data));
  }
  return Promise.reject(new Error('Invalid data type. Expected ArrayBuffer.'));
};

const readBlobAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};
