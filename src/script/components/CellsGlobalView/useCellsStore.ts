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

interface PublicLink {
  uuid: string;
  url: string;
}

interface File {
  id: string;
  mimeType: string;
  name: string;
  sizeMb: string;
  previewUrl: string;
  uploadedAt: string;
  publicLink?: PublicLink;
}

interface CellsState {
  files: File[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: Error | null;
  setFiles: (files: File[]) => void;
  setStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void;
  setError: (error: Error | null) => void;
  updateFile: (fileId: string, updates: Partial<File>) => void;
  clearAll: () => void;
}

export const useCellsStore = create<CellsState>(set => ({
  files: [],
  status: 'idle',
  error: null,
  setFiles: files => set({files}),
  setStatus: status => set({status}),
  setError: error => set({error}),
  updateFile: (fileId, updates) =>
    set(state => ({
      files: state.files.map(file => (file.id === fileId ? {...file, ...updates} : file)),
    })),
  clearAll: () => set({files: [], status: 'idle', error: null}),
}));
