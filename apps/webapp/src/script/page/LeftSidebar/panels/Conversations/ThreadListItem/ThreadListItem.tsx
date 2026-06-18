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

import {CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation';
import cx from 'classnames';

import {Avatar, AVATAR_SIZE, ChannelAvatar, GroupAvatar} from 'Components/Avatar';
import type {ThreadIndexEntry, ThreadRowViewModel} from 'Components/MessagesList/threading/threadIndexStore';
import {ThreadsIcon} from 'Components/ThreadIcons';
import type {Conversation} from 'Repositories/entity/Conversation';

import {
  contextIconPlaceholder,
  contextIconWrapper,
  conversationName,
  replyCount,
  secondaryRow,
  threadIcon,
  threadIconWrapper,
} from './ThreadListItem.styles';

export type ThreadListItemProps = {
  thread: ThreadRowViewModel;
  conversation?: Conversation;
  isActive?: boolean;
  onClick?: (thread: ThreadIndexEntry) => void;
};

const ThreadContextIcon = ({conversation}: {conversation?: Conversation}) => {
  if (!conversation) {
    return <span css={contextIconPlaceholder} aria-hidden="true" />;
  }

  if (conversation.isChannel()) {
    return (
      <span css={contextIconWrapper} data-uie-name="thread-list-item-context-icon">
        <ChannelAvatar
          conversationID={conversation.id}
          isLocked={!conversation.accessModes?.includes(CONVERSATION_ACCESS.LINK)}
          size="small"
        />
      </span>
    );
  }

  if (conversation.isGroup()) {
    return (
      <span css={contextIconWrapper} data-uie-name="thread-list-item-context-icon">
        <GroupAvatar conversationID={conversation.id} size="small" />
      </span>
    );
  }

  const participants = conversation.participating_user_ets();
  if (participants.length > 0) {
    return (
      <span css={contextIconWrapper} data-uie-name="thread-list-item-context-icon">
        <Avatar participant={participants[0]} avatarSize={AVATAR_SIZE.XX_SMALL} hideAvailabilityStatus noBadge />
      </span>
    );
  }

  return <span css={contextIconPlaceholder} aria-hidden="true" />;
};

const getReplyCountLabel = (count: number) => (count === 1 ? '1 reply' : `${count} replies`);

export const ThreadListItem = ({thread, conversation, isActive = false, onClick}: ThreadListItemProps) => {
  const unreadCount = thread.badges.unreadCount;
  const isUnread = unreadCount > 0;
  const replyCountLabel = getReplyCountLabel(thread.thread.replyCount);

  return (
    <li
      className={cx('conversation-list-cell', {'conversation-list-cell--active': isActive})}
      data-uie-name="threads-list-item"
      data-uie-status={isActive ? 'active' : undefined}
    >
      <div
        role="button"
        className="conversation-list-cell-main-button"
        data-uie-name="threads-list-open-button"
        aria-current={isActive ? 'true' : undefined}
        aria-label={`${thread.title}, ${thread.conversationLabel}, ${replyCountLabel}${isUnread ? `, ${unreadCount} unread` : ''}`}
        onClick={() => onClick?.(thread.thread)}
      >
        <div className="conversation-list-cell-left">
          <span css={threadIconWrapper(isActive)} data-uie-name="threads-list-item-thread-icon" aria-hidden="true">
            <ThreadsIcon css={threadIcon} />
          </span>
        </div>

        <div className="conversation-list-cell-center">
          <span
            className={cx('conversation-list-cell-name', {'conversation-list-cell-name--active': isActive})}
            data-uie-name="threads-list-item-title"
          >
            {thread.title}
          </span>

          <span
            css={secondaryRow}
            className={cx('conversation-list-cell-description', {
              'conversation-list-cell-description--active': isActive,
            })}
            data-uie-name="threads-list-item-meta"
          >
            <ThreadContextIcon conversation={conversation} />
            <span css={conversationName} data-uie-name="threads-list-item-conversation-label">
              {thread.conversationLabel}
            </span>
            <span css={replyCount} data-uie-name="threads-list-item-replies">
              {replyCountLabel}
            </span>
          </span>
        </div>
      </div>

      <div className="conversation-list-cell-right">
        {isUnread && (
          <span
            className="conversation-list-cell-badge cell-badge-dark"
            data-uie-name="threads-list-item-unread-badge"
          >
            {unreadCount}
          </span>
        )}
      </div>
    </li>
  );
};
