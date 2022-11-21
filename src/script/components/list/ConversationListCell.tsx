/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyBoardEvent,
} from 'react';

import cx from 'classnames';

import {AvailabilityState} from 'Components/AvailabilityState';
import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {GroupAvatar} from 'Components/avatar/GroupAvatar';
import {Icon} from 'Components/Icon';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {setHistoryParam} from 'src/script/router/Router';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKey, isOneOfKeys, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {noop, setContextMenuPosition} from 'Util/util';

import {generateCellState} from '../../conversation/ConversationCellState';
import {ConversationStatusIcon} from '../../conversation/ConversationStatusIcon';
import type {Conversation} from '../../entity/Conversation';
import {MediaType} from '../../media/MediaType';

export interface ConversationListCellProps {
  conversation: Conversation;
  dataUieName: string;
  isSelected?: (conversation: Conversation) => boolean;
  onClick: (event: ReactMouseEvent<HTMLDivElement, MouseEvent> | ReactKeyBoardEvent<HTMLDivElement>) => void;
  onJoinCall: (conversation: Conversation, mediaType: MediaType) => void;
  rightClick: (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => void;
  showJoinButton: boolean;
  index: number;
  /** it determines whether the conversation item is currently focused  */
  focusConversation: boolean;
  /** conversation list can only be focused using tab key from user name so enable
   * it when this condition satisfies  */
  isConversationListFocus: boolean;
  handleFocus: (index: number) => void;
  handleArrowKeyDown: (e: React.KeyboardEvent) => void;
  isFolder?: boolean;
}

const ConversationListCell: React.FC<ConversationListCellProps> = ({
  showJoinButton,
  conversation,
  onJoinCall,
  onClick = noop,
  isSelected = () => false,
  rightClick = noop,
  dataUieName,
  index,
  focusConversation,
  isConversationListFocus,
  handleFocus,
  handleArrowKeyDown,
  isFolder = false,
}) => {
  const {
    isGroup,
    is1to1,
    selfUser,
    participating_user_ets: users,
    display_name: displayName,
    removed_from_conversation: removedFromConversation,
    availabilityOfUser,
    unreadState,
    mutedState,
    isRequest,
  } = useKoSubscribableChildren(conversation, [
    'isGroup',
    'is1to1',
    'selfUser',
    'participating_user_ets',
    'display_name',
    'removed_from_conversation',
    'availabilityOfUser',
    'unreadState',
    'mutedState',
    'isRequest',
  ]);

  const isActive = isSelected(conversation);

  const conversationRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLButtonElement>(null);
  const [focusContextMenu, setContextMenuFocus] = useState(false);
  const [isContextMenuOpen, setContextMenuOpen] = useState(false);

  const openContextMenu = (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    event.stopPropagation();
    event.preventDefault();
    rightClick(conversation, event);
  };

  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);

  const onClickJoinCall = (event: React.MouseEvent) => {
    event.preventDefault();
    onJoinCall(conversation, MediaType.AUDIO);
  };

