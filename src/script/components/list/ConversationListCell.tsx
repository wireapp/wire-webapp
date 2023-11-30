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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import {UserInfo} from 'Components/UserInfo';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKey, isOneOfKeys, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {noop, setContextMenuPosition} from 'Util/util';

import {ConversationListCellStatusIcon} from './ConversationListCellStatusIcon';

import {generateCellState} from '../../conversation/ConversationCellState';
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
  handleArrowKeyDown: (e: React.KeyboardEvent) => void;
  isFocused?: boolean;
  // This method resetting the current focused conversation to first conversation on click outside or click tab or shift + tab
  resetConversationFocus: () => void;
}

const ConversationListCell = ({
  showJoinButton,
  conversation,
  onJoinCall,
  onClick = noop,
  isSelected = () => false,
  rightClick = noop,
  dataUieName,
  handleArrowKeyDown,
  isFocused = false,
  resetConversationFocus,
}: ConversationListCellProps) => {
  const {
    isGroup,
    is1to1,
    selfUser,
    participating_user_ets: users,
    display_name: displayName,
    removed_from_conversation: removedFromConversation,
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
    'unreadState',
    'mutedState',
    'isRequest',
  ]);

  const isActive = isSelected(conversation);

  const conversationRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLButtonElement>(null);
  const [focusContextMenu, setContextMenuFocus] = useState(false);
  const [isContextMenuOpen, setContextMenuOpen] = useState(false);
  const contextMenuKeyboardShortcut = `keyboard-shortcut-${conversation.id}`;

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
      contextMenuRef.current?.focus();
    } else {
      setContextMenuFocus(false);
    }

    handleArrowKeyDown(event);
  };

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.SPACE || event.key === KEY.ENTER) {
      const newEvent = setContextMenuPosition(event);
      rightClick(conversation, newEvent);
      setContextMenuOpen(true);
      return;
    }

    if (event.key === KEY.TAB || (event.shiftKey && event.key === KEY.TAB)) {
      resetConversationFocus();
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
    if (isFocused) {
      conversationRef.current?.focus();
    }
  }, [isFocused]);

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
          tabIndex={isFocused ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE}
          aria-label={t('accessibility.openConversation', displayName)}
          aria-describedby={contextMenuKeyboardShortcut}
        >
          <span id={contextMenuKeyboardShortcut} aria-label={t('accessibility.conversationOptionsMenuAccessKey')} />

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
            {is1to1 ? (
              <UserInfo
                className="conversation-list-cell-availability"
                user={conversation.firstUserEntity()!}
                theme={isActive}
                dataUieName="status-availability-item"
                showAvailability={is1to1 && !!selfUser?.teamId}
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
            tabIndex={focusContextMenu && isFocused ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE}
            aria-haspopup="true"
            onClick={event => {
              event.stopPropagation();
              rightClick(conversation, event.nativeEvent);
            }}
            onKeyDown={handleContextKeyDown}
          />

          {!showJoinButton && <ConversationListCellStatusIcon conversation={conversation} />}

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
