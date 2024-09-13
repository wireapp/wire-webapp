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
import {persist, createJSONStorage} from 'zustand/middleware';

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

export const SidebarStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;

export type SidebarStatus = (typeof SidebarStatus)[keyof typeof SidebarStatus];

export interface SidebarStore {
  status: SidebarStatus;
  setStatus: (status: SidebarStatus) => void;
  currentTab: SidebarTabs;
  setCurrentTab: (tab: SidebarTabs) => void;
}

const useSidebarStore = create<SidebarStore>()(
  persist(
    set => ({
      currentTab: SidebarTabs.RECENT,
      setCurrentTab: (tab: SidebarTabs) => {
        set({currentTab: tab});
      },
      status: SidebarStatus.OPEN,
      setStatus: status => set({status: status}),
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        status: state.status,
        currentTab: [SidebarTabs.PREFERENCES, SidebarTabs.CONNECT].includes(state.currentTab)
          ? SidebarTabs.RECENT
          : state.currentTab,
      }),
    },
  ),
);

export {useSidebarStore};
