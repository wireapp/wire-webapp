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
  CHANNELS,
  DIRECTS,
  UNREAD,
  MENTIONS,
  REPLIES,
  DRAFTS,
  PINGS,
  ARCHIVES,
  CONNECT,
  PREFERENCES,
  CELLS,
}

/**
 * Tabs that are always visible and cannot be hidden by the user.
 * RECENT tab serves as the default view and fallback when users (accidentally)
 * hide their currently active tab.
 */
export const ALWAYS_VISIBLE_TABS: readonly SidebarTabs[] = [SidebarTabs.RECENT];

export const isTabVisible = (tab: SidebarTabs, visibleTabs: SidebarTabs[]): boolean => {
  return ALWAYS_VISIBLE_TABS.includes(tab) || visibleTabs.includes(tab);
};

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
  visibleTabs: SidebarTabs[];
  setVisibleTabs: (tabs: SidebarTabs[]) => void;
  toggleTabVisibility: (tab: SidebarTabs) => void;
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
      visibleTabs: [
        SidebarTabs.RECENT,
        SidebarTabs.FOLDER,
        SidebarTabs.FAVORITES,
        SidebarTabs.GROUPS,
        SidebarTabs.CHANNELS,
        SidebarTabs.DIRECTS,
        SidebarTabs.UNREAD,
        SidebarTabs.MENTIONS,
        SidebarTabs.REPLIES,
        SidebarTabs.DRAFTS,
        SidebarTabs.PINGS,
        SidebarTabs.ARCHIVES,
      ],
      setVisibleTabs: (tabs: SidebarTabs[]) => set({visibleTabs: tabs}),
      toggleTabVisibility: (tab: SidebarTabs) => {
        if (ALWAYS_VISIBLE_TABS.includes(tab)) {
          return;
        }

        set(state => {
          const isCurrentlyVisible = state.visibleTabs.includes(tab);
          const isActiveTab = state.currentTab === tab;

          if (isCurrentlyVisible && isActiveTab) {
            return {
              currentTab: SidebarTabs.RECENT,
              visibleTabs: state.visibleTabs.filter(visibleTab => visibleTab !== tab),
            };
          }

          const newVisibleTabs = isCurrentlyVisible
            ? state.visibleTabs.filter(visibleTab => visibleTab !== tab)
            : [...state.visibleTabs, tab];

          return {visibleTabs: newVisibleTabs};
        });
      },
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        status: state.status,
        currentTab: [SidebarTabs.PREFERENCES, SidebarTabs.CONNECT, SidebarTabs.CELLS].includes(state.currentTab)
          ? SidebarTabs.RECENT
          : state.currentTab,
        visibleTabs: state.visibleTabs,
      }),
    },
  ),
);

export {useSidebarStore};
