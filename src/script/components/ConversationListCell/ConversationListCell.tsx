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

import React, {KeyboardEvent as ReactKeyBoardEvent, MouseEvent as ReactMouseEvent, useRef, useState} from 'react';

import {CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation/';
import cx from 'classnames';

import {TabIndex} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import {ChannelAvatar} from 'Components/Avatar/ChannelAvatar';
import {UserBlockedBadge} from 'Components/Badge';
import {CellDescription} from 'Components/ConversationListCell/components/CellDescription';
import {UserInfo} from 'Components/UserInfo';
import {useNoInternetCallGuard} from 'Hooks/useNoInternetCallGuard/useNoInternetCallGuard';
import type {Conversation} from 'Repositories/entity/Conversation';
import {MediaType} from 'Repositories/media/MediaType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {isKey, isOneOfKeys, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';
import {noop, setContextMenuPosition} from 'Util/util';

import {StatusIcon} from './components/StatusIcon';

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

export const ConversationListCell = ({
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
    participating_user_ets: users,
    display_name: displayName,
    isSelfUserRemoved,
    unreadState,
    mutedState,
    isRequest,
    isConversationWithBlockedUser,
    isChannel,
    isGroupOrChannel,
  } = useKoSubscribableChildren(conversation, [
    'isGroup',
    'is1to1',
    'participating_user_ets',
    'display_name',
    'isSelfUserRemoved',
    'unreadState',
    'mutedState',
    'isRequest',
    'isConversationWithBlockedUser',
    'isChannel',
    'isGroupOrChannel',
  ]);

  const guardCall = useNoInternetCallGuard();

  const {isChannelsEnabled} = useChannelsFeatureFlag();
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

  const onClickJoinCall = (event: React.MouseEvent) => {
    event.preventDefault();
    guardCall(() => {
      onJoinCall(conversation, MediaType.AUDIO);
    });
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

  return (
    <li
      onContextMenu={openContextMenu}
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
        onClick={event => {
          event.stopPropagation();
          event.preventDefault();
          onClick(event);
        }}
        onKeyDown={handleDivKeyDown}
        data-uie-name="go-open-conversation"
        tabIndex={isFocused ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE}
        aria-label={t('accessibility.openConversation', {name: displayName})}
        aria-describedby={contextMenuKeyboardShortcut}
      >
        <span id={contextMenuKeyboardShortcut} aria-label={t('accessibility.conversationOptionsMenuAccessKey')} />

        <div
          className={cx('conversation-list-cell-left', {
            'conversation-list-cell-left-opaque': isSelfUserRemoved || users.length === 0,
          })}
        >
          {isChannel &&
            (isChannelsEnabled ? (
              <ChannelAvatar
                conversationID={conversation.id}
                isLocked={!conversation.accessModes?.includes(CONVERSATION_ACCESS.LINK)}
                className="conversation-list-cell-avatar-arrow"
              />
            ) : (
              <GroupAvatar conversationID={conversation.id} className="conversation-list-cell-avatar-arrow" />
            ))}

          {isGroup && <GroupAvatar conversationID={conversation.id} className="conversation-list-cell-avatar-arrow" />}

          {!isGroupOrChannel && !!users.length && <Avatar participant={users[0]} avatarSize={AVATAR_SIZE.SMALL} />}
        </div>

        <div className="conversation-list-cell-center">
          {is1to1 ? (
            <UserInfo user={conversation.firstUserEntity()!} isActive={isActive}>
              {isConversationWithBlockedUser && <UserBlockedBadge />}
            </UserInfo>
          ) : (
            <span className={cx('conversation-list-cell-name', {'conversation-list-cell-name--active': isActive})}>
              {displayName}
            </span>
          )}

          <CellDescription
            conversation={conversation}
            mutedState={mutedState}
            isActive={isActive}
            isRequest={isRequest}
            unreadState={unreadState}
          />
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

        {!showJoinButton && <StatusIcon conversation={conversation} />}

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
    </li>
  );
};
