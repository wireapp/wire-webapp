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

import {create} from 'zustand';

<<<<<<< HEAD
import {CellItem} from '../cellFile/cellFile';
=======
import {CellFile, CellFolder} from '../cellFile/cellFile';
>>>>>>> 98649367b (feat: fetch folders)
import {CellPagination} from '../cellPagination/cellPagination';

type Status = 'idle' | 'loading' | 'success' | 'error';

const DEFAULT_PAGE_SIZE = 50;

interface CellsState {
  filesByConversation: Record<string, CellItem[]>;
  paginationByConversation: Record<string, CellPagination | null>;
  status: Status;
  error: Error | null;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  setFiles: (params: {conversationId: string; files: CellItem[]}) => void;
  setPagination: (params: {conversationId: string; pagination: CellPagination | null}) => void;
  setStatus: (status: Status) => void;
  setError: (error: Error | null) => void;
  setPublicLink: (params: {conversationId: string; fileId: string; data: CellItem['publicLink']}) => void;
  removeFile: (params: {conversationId: string; fileId: string}) => void;
  clearAll: (params: {conversationId: string}) => void;
  getFiles: (params: {conversationId: string}) => CellItem[];
  getPagination: (params: {conversationId: string}) => CellPagination | null;
}

export const useCellsStore = create<CellsState>((set, get) => ({
  filesByConversation: {},
  paginationByConversation: {},
  status: 'idle',
  error: null,
  pageSize: DEFAULT_PAGE_SIZE,
  setFiles: ({conversationId, files}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]: files,
      },
    })),
  setPageSize: pageSize => set({pageSize}),
  setPagination: ({conversationId, pagination}) =>
    set(state => ({
      paginationByConversation: {
        ...state.paginationByConversation,
        [conversationId]: pagination,
      },
    })),
  setStatus: status => set({status}),
  setError: error => set({error}),
  setPublicLink: ({conversationId, fileId, data}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]:
          state.filesByConversation[conversationId]?.map(file =>
            file.id === fileId
              ? {
                  ...file,
                  publicLink: data,
                }
              : file,
          ) || [],
      },
    })),
  removeFile: ({conversationId, fileId}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]: state.filesByConversation[conversationId]?.filter(file => file.id !== fileId) || [],
      },
    })),
  clearAll: ({conversationId}) => {
    const state = get();
    const updatedFilesByConversation = {...state.filesByConversation};
    delete updatedFilesByConversation[conversationId];
    set({filesByConversation: updatedFilesByConversation, status: 'idle', error: null});
  },
  getFiles: ({conversationId}) => {
    const state = get().filesByConversation;
    return state[conversationId] || [];
  },
  getPagination: ({conversationId}) => {
    const state = get().paginationByConversation;
    return state[conversationId] || [];
  },
}));
