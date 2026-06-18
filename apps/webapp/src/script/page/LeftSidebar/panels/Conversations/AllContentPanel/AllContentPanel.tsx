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

import {
  KeyboardEvent as ReactKeyBoardEvent,
  MouseEvent as ReactMouseEvent,
  MutableRefObject,
  useCallback,
  useMemo,
} from 'react';

import {ConversationListCell} from 'Components/ConversationListCell';
import {
  ThreadAuthorLabelData,
  ThreadIndexEntry,
  getScopedThreadRows,
  useThreadIndexStore,
} from 'Components/MessagesList/threading/threadIndexStore';
import {isActiveThreadRow} from 'Components/MessagesList/threading/threadRouteUtils';
import {Call} from 'Repositories/calling/Call';
import {CallState} from 'Repositories/calling/CallState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {isKeyboardEvent} from 'Util/keyboardUtil';
import {t} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {ConnectionRequests} from '../ConnectionRequests';
import {ThreadListItem} from '../ThreadListItem';
import {buildMergedAllListItems} from '../conversationListFilterUtils';

import {emptyState, list, noResultsMessage, panelContainer} from './AllContentPanel.styles';

import {generateConversationUrl} from '../../../../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../../../../router/routerBindings';
import {ListViewModel} from '../../../../../view_model/ListViewModel';
import {useAppMainState, ViewType} from '../../../../state';
import {ContentState} from '../../../../useAppState';

type AllContentPanelProps = {
  conversations: Conversation[];
  conversationIds: string[];
  conversationsFilter: string;
  connectRequests: User[];
  listViewModel: ListViewModel;
  callState: CallState;
  conversationState: ConversationState;
  currentFocus: string;
  handleArrowKeyDown: (index: number) => (event: ReactKeyBoardEvent) => void;
  resetConversationFocus: () => void;
  clearSearchFilter: () => void;
  searchInputRef: MutableRefObject<HTMLInputElement | null>;
  onOpenThread?: (thread: ThreadIndexEntry) => void;
  conversationLabelsById?: Record<string, string>;
  authorLabelsById?: Record<string, ThreadAuthorLabelData | string>;
  conversationsById?: Record<string, Conversation>;
};

export const AllContentPanel = ({
  conversations,
  conversationIds,
  conversationsFilter,
  connectRequests,
  listViewModel,
  callState,
  conversationState,
  currentFocus,
  handleArrowKeyDown,
  resetConversationFocus,
  clearSearchFilter,
  searchInputRef,
  onOpenThread,
  conversationLabelsById = {},
  authorLabelsById = {},
  conversationsById = {},
}: AllContentPanelProps) => {
  const {setCurrentView} = useAppMainState(state => state.responsiveView);
  const activeThreadRootMessage = useAppMainState(state => state.conversationThread.rootMessage);
  const threadsByKey = useThreadIndexStore(state => state.threadsByKey);
  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const scopedThreadRows = useMemo(
    () =>
      getScopedThreadRows(useThreadIndexStore.getState(), conversationIds, {
        conversationLabelsById,
        authorLabelsById,
      }),
    [authorLabelsById, conversationIds, conversationLabelsById, threadsByKey],
  );

  const mergedItems = useMemo(
    () => buildMergedAllListItems(conversations, scopedThreadRows, conversationsFilter),
    [conversations, conversationsFilter, scopedThreadRows],
  );

  const isActiveConversation = useCallback(
    (conversation: Conversation) => {
      if (activeThreadRootMessage) {
        return false;
      }

      return conversationState.isActiveConversation(conversation);
    },
    [activeThreadRootMessage, conversationState],
  );

  const openContextMenu = useCallback(
    (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) =>
      listViewModel.onContextMenu(conversation, event),
    [listViewModel],
  );

  const answerCall = useCallback(
    (conversation: Conversation) => listViewModel.answerCall(conversation),
    [listViewModel],
  );

  const hasJoinableCall = useCallback(
    (conversation: Conversation) => {
      const call = joinableCalls.find((callInstance: Call) =>
        matchQualifiedIds(callInstance.conversation.qualifiedId, conversation.qualifiedId),
      );

      return !!call && !conversation.isSelfUserRemoved();
    },
    [joinableCalls],
  );

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const onConversationClick = useCallback(
    (conversation: Conversation) =>
      (event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>) => {
        if (isKeyboardEvent(event)) {
          createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
        } else {
          createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
        }

        clearSearchFilter();
      },
    [clearSearchFilter],
  );

  const conversationItems = mergedItems.filter(item => item.kind === 'conversation');
  const hasSearchQuery = conversationsFilter.trim().length > 0;
  const hasNoSearchResults = hasSearchQuery && mergedItems.length === 0;

  if (!mergedItems.length && !connectRequests.length) {
    return (
      <div className="left-list-no-conversations" css={emptyState} data-uie-name="all-content-placeholder-panel">
        <h2>No items found</h2>
        <p>{hasSearchQuery ? 'No conversations or threads match your search.' : 'Nothing in this section yet.'}</p>
      </div>
    );
  }

  return (
    <div css={panelContainer} data-uie-name="all-content-panel">
      <ConnectionRequests connectionRequests={connectRequests} onConnectionRequestClick={onConnectionRequestClick} />

      {hasNoSearchResults && <p css={noResultsMessage}>{t('searchConversationsNoResult')}</p>}

      <ul css={list} data-uie-name="all-content-list">
        {mergedItems.map(item => {
          if (item.kind === 'thread') {
            return (
              <ThreadListItem
                key={`thread:${item.thread.conversationId}:${item.thread.threadId}`}
                thread={item.thread}
                conversation={conversationsById[item.thread.conversationId]}
                isActive={isActiveThreadRow(item.thread, activeThreadRootMessage)}
                onClick={onOpenThread}
              />
            );
          }

          const conversationIndex = conversationItems.findIndex(
            conversationItem => conversationItem.conversation.id === item.conversation.id,
          );

          return (
            <ConversationListCell
              key={`conversation:${item.conversation.id}`}
              conversation={item.conversation}
              dataUieName="item-conversation"
              onClick={onConversationClick(item.conversation)}
              isSelected={isActiveConversation}
              onJoinCall={answerCall}
              rightClick={openContextMenu}
              showJoinButton={hasJoinableCall(item.conversation)}
              handleArrowKeyDown={handleArrowKeyDown(conversationIndex)}
              isFocused={
                document.activeElement !== searchInputRef.current &&
                !conversationsFilter &&
                currentFocus === item.conversation.id
              }
              resetConversationFocus={resetConversationFocus}
            />
          );
        })}
      </ul>
    </div>
  );
};
