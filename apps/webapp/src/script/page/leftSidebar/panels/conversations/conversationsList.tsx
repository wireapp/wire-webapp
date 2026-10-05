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

import React, {
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyBoardEvent,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  RefObject,
} from 'react';

import {isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';
import {useVirtualizer} from '@tanstack/react-virtual';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {useDebouncedCallback} from 'use-debounce';

import {WIDTH} from '@wireapp/react-ui-kit';

import {ConversationListCell} from 'Components/conversationListCell';
import type {RegisterConversationElement} from 'Hooks/useConversationFocus';
import {Call} from 'Repositories/calling/call';
import {CallState} from 'Repositories/calling/callState';
import {ConversationLabel, ConversationLabelRepository} from 'Repositories/conversation/conversationLabelRepository';
import {ConversationState} from 'Repositories/conversation/conversationState';
import {Conversation} from 'Repositories/entity/conversation';
import {User} from 'Repositories/entity/user';
import {useSidebarStore} from 'src/script/page/leftSidebar/panels/conversations/useSidebarStore';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {isKeyboardEvent} from 'Util/keyboardUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';
import {isConversationEntity} from 'Util/typePredicateUtil';

import {ConnectionRequests} from './connectionRequests';
import {
  conversationsList,
  headingTitle,
  noResultsMessage,
  virtualizationSpacerStyles,
  virtualizationStyles,
} from './conversationsList.styles';
import {getConversationsToDisplay} from './helpers';

import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigate, createNavigateKeyboard} from '../../../../router/routerBindings';
import {ListViewModel} from '../../../../viewModel/listViewModel';
import {useAppMainState, ViewType} from '../../../state';
import {ContentState} from '../../../useAppState';

const CONVERSATION_ROW_HEIGHT = 56;
const CONVERSATION_CLICK_DEBOUNCE_DIVISOR = 2;
type FocusConversation = (conversationId: string) => boolean | 'pending';

interface ConversationsListProps {
  callState: CallState;
  connectRequests: User[];
  conversations: Conversation[];
  conversationState: ConversationState;
  listViewModel: ListViewModel;
  conversationLabelRepository: ConversationLabelRepository;
  currentFocus: string;
  conversationsFilter: string;
  conversationFocusCandidates: Conversation[];
  currentFolder?: ConversationLabel;
  resetConversationFocus: () => void;
  handleArrowKeyDown: (conversationId: string) => (e: React.KeyboardEvent) => void;
  registerConversationElement?: RegisterConversationElement;
  focusMountedConversation?: FocusConversation;
  onConversationFocused?: (conversationId: string) => void;
  clearSearchFilter: () => void;
  groupParticipantsConversations: Conversation[];
  isGroupParticipantsVisible: boolean;
  isEmpty: boolean;
  focusConversationRef?: RefObject<FocusConversation | null>;
  cancelPendingFocusRef?: RefObject<(() => void) | null>;
}

