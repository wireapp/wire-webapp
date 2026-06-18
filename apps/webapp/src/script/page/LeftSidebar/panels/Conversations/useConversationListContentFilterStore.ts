/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
import {createJSONStorage, persist} from 'zustand/middleware';

import {SidebarTabs} from './useSidebarStore';

export enum ConversationListContentFilter {
  ALL = 'all',
  CONVERSATIONS = 'conversations',
  THREADS = 'threads',
}

export const CONTENT_FILTER_SECTIONS: readonly SidebarTabs[] = [
  SidebarTabs.RECENT,
  SidebarTabs.FAVORITES,
  SidebarTabs.GROUPS,
  SidebarTabs.CHANNELS,
  SidebarTabs.DIRECTS,
  SidebarTabs.FOLDER,
];

export const supportsConversationListContentFilter = (tab: SidebarTabs): boolean =>
  CONTENT_FILTER_SECTIONS.includes(tab);

type ConversationListContentFilterStore = {
  filtersByTab: Partial<Record<SidebarTabs, ConversationListContentFilter>>;
  getFilterForTab: (tab: SidebarTabs) => ConversationListContentFilter;
  setFilterForTab: (tab: SidebarTabs, filter: ConversationListContentFilter) => void;
};

const DEFAULT_CONTENT_FILTER = ConversationListContentFilter.ALL;

export const useConversationListContentFilterStore = create<ConversationListContentFilterStore>()(
  persist(
    (set, get) => ({
      filtersByTab: {},
      getFilterForTab: tab => {
        if (!supportsConversationListContentFilter(tab)) {
          return DEFAULT_CONTENT_FILTER;
        }

        return get().filtersByTab[tab] ?? DEFAULT_CONTENT_FILTER;
      },
      setFilterForTab: (tab, filter) => {
        if (!supportsConversationListContentFilter(tab)) {
          return;
        }

        set(state => ({
          filtersByTab: {
            ...state.filtersByTab,
            [tab]: filter,
          },
        }));
      },
    }),
    {
      name: 'conversation-list-content-filter-store',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({filtersByTab: state.filtersByTab}),
    },
  ),
);
