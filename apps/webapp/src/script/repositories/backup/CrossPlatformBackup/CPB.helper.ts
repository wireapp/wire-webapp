/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import Dexie from 'dexie';
import {ClientEvent} from 'Repositories/event/Client';
import {getLogger} from 'Util/Logger';

import {CPBackupImporter, BackupPeekResult, isCreatedBySameUser, BackupQualifiedId} from './CPB.library';

import {BackupService} from '../BackupService';
import {IncompatibleBackupError} from '../Error';

export const CPBLogger = getLogger('wire:backup:CPB');

export const isCPBackup = async (data: ArrayBuffer | Blob): Promise<boolean> => {
  if (!(data instanceof ArrayBuffer)) {
    return false;
  }
  const backupImporter = new CPBackupImporter();
  const backupData = new Uint8Array(data);
  const result = await backupImporter.peekFileData(backupData);
  if (result instanceof BackupPeekResult.Failure) {
    return false;
  }
  if (result instanceof BackupPeekResult.Success) {
    CPBLogger.log(`Backup version: ${result.version}`);
    return true;
  }
  return false;
};

export const peekCrossPlatformData = async (
  fileBytes: ArrayBuffer,
  userId?: BackupQualifiedId,
): Promise<{
  archiveVersion: string;
  isEncrypted: boolean;
  isUserBackup: boolean;
}> => {
  const backupImporter = new CPBackupImporter();
  const backupData = new Uint8Array(fileBytes);
  const result = await backupImporter.peekFileData(backupData);
  if (result instanceof BackupPeekResult.Failure) {
    CPBLogger.log(`Could not peek into backup: ${result}`);
    throw new IncompatibleBackupError('Incompatible cross-platform backup');
  }
  if (result instanceof BackupPeekResult.Success) {
    const isUserBackup = userId ? await isCreatedBySameUser(result, userId) : false;

    CPBLogger.log(`Backup version: ${result.version}`);
    return {
      archiveVersion: result.version,
      isEncrypted: result.isEncrypted,
      isUserBackup: isUserBackup,
    };
  }
  throw new IncompatibleBackupError('Incompatible cross-platform backup');
};

export const isMessageAddEvent = (eventType: unknown): boolean =>
  eventType === ClientEvent.CONVERSATION.MESSAGE_ADD.toString();
export const isAssetAddEvent = (eventType: unknown): boolean =>
  eventType === ClientEvent.CONVERSATION.ASSET_ADD.toString();
export const isLocationAddEvent = (eventType: unknown): boolean =>
  eventType === ClientEvent.CONVERSATION.LOCATION.toString();
export const isSupportedEventType = (eventType: string): boolean =>
  isMessageAddEvent(eventType) || isAssetAddEvent(eventType) || isLocationAddEvent(eventType);

interface ExportTableParams<T> {
  backupService: BackupService;
  table: Dexie.Table<T>;
  preprocessor: (tableRows: any[]) => any[];
}
export const exportTable = async <T>({backupService, preprocessor, table}: ExportTableParams<T>) => {
  const tableData: T[] = [];

  await backupService.exportTable(table, tableRows => {
    const processedData = preprocessor(tableRows);
    tableData.push(...processedData);
  });

  return tableData;
};