export const ConversationsList = ({
  conversations,
  conversationsFilter,
  conversationFocusCandidates,
  listViewModel,
  connectRequests,
  conversationState,
  callState,
  currentFocus,
  currentFolder,
  resetConversationFocus,
  handleArrowKeyDown,
  clearSearchFilter,
  groupParticipantsConversations,
  isGroupParticipantsVisible,
  isEmpty,
  focusConversationRef,
  cancelPendingFocusRef,
  registerConversationElement,
  focusMountedConversation,
  onConversationFocused,
}: ConversationsListProps) => {
  const {translate} = useApplicationContext();
  const {setCurrentView} = useAppMainState(state => {
    return state.responsiveView;
  });
  const {currentTab} = useSidebarStore();

  const [clickedFilteredConversationId, setClickedFilteredConversationId] = useState<string | null>(null);

  const {joinableCalls} = useKoSubscribableChildren(callState, ['joinableCalls']);

  const isActiveConversation = useCallback(
    (conversation: Conversation) => {
      return conversationState.isActiveConversation(conversation);
    },
    [conversationState],
  );

  const openContextMenu = useCallback(
    (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      return listViewModel.onContextMenu(conversation, event);
    },
    [listViewModel],
  );

  const answerCall = useCallback(
    (conversation: Conversation) => {
      return listViewModel.answerCall(conversation);
    },
    [listViewModel],
  );

  const hasJoinableCall = useCallback(
    (conversation: Conversation) => {
      const call = joinableCalls.find((callInstance: Call) => {
        return matchQualifiedIds(callInstance.conversation.qualifiedId, conversation.qualifiedId);
      });

      return !isNullOrUndefined(call) && !conversation.isSelfUserRemoved();
    },
    [joinableCalls],
  );

  const onConnectionRequestClick = () => {
    setCurrentView(ViewType.MOBILE_CENTRAL_COLUMN);
    listViewModel.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
  };

  const conversationsToDisplay = getConversationsToDisplay({
    conversations,
    conversationsFilter,
    currentFolder,
    currentTab,
  });
  const focusContextKey = `${currentTab}\u0000${conversationsFilter}\u0000${conversationFocusCandidates
    .map(conversation => {
      return conversation.id;
    })
    .join('\u0000')}`;

  const parentRef = useRef(null);

  const getItemKey = useCallback(
    (index: number) => {
      const item = conversationsToDisplay[index];

      if (isConversationEntity(item)) {
        return item.id;
      }

      if (!isNullOrUndefined(item) && 'heading' in item) {
        return `heading-${item.heading}`;
      }

      return index;
    },
    [conversationsToDisplay],
  );

  const rowVirtualizer = useVirtualizer({
    count: conversationsToDisplay.length,
    getScrollElement: () => {
      return parentRef.current;
    },
    estimateSize: () => {
      return CONVERSATION_ROW_HEIGHT;
    },
    getItemKey,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  const [pendingFocusRequest, setPendingFocusRequest] = useState<{
    conversationId: string;
    contextKey: string;
  } | null>(null);
  const cancelPendingFocus = useCallback(() => {
    setPendingFocusRequest(null);
  }, []);

  useEffect(() => {
    if (isNullOrUndefined(cancelPendingFocusRef)) {
      return;
    }

    cancelPendingFocusRef.current = cancelPendingFocus;
    return () => {
      if (cancelPendingFocusRef.current === cancelPendingFocus) {
        cancelPendingFocusRef.current = null;
      }
    };
  }, [cancelPendingFocus, cancelPendingFocusRef]);
  const handleConversationListFocusOut = useCallback(
    (event: React.FocusEvent<HTMLUListElement>) => {
      const relatedTarget = event.relatedTarget;

      if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
        cancelPendingFocus();
        resetConversationFocus();
      }
    },
    [cancelPendingFocus, resetConversationFocus],
  );
  const focusConversation = useCallback(
    (conversationId: string) => {
      if (focusMountedConversation?.(conversationId) === true) {
        return true;
      }

      const conversationIndex = conversationsToDisplay.findIndex(item => {
        return isConversationEntity(item) && item.id === conversationId;
      });

      if (
        conversationIndex === -1 ||
        !conversationFocusCandidates.some(conversation => {
          return conversation.id === conversationId;
        })
      ) {
        return false;
      }

      rowVirtualizer.scrollToIndex(conversationIndex, {align: 'auto'});
      setPendingFocusRequest({conversationId, contextKey: focusContextKey});
      return 'pending';
    },
    [conversationFocusCandidates, conversationsToDisplay, focusContextKey, focusMountedConversation, rowVirtualizer],
  );

  useEffect(() => {
    if (isNullOrUndefined(focusConversationRef)) {
      return;
    }

    focusConversationRef.current = focusConversation;

    return () => {
      if (focusConversationRef.current === focusConversation) {
        focusConversationRef.current = () => {
          return false;
        };
      }
    };
  }, [focusConversation, focusConversationRef]);

  useLayoutEffect(() => {
    if (isNullOrUndefined(pendingFocusRequest)) {
      return;
    }

    if (pendingFocusRequest.contextKey !== focusContextKey) {
      setPendingFocusRequest(null);
      return;
    }

    const isPendingConversationAvailable =
      conversationsToDisplay.some(item => {
        return isConversationEntity(item) && item.id === pendingFocusRequest.conversationId;
      }) &&
      conversationFocusCandidates.some(conversation => {
        return conversation.id === pendingFocusRequest.conversationId;
      });

    if (!isPendingConversationAvailable) {
      setPendingFocusRequest(null);
      return;
    }

    if (focusMountedConversation?.(pendingFocusRequest.conversationId) === true) {
      onConversationFocused?.(pendingFocusRequest.conversationId);
      setPendingFocusRequest(null);
    }
  }, [
    conversationFocusCandidates,
    conversationsToDisplay,
    focusContextKey,
    focusMountedConversation,
    onConversationFocused,
    pendingFocusRequest,
    virtualItems,
  ]);

  useEffect(() => {
    return cancelPendingFocus;
  }, [cancelPendingFocus, focusContextKey]);

  useEffect(() => {
    return () => {
      return cancelPendingFocus();
    };
  }, [cancelPendingFocus]);

  const debouncedOnConversationClick = useDebouncedCallback(
    (
      conversation: Conversation,
      event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>,
    ) => {
      if (isActiveConversation(conversation)) {
        if (window.innerWidth > WIDTH.TABLET_SM_MAX || document.documentElement.clientWidth > WIDTH.TABLET_SM_MAX) {
          clearSearchFilter();
          setClickedFilteredConversationId(conversation.id);
          return;
        }
      }

      if (isKeyboardEvent(event)) {
        createNavigateKeyboard(generateConversationUrl(conversation.qualifiedId), true)(event);
      } else {
        createNavigate(generateConversationUrl(conversation.qualifiedId))(event);
      }

      clearSearchFilter();
      setClickedFilteredConversationId(conversation.id);
    },
    TimeInMillis.SECOND / CONVERSATION_CLICK_DEBOUNCE_DIVISOR,
    {leading: true},
  );

  const onConversationClick = useCallback(
    (conversation: Conversation) => {
      return (event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>) => {
        debouncedOnConversationClick(conversation, event);
      };
    },
    [debouncedOnConversationClick],
  );

  const getCommonConversationCellProps = (conversation: Conversation) => {
    return {
      isFocused: currentFocus === conversation.id,
      handleArrowKeyDown: handleArrowKeyDown(conversation.id),
      registerConversationElement,
      resetConversationFocus,
      dataUieName: 'item-conversation',
      conversation,
      onClick: onConversationClick(conversation),
      isSelected: isActiveConversation,
      onJoinCall: answerCall,
      rightClick: openContextMenu,
      showJoinButton: hasJoinableCall(conversation),
    };
  };

  useEffect(() => {
    if (!isNonEmptyString(conversationsFilter) && isNonEmptyString(clickedFilteredConversationId)) {
      const conversationIndex = conversationsToDisplay
        .filter(conv => {
          return isConversationEntity(conv);
        })
        .findIndex(conv => {
          return conv.id === clickedFilteredConversationId;
        });
      if (conversationIndex !== -1) {
        requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(conversationIndex, {align: 'auto'});
        });
      }

      setClickedFilteredConversationId(null);
    }
  }, [clickedFilteredConversationId, conversationsFilter, conversationsToDisplay, rowVirtualizer]);

  function renderGroupParticipants(): React.ReactNode {
    if (!isGroupParticipantsVisible) {
      return null;
    }

    return (
      <li>
        <h3 className="conversation-list-heading" css={headingTitle}>
          {translate('searchGroupParticipants')}
        </h3>
        <ul
          css={conversationsList}
          data-uie-name="group-participants-conversations-view"
          className="group-participants-conversations"
        >
          {groupParticipantsConversations.map(conversation => {
            return <ConversationListCell key={conversation.id} {...getCommonConversationCellProps(conversation)} />;
          })}
        </ul>
      </li>
    );
  }

  return (
    <>
      <h2 className="visually-hidden">{translate('conversationViewTooltip')}</h2>

      <ConnectionRequests connectionRequests={connectRequests} onConnectionRequestClick={onConnectionRequestClick} />

      {conversations.length === 0 && groupParticipantsConversations.length > 0 && (
        <p className="conversation-list-no-results" css={noResultsMessage}>
          {translate('searchConversationsNoResult')}
        </p>
      )}

      <ul
        css={conversationsList}
        data-uie-name="conversation-view"
        ref={parentRef}
        style={{
          height: '100%',
          overflow: 'auto',
          position: 'relative',
        }}
        onBlur={handleConversationListFocusOut}
      >
        <li
          aria-hidden="true"
          css={virtualizationSpacerStyles}
          style={{height: `${rowVirtualizer.getTotalSize()}px`}}
        />
        {virtualItems.map(virtualItem => {
          const conversation = conversationsToDisplay[virtualItem.index];

          // Have to use some hacky way to display properly heading while filtering conversations, can be improved
          // in the future
          const isHeading = 'isHeader' in conversation && 'heading' in conversation;

          if (!isConversationEntity(conversation) && isNonEmptyString(conversationsFilter) && !isEmpty && isHeading) {
            const translationKey = conversation.heading as 'searchConversationNames' | 'searchGroupParticipants';
            return (
              <li
                key={virtualItem.key}
                css={virtualizationStyles}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <h3 className="conversation-list-heading" css={headingTitle}>
                  {translate(translationKey)}
                </h3>
              </li>
            );
          }

          if (isConversationEntity(conversation)) {
            return (
              <ConversationListCell
                key={virtualItem.key}
                listItemCss={virtualizationStyles}
                listItemStyle={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                {...getCommonConversationCellProps(conversation)}
              />
            );
          }

          return null;
        })}
        {renderGroupParticipants()}
      </ul>
    </>
  );
};
