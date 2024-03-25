/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
  expandedFolders: string[];
  isOpen: (folderId: string) => boolean;
  openFolder: (folderId: string) => void;
  toggleFolder: (folderId: string) => void;
};

const openFolder = (folderId: string, state: FolderState) => {
  return {...state, expandedFolders: state.expandedFolders.concat(folderId)};
};

const closeFolder = (folderId: string, state: FolderState) => {
  return {...state, expandedFolders: state.expandedFolders.filter(id => id !== folderId)};
};

const useFolderState = create<FolderState>((set, get) => ({
  expandedFolders: [],

  isOpen: folderId => {
    return get().expandedFolders.includes(folderId);
  },

  openFolder: folderId =>
    set(state => {
      return get().isOpen(folderId) ? state : openFolder(folderId, state);
    }),

  toggleFolder: folderId =>
    set(state => {
      return get().isOpen(folderId) ? closeFolder(folderId, state) : openFolder(folderId, state);
    }),
}));

export {useFolderState};
