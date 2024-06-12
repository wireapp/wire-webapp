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
import {persist, createJSONStorage} from 'zustand/middleware';

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

const useFolderState = create<FolderState>((set, get) => ({
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

export enum SidebarTabs {
  RECENT,
  FOLDER,
  FAVORITES,
  GROUPS,
  DIRECTS,
  ARCHIVES,
  CONNECT,
  PREFERENCES,
}

export const SidebarOpenStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  MANUAL_OPEN: 'MANUAL_OPEN',
  MANUAL_CLOSED: 'MANUAL_CLOSED',
} as const;

export type SidebarOpenStatus = (typeof SidebarOpenStatus)[keyof typeof SidebarOpenStatus];

export interface SidebarStore {
  openStatus: SidebarOpenStatus;
  setOpenStatus: (status: SidebarOpenStatus) => void;
  toggleOpenStatus: () => void;
  currentTab: SidebarTabs;
  isOpen: (openStatus: SidebarOpenStatus) => boolean;
  setCurrentTab: (tab: SidebarTabs) => void;
}

const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      currentTab: SidebarTabs.RECENT,
      setCurrentTab: (tab: SidebarTabs) => {
        set({currentTab: tab});
      },
      openStatus: SidebarOpenStatus.CLOSED,
      setOpenStatus: status => set({openStatus: status}),
      isOpen: (openStatus: SidebarOpenStatus) => {
        return openStatus === SidebarOpenStatus.MANUAL_OPEN || openStatus === SidebarOpenStatus.OPEN;
      },
      toggleOpenStatus: () => {
        const currentStatus = get().openStatus;
        const newStatus =
          currentStatus === SidebarOpenStatus.MANUAL_OPEN || currentStatus === SidebarOpenStatus.OPEN
            ? SidebarOpenStatus.MANUAL_CLOSED
            : SidebarOpenStatus.MANUAL_OPEN;
        set({openStatus: newStatus});
      },
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({openStatus: state.openStatus}),
    },
  ),
);

export {useFolderState, useSidebarStore};
