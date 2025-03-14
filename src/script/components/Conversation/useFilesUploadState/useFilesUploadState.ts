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

import {create} from 'zustand';

export type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface FileWithPreview extends File {
  id: string;
  preview: string;
  remoteUuid: string;
  remoteVersionId: string;
  uploadStatus: FileUploadStatus;
}

interface FileUploadState {
  files: FileWithPreview[];
  addFiles: (files: FileWithPreview[]) => void;
  deleteFile: (fileId: string) => void;
  updateFile: (
    fileId: string,
    {
      remoteUuid,
      remoteVersionId,
      uploadStatus,
    }: {
      remoteUuid?: string;
      remoteVersionId?: string;
      uploadStatus?: FileUploadStatus;
    },
  ) => void;
}

export const useFileUploadState = create<FileUploadState>(set => ({
  files: [],
  addFiles: newFiles =>
    set(state => ({
      files: [...newFiles, ...state.files],
    })),
  deleteFile: fileId =>
    set(state => ({
      files: state.files.filter(file => file.id !== fileId),
    })),
  updateFile: (fileId, {remoteUuid, remoteVersionId, uploadStatus}) =>
    set(state => ({
      files: state.files.map(file => {
        if (file.id === fileId) {
          file.remoteUuid = remoteUuid || file.remoteUuid;
          file.remoteVersionId = remoteVersionId || file.remoteVersionId;
          file.uploadStatus = uploadStatus || file.uploadStatus;
        }
        return file;
      }),
    })),
}));
