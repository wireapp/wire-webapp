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

import {User} from 'Repositories/entity/User';

import {ProgressCallback} from '../Backup.types';
import {BackupService} from '../BackupService';

export interface ExportHistoryFromDatabaseParams {
  backupService: BackupService;
  progressCallback: ProgressCallback;
  user: User;
  password: string;
  checkCancelStatus: () => boolean;
}

export interface ImportHistoryToDatabaseParams {
  user: User;
  backupService: BackupService;
  fileBytes: ArrayBuffer;
  password?: string;
  progressCallback: ProgressCallback;
}

interface commonAsset {
  name: string | null;
}
export type ImageAsset = commonAsset & {
  height: number;
  width: number;
  tag: string;
};
export type AudioAsset = commonAsset & {
  normalization: Int8Array | null;
  duration: any;
};
export type FileAsset = commonAsset;
export type VideoAsset = commonAsset;
export type TextAsset = commonAsset;
export type UndefinedAsset = commonAsset;
export type OtherAsset = commonAsset;
