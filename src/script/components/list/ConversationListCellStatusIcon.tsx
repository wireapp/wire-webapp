/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {useMemo} from 'react';

import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {generateCellState} from '../../conversation/ConversationCellState';
import {ConversationStatusIcon} from '../../conversation/ConversationStatusIcon';
import type {Conversation} from '../../entity/Conversation';

export interface ConversationListCellStatusIconProps {
  conversation: Conversation;
}

const ConversationListCellStatusIcon = ({conversation}: ConversationListCellStatusIconProps) => {
  const {
    participating_user_ets: users,
    unreadState,
    mutedState,
    isRequest,
  } = useKoSubscribableChildren(conversation, ['participating_user_ets', 'unreadState', 'mutedState', 'isRequest']);

  const cellState = useMemo(() => generateCellState(conversation), [unreadState, mutedState, isRequest]);

  const {isRequest: isUserRequest} = useKoSubscribableChildren(users[0], ['isRequest']);

  return (
    <>
      {(isUserRequest || cellState.icon === ConversationStatusIcon.PENDING_CONNECTION) && (
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
  );
};

export {ConversationListCellStatusIcon};
