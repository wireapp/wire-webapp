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
  uploadProgress: number;
  image?: {
    width: number;
    height: number;
  };
  audio?: {
    durationInMillis?: number;
    normalizedLoudness?: Uint8Array;
  };
  video?: {
    width: number;
    height: number;
    durationInMillis?: number;
  };
}

interface FileUploadState {
  filesByConversation: Record<string, FileWithPreview[]>;
  addFiles: ({conversationId, files}: {conversationId: string; files: FileWithPreview[]}) => void;
  deleteFile: ({conversationId, fileId}: {conversationId: string; fileId: string}) => void;
  updateFile: ({
    conversationId,
    fileId,
    data,
  }: {
    conversationId: string;
    fileId: string;
    data: {
      remoteUuid?: string;
      remoteVersionId?: string;
      uploadStatus?: FileUploadStatus;
      image?: {
        width: number;
        height: number;
      };
      audio?: {
        durationInMillis?: number;
        normalizedLoudness?: Uint8Array;
      };
      video?: {
        width: number;
        height: number;
        durationInMillis?: number;
      };
      uploadProgress?: number;
    };
  }) => void;
  clearAll: ({conversationId}: {conversationId: string}) => void;
  getFiles: ({conversationId}: {conversationId: string}) => FileWithPreview[];
}

type FileUploadStore = FileUploadState;

export const useFileUploadState = create<FileUploadStore>()((set, get) => ({
  filesByConversation: {},
  addFiles: ({conversationId, files}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]: [...(state.filesByConversation[conversationId] || []), ...files],
      },
    })),
  deleteFile: ({conversationId, fileId}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]: state.filesByConversation[conversationId]?.filter(file => file.id !== fileId) || [],
      },
    })),
  updateFile: ({conversationId, fileId, data}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]:
          state.filesByConversation[conversationId]?.map(file => {
            if (file.id === fileId) {
              file.remoteUuid = data.remoteUuid || file.remoteUuid;
              file.remoteVersionId = data.remoteVersionId || file.remoteVersionId;
              file.uploadStatus = data.uploadStatus || file.uploadStatus;
              file.image = data.image || file.image;
              file.audio = data.audio || file.audio;
              file.video = data.video || file.video;
              file.uploadProgress = data.uploadProgress || file.uploadProgress;
            }
            return file;
          }) || [],
      },
    })),
  clearAll: ({conversationId}) => {
    const state = get();
    const updatedFilesByConversation = {...state.filesByConversation};
    delete updatedFilesByConversation[conversationId];
    set({filesByConversation: updatedFilesByConversation});
  },
  getFiles: ({conversationId}) => {
    const state = get().filesByConversation;
    return state[conversationId] || [];
  },
}));
