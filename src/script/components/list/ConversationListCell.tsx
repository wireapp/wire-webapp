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

import React, {useEffect, useMemo} from 'react';
import cx from 'classnames';

import {noop} from 'Util/util';
import {t} from 'Util/LocalizerUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import useEffectRef from 'Util/useEffectRef';

import {AVATAR_SIZE} from 'Components/Avatar';

import {generateCellState} from '../../conversation/ConversationCellState';
import {ConversationStatusIcon} from '../../conversation/ConversationStatusIcon';
import type {Conversation} from '../../entity/Conversation';
import {MediaType} from '../../media/MediaType';

import Avatar from 'Components/Avatar';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import AvailabilityState from 'Components/AvailabilityState';
import Icon from 'Components/Icon';
import {KEY} from 'Util/KeyboardUtil';

export interface ConversationListCellProps {
  conversation: Conversation;
  dataUieName: string;
  isSelected?: (conversation: Conversation) => boolean;
  onClick: React.MouseEventHandler<Element>;
  onJoinCall: (conversation: Conversation, mediaType: MediaType) => void;
  rightClick: (conversation: Conversation, event: MouseEvent) => void;
  showJoinButton: boolean;
}

const ConversationListCell: React.FC<ConversationListCellProps> = ({
  showJoinButton,
  conversation,
  onJoinCall,
  onClick = noop,
  isSelected = () => false,
  rightClick = noop,
  dataUieName,
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

  const [viewportElementRef, setViewportElementRef] = useEffectRef<HTMLElement>();

  useEffect(() => {
    const handleRightClick = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      rightClick(conversation, event);
    };
    viewportElementRef?.addEventListener('contextmenu', handleRightClick);
    return () => {
      viewportElementRef?.removeEventListener('contextmenu', handleRightClick);
    };
  }, [viewportElementRef]);

  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);

  const onClickJoinCall = (event: React.MouseEvent) => {
    event.preventDefault();
    onJoinCall(conversation, MediaType.AUDIO);
  };

  const handleDivKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.SPACE || event.key === KEY.ENTER) {
      onClick(event as unknown as React.MouseEvent<Element, MouseEvent>);
    }
  };

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEY.SPACE || event.key === KEY.ENTER) {
      event.stopPropagation();
      event.preventDefault();

      const {top, left, height} = (event.target as Element).getBoundingClientRect();
      const newEvent = new MouseEvent('MouseEvent', {
        ...(event as unknown as MouseEvent),
        clientX: left,
        clientY: top + height,
      });
      rightClick(conversation, newEvent);
    }
  };

  return (
    <li ref={setViewportElementRef}>
      <div
        data-uie-name={dataUieName}
        data-uie-uid={conversation.id}
        data-uie-value={displayName}
        className={cx('conversation-list-cell', {'conversation-list-cell-active': isActive})}
      >
        <div
          role="button"
          className="conversation-list-cell-main-button"
          onClick={onClick}
          onKeyDown={handleDivKeyDown}
          data-uie-name="go-open-conversation"
          tabIndex={0}
          aria-label={t('accessibility.openConversation', displayName)}
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
            {is1to1 && selfUser.inTeam() ? (
              <AvailabilityState
                className="conversation-list-cell-availability"
                availability={availabilityOfUser}
                label={displayName}
                theme={isActive}
                dataUieName="status-availability-item"
              />
            ) : (
              <span className={cx('conversation-list-cell-name', {'accent-text': isActive})}>{displayName}</span>
            )}
            <span className="conversation-list-cell-description" data-uie-name="secondary-line">
              {cellState.description}
            </span>
          </div>
        </div>
        <div className="conversation-list-cell-right">
          <button
            className="conversation-list-cell-context-menu"
            data-uie-name="go-options"
            aria-label={t('accessibility.conversationOptionsMenu')}
            type="button"
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
                  className="conversation-list-cell-badge cell-badge-dark"
                  data-uie-name="status-pending"
                  title={t('accessibility.callStatusPending')}
                  aria-label={t('accessibility.callStatusPending')}
                >
                  <Icon.Pending className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_MENTION && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-mention"
                  title={t('accessibility.conversationStatusUnreadMention')}
                  aria-label={t('accessibility.conversationStatusUnreadMention')}
                >
                  <Icon.Mention className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_REPLY && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-reply"
                  title={t('accessibility.conversationStatusUnreadReply')}
                  aria-label={t('accessibility.conversationStatusUnreadReply')}
                >
                  <Icon.Reply className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_PING && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-ping"
                  title={t('accessibility.conversationStatusUnreadPing')}
                  aria-label={t('accessibility.conversationStatusUnreadPing')}
                >
                  <Icon.Ping className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.MISSED_CALL && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-missed-call"
                  title={t('accessibility.callStatusMissed')}
                  aria-label={t('accessibility.callStatusMissed')}
                >
                  <Icon.Hangup className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.MUTED && (
                <span
                  className="conversation-list-cell-badge cell-badge-dark conversation-muted"
                  data-uie-name="status-silence"
                  title={t('accessibility.callStatusMuted')}
                  aria-label={t('accessibility.callStatusMuted')}
                >
                  <Icon.Mute className="svg-icon" />
                </span>
              )}
              {cellState.icon === ConversationStatusIcon.UNREAD_MESSAGES && unreadState.allMessages.length > 0 && (
                <span
                  className="conversation-list-cell-badge cell-badge-light"
                  data-uie-name="status-unread"
                  title={t('accessibility.conversationStatusUnread')}
                  aria-label={t('accessibility.conversationStatusUnread')}
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

export default ConversationListCell;
