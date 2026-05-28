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

import {useCallback} from 'react';

import {useShallow} from 'zustand/react/shallow';

// External
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ANIMATED_PAGE_TRANSITION_DURATION} from 'src/script/page/MainContent';
import {useAppMainState, ViewType} from 'src/script/page/state';

// Ours
import {ContentState, ListState} from '../useAppState';
import {generateExportsListUrl, generateJiraUrl, generateReportsListUrl} from '../../router/routeGenerator';
import {navigate} from '../../router/Router';
import {SidebarTabs, useSidebarStore} from './useSidebarStore';

type SidebarNavigationOptions = {
  /** List-state switcher from ListViewModel */
  switchList: (state: ListState, updateHistory?: boolean) => void;
  /** Content-state switcher from ListViewModel.contentViewModel */
  switchContent: (state: ContentState) => void;
  /** Repository used to fetch archived conversations when that tab is activated */
  conversationRepository: ConversationRepository;
  /** Clears the conversation search filter — called on every tab change */
  onClearFilter: () => void;
  /** Closes the currently expanded folder — called when switching to a tab without a folder ID */
  onCloseFolder: () => void;
};

/**
 * Owns all sidebar tab-navigation logic.
 *
 * Extracted from Conversations.tsx so that adding a new sidebar tab never
 * requires touching conversation-specific code. Conversations.tsx passes in
 * the handful of conversation-owned callbacks; everything else is resolved
 * internally from stores and routers.
 *
 * Returns three stable callbacks:
 * - changeTab         – call on any tab click
 * - onExitPreferences – call when leaving the preferences/cells/AI area
 * - onClickPreferences – call to navigate into a specific preferences section
 */
export const useSidebarNavigation = ({
  switchList,
  switchContent,
  conversationRepository,
  onClearFilter,
  onCloseFolder,
}: SidebarNavigationOptions) => {
  const {setCurrentTab} = useSidebarStore(useShallow(state => ({setCurrentTab: state.setCurrentTab})));
  const {setCurrentView} = useAppMainState(useShallow(state => state.responsiveView));

  const onExitPreferences = useCallback(() => {
    setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
    switchList(ListState.CONVERSATIONS);
    switchContent(ContentState.CONVERSATION);
  }, [setCurrentView, switchList, switchContent]);

  const changeTab = useCallback(
    (nextTab: SidebarTabs, folderId?: string) => {
      if (!folderId) {
        onCloseFolder();
      }

      if (nextTab === SidebarTabs.ARCHIVES) {
        // Loads missing events from the DB for the archived list
        void conversationRepository.updateArchivedConversations();
      }

      // Only tabs that render their own full-screen content skip the preferences teardown
      if (
        ![
          SidebarTabs.PREFERENCES,
          SidebarTabs.CELLS,
          SidebarTabs.AI_REPORT,
          SidebarTabs.AI_JIRA,
          SidebarTabs.AI_EXPORTS,
        ].includes(nextTab)
      ) {
        onExitPreferences();
      }

      if (nextTab === SidebarTabs.CELLS) {
        switchList(ListState.CELLS);
        switchContent(ContentState.CELLS);
      }

      if (nextTab === SidebarTabs.AI_REPORT) {
        switchList(ListState.CONVERSATIONS);
        navigate(generateReportsListUrl());
      }

      if (nextTab === SidebarTabs.AI_JIRA) {
        switchList(ListState.CONVERSATIONS, false);
        navigate(generateJiraUrl());
      }

      if (nextTab === SidebarTabs.AI_EXPORTS) {
        switchList(ListState.CONVERSATIONS, false);
        navigate(generateExportsListUrl());
      }

      onClearFilter();
      setCurrentTab(nextTab);
    },
    [conversationRepository, onCloseFolder, onExitPreferences, switchList, switchContent, onClearFilter, setCurrentTab],
  );

  const onClickPreferences = useCallback(
    (itemId: ContentState) => {
      switchList(ListState.PREFERENCES);
      setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
      switchContent(itemId);

      setTimeout(() => {
        const centerColumn = document.getElementById('center-column');
        const nextElementToFocus = centerColumn?.querySelector("[tabindex='0']") as HTMLElement | null;
        nextElementToFocus?.focus();
      }, ANIMATED_PAGE_TRANSITION_DURATION + 1);
    },
    [switchList, setCurrentView, switchContent],
  );

  return {changeTab, onExitPreferences, onClickPreferences};
};
