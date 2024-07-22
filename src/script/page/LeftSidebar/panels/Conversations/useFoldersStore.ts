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

type FolderState = {
  expandedFolder: string;
  isFoldersTabOpen: boolean;
  isOpen: (folderId: string) => boolean;
  openFolder: (folderId: string) => void;
  closeFolder: () => void;
  toggleFoldersTab: () => void;
};

const openFolder = (folderId: string, state: FolderState): FolderState => {
  return {...state, isFoldersTabOpen: true, expandedFolder: folderId};
};

const closeFolder = (state: FolderState): FolderState => {
  return {...state, expandedFolder: ''};
};

const useFolderStore = create<FolderState>((set, get) => ({
  expandedFolder: '',
  isFoldersTabOpen: false,

  isOpen: folderId => {
    return get().expandedFolder === folderId;
  },

  toggleFoldersTab: () => set(state => ({...state, isFoldersTabOpen: !state.isFoldersTabOpen})),

  openFolder: folderId =>
    set(state => {
      return openFolder(folderId, state);
    }),

  closeFolder: () =>
    set(state => {
      return closeFolder(state);
    }),
}));

export {useFolderStore};
