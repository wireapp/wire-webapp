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

import {CellFile} from '../cellFile/cellFile';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface CellsState {
  filesByConversation: Record<string, CellFile[]>;
  status: Status;
  error: Error | null;
  setFiles: (params: {conversationId: string; files: CellFile[]}) => void;
  setStatus: (status: Status) => void;
  setError: (error: Error | null) => void;
  updateFile: (params: {conversationId: string; fileId: string; updates: Partial<CellFile>}) => void;
  removeFile: (params: {conversationId: string; fileId: string}) => void;
  clearAll: (params: {conversationId: string}) => void;
  getFiles: (params: {conversationId: string}) => CellFile[];
}

export const useCellsStore = create<CellsState>((set, get) => ({
  filesByConversation: {},
  status: 'idle',
  error: null,
  setFiles: ({conversationId, files}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]: files,
      },
    })),
  setStatus: status => set({status}),
  setError: error => set({error}),
  updateFile: ({conversationId, fileId, updates}) =>
    set(state => ({
      filesByConversation: {
        ...state.filesByConversation,
        [conversationId]:
          state.filesByConversation[conversationId]?.map(file => (file.id === fileId ? {...file, ...updates} : file)) ||
          [],
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
}));
