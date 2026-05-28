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

export enum ContentState {
  COLLECTION = 'ContentState.COLLECTION',
  COLLECTION_DETAILS = 'ContentState.COLLECTION_DETAILS',
  CONNECTION_REQUESTS = 'ContentState.CONNECTION_REQUESTS',
  CONVERSATION = 'ContentState.CONVERSATION',
  HISTORY_EXPORT = 'ContentState.HISTORY_EXPORT',
  HISTORY_IMPORT = 'ContentState.HISTORY_IMPORT',
  PREFERENCES_ABOUT = 'ContentState.PREFERENCES_ABOUT',
  PREFERENCES_ACCOUNT = 'ContentState.PREFERENCES_ACCOUNT',
  PREFERENCES_AV = 'ContentState.PREFERENCES_AV',
  PREFERENCES_DEVICE_DETAILS = 'ContentState.PREFERENCES_DEVICE_DETAILS',
  PREFERENCES_DEVICES = 'ContentState.PREFERENCES_DEVICES',
  PREFERENCES_OPTIONS = 'ContentState.PREFERENCES_OPTIONS',
  WATERMARK = 'ContentState.WATERMARK',
  CELLS = 'ContentState.CELLS',
  AI_REPORTS_LIST = 'ContentState.AI_REPORTS_LIST',
  AI_REPORT_DETAIL = 'ContentState.AI_REPORT_DETAIL',
  PREFERENCES_AI = 'ContentState.PREFERENCES_AI',
  AI_JIRA = 'ContentState.AI_JIRA',
  AI_EXPORTS_LIST = 'ContentState.AI_EXPORTS_LIST',
  AI_EXPORTS_CREATE = 'ContentState.AI_EXPORTS_CREATE',
  AI_EXPORTS_RESULT = 'ContentState.AI_EXPORTS_RESULT',
}

export enum ListState {
  ARCHIVE = 'ListState.ARCHIVE',
  CONVERSATIONS = 'ListState.CONVERSATIONS',
  PREFERENCES = 'ListState.PREFERENCES',
  START_UI = 'ListState.START_UI',
  TEMPORARY_GUEST = 'ListState.TEMPORARY_GUEST',
  CELLS = 'ListState.CELLS',
}

type AppState = {
  contentState: ContentState;
  setContentState: (contentState: ContentState) => void;
  listState: ListState;
  setListState: (listState: ListState) => void;
  previousContentState: ContentState | null;
  unreadMessagesCount: number;
  setUnreadMessagesCount: (unreadMessagesCount: number) => void;
  activeReportId: string | null;
  setActiveReportId: (id: string | null) => void;
  activeJiraTicketKey: string | null;
  setActiveJiraTicketKey: (key: string | null) => void;
  activeExportId: string | null;
  setActiveExportId: (id: string | null) => void;
  /**
   * returns true if the current active content could display a conversation
   */
  isShowingConversation: () => boolean;
};

const STATE_WITH_CONVERSATION = [ContentState.WATERMARK, ContentState.COLLECTION, ContentState.CONVERSATION];

const useAppState = create<AppState>((set, get) => ({
  contentState: ContentState.WATERMARK,
  listState: ListState.CONVERSATIONS,
  previousContentState: null,
  activeReportId: null,
  setActiveReportId: id => set(state => ({...state, activeReportId: id})),
  activeJiraTicketKey: null,
  setActiveJiraTicketKey: key => set(state => ({...state, activeJiraTicketKey: key})),
  activeExportId: null,
  setActiveExportId: id => set(state => ({...state, activeExportId: id})),
  setContentState: (contentState: ContentState) => {
    const previousContentState = get().contentState;
    set(state => ({
      ...state,
      contentState,
      previousContentState,
    }));
  },
  isShowingConversation() {
    return STATE_WITH_CONVERSATION.includes(get().contentState);
  },
  setListState: (listState: ListState) =>
    set(state => ({
      ...state,
      listState,
    })),
  setUnreadMessagesCount: (unreadMessagesCount: number) =>
    set(state => ({
      ...state,
      unreadMessagesCount,
    })),
  unreadMessagesCount: 0,
}));

export {useAppState};