  const handleDivKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === KEY.SPACE || event.key === KEY.ENTER) {
      onClick(event);
    } else if (isKey(event, KEY.ARROW_RIGHT)) {
      setContextMenuFocus(true);
    } else {
      setContextMenuFocus(false);
    }
    handleArrowKeyDown(event);
  };

  useEffect(() => {
    // Move element into view when it is focused
    if (focusConversation && conversationRef.current && isConversationListFocus) {
      // isConversationListFocus is required to focus on first conversation only
      conversationRef.current.focus();
    }
  }, [focusConversation, isConversationListFocus]);

  useEffect(() => {
    // Move element into view when it is focused
    if (focusConversation && contextMenuRef.current && focusContextMenu) {
      contextMenuRef.current.focus();
    }
  }, [focusConversation, focusContextMenu]);

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.SPACE || event.key === KEY.ENTER) {
      const newEvent = setContextMenuPosition(event);
      rightClick(conversation, newEvent);
      setContextMenuOpen(true);
      return;
    }
    setContextMenuFocus(false);
    setContextMenuOpen(false);

    // when focused on the context menu and the menu is closed pressing up/down arrow keys will
    // get the focus back to the conversation list items
    if (isOneOfKeys(event, [KEY.ARROW_UP, KEY.ARROW_DOWN]) && !isContextMenuOpen) {
      handleArrowKeyDown(event);
    }
  };

  // always focus on the selected conversation when the folder tab loaded
  useEffect(() => {
    if (isActive && isConversationListFocus && isFolder) {
      handleFocus(index);
    }
  }, [index, isActive, isFolder, isConversationListFocus, handleFocus]);

  // on conversation/app load reset last message focus to ensure last message is focused
  // only when user enters a new conversation using keyboard(press enter)
  useEffect(() => {
    setHistoryParam(generateConversationUrl(conversation.qualifiedId));
  }, [conversation]);

  return (
    <li onContextMenu={openContextMenu}>
      <div
        data-uie-name={dataUieName}
        data-uie-uid={conversation.id}
        data-uie-value={displayName}
        data-uie-status={isActive ? 'active' : 'inactive'}
        className={cx('conversation-list-cell', {'conversation-list-cell--active': isActive})}
      >
        <div
          role="button"
          ref={conversationRef}
          className="conversation-list-cell-main-button"
          onClick={onClick}
          onKeyDown={handleDivKeyDown}
          data-uie-name="go-open-conversation"
          tabIndex={focusConversation ? 0 : -1}
          aria-label={t('accessibility.openConversation', displayName)}
          title={t('accessibility.conversationOptionsMenuAccessKey')}
        >
          <div
            className={cx('conversation-list-cell-left', {
              'conversation-list-cell-left-opaque': removedFromConversation || users.length === 0,
            })}
          >
            {isGroup && <GroupAvatar className="conversation-list-cell-avatar-arrow" users={users} />}
            {!isGroup && !!users.length && (
              <div className="avatar-halo">
                <Avatar participant={users[0]} avatarSize={AVATAR_SIZE.SMALL} />
              </div>
            )}
          </div>
          <div className="conversation-list-cell-center">
            {is1to1 && selfUser?.inTeam() ? (
              <AvailabilityState
                className="conversation-list-cell-availability"
                availability={availabilityOfUser}
                label={displayName}
                theme={isActive}
                dataUieName="status-availability-item"
              />
            ) : (
              <span className={cx('conversation-list-cell-name', {'conversation-list-cell-name--active': isActive})}>
                {displayName}
              </span>
            )}
            <span
              className={cx('conversation-list-cell-description', {
                'conversation-list-cell-description--active': isActive,
              })}
              data-uie-name="secondary-line"
            >
              {cellState.description}
            </span>
          </div>
        </div>
        <div className="conversation-list-cell-right">
          <button
            ref={contextMenuRef}
            className={cx('conversation-list-cell-context-menu', {
              'conversation-list-cell-context-menu--active': isActive,
            })}
            data-uie-name="go-options"
            aria-label={t('accessibility.conversationOptionsMenu')}
            type="button"
            tabIndex={focusContextMenu && focusConversation ? 0 : -1}
            aria-haspopup="true"
            onClick={event => {
              event.stopPropagation();
              rightClick(conversation, event.nativeEvent);
            }}
            onKeyDown={handleContextKeyDown}
          />
          {!showJoinButton && (
            <>
              {cellState.icon === ConversationStatusIcon.PENDING_CONNECTION && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-pending"
                  title={t('accessibility.conversationStatusPending')}
                >
                  <Icon.Pending className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_MENTION && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-mention"
                  title={t('accessibility.conversationStatusUnreadMention')}
                >
                  <Icon.Mention className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_REPLY && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-reply"
                  title={t('accessibility.conversationStatusUnreadReply')}
                  aria-label={t('accessibility.conversationStatusUnreadReply')}
                >
                  <Icon.Reply className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_PING && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-ping"
                  title={t('accessibility.conversationStatusUnreadPing')}
                >
                  <Icon.Ping className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.MISSED_CALL && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-missed-call"
                  title={t('accessibility.callStatusMissed')}
                >
                  <Icon.Hangup className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.MUTED && (
                <span
                  className="conversation-list-cell-badge cell-badge-light conversation-muted"
                  data-uie-name="status-silence"
                  title={t('accessibility.conversationStatusMuted')}
                >
                  <Icon.Mute className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_MESSAGES && unreadState.allMessages.length > 0 && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-unread"
                  title={t('accessibility.conversationStatusUnread')}
                >
                  {unreadState.allMessages.length}
                </span>
              )}
            </>
          )}
          {showJoinButton && (
            <button
              onClick={onClickJoinCall}
              type="button"
              className="call-ui__button call-ui__button--green call-ui__button--join"
              data-uie-name="do-call-controls-call-join"
            >
              {t('callJoin')}
            </button>
          )}
        </div>
      </div>
    </li>
  );
};

export {ConversationListCell};
