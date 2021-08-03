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
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import useEffectRef from 'Util/useEffectRef';

import {AVATAR_SIZE} from 'Components/Avatar';

import {generateCellState} from '../../conversation/ConversationCellState';
import {ConversationStatusIcon} from '../../conversation/ConversationStatusIcon';
import type {Conversation} from '../../entity/Conversation';
import {MediaType} from '../../media/MediaType';
import {useViewPortObserver} from '../../ui/viewportObserver';

import Avatar from 'Components/Avatar';
import GroupAvatar from 'Components/avatar/GroupAvatar';
import AvailabilityState from 'Components/AvailabilityState';
import Icon from 'Components/Icon';

export interface ConversationListCellProps {
  conversation: Conversation;
  index: number;
  is_selected: (conversation: Conversation) => boolean;
  isVisibleFunc: (top: number, bottom: number) => boolean;
  offsetTop: number;
  onClick: () => void;
  onJoinCall: (conversation: Conversation, mediaType: MediaType) => void;
  rightClick: (conversation: Conversation, event: MouseEvent) => void;
  showJoinButton: boolean;
}

const ConversationListCell: React.FC<ConversationListCellProps> = ({
  showJoinButton,
  conversation,
  onJoinCall,
  onClick = noop,
  is_selected = () => false,
  rightClick = noop,
  index = 0,
  isVisibleFunc = () => false,
  offsetTop = 0,
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

  const isSelected = is_selected(conversation);
  const cellHeight = 56;
  const cellTop = index * cellHeight + offsetTop;
  const cellBottom = cellTop + cellHeight;

  const isInitiallyVisible = isVisibleFunc(cellTop, cellBottom);
  const [viewportElementRef, setViewportElementRef] = useEffectRef<HTMLDivElement>();
  const isInViewport = useViewPortObserver(viewportElementRef, isInitiallyVisible);

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

  return (
    <div
      ref={setViewportElementRef}
      data-uie-uid={conversation.id}
      data-uie-value={displayName}
      className={cx('conversation-list-cell', {'conversation-list-cell-active': isSelected})}
      onClick={onClick}
    >
      {isInViewport && (
        <>
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
                theme={isSelected}
                dataUieName="status-availability-item"
              />
            ) : (
              <span className={cx('conversation-list-cell-name', {'accent-text': isSelected})}>{displayName}</span>
            )}
            <span className="conversation-list-cell-description" data-uie-name="secondary-line">
              {cellState.description}
            </span>
          </div>
          <div className="conversation-list-cell-right">
            <span
              className="conversation-list-cell-context-menu"
              data-uie-name="go-options"
              onClick={event => {
                event.stopPropagation();
                rightClick(conversation, event.nativeEvent);
              }}
            ></span>
            {!showJoinButton && (
              <>
                {cellState.icon === ConversationStatusIcon.PENDING_CONNECTION && (
                  <span className="conversation-list-cell-badge cell-badge-dark" data-uie-name="status-pending">
                    <Icon.Pending className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.UNREAD_MENTION && (
                  <span className="conversation-list-cell-badge cell-badge-light" data-uie-name="status-mention">
                    <Icon.Mention className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.UNREAD_REPLY && (
                  <span className="conversation-list-cell-badge cell-badge-light" data-uie-name="status-reply">
                    <Icon.Reply className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.UNREAD_PING && (
                  <span className="conversation-list-cell-badge cell-badge-light" data-uie-name="status-ping">
                    <Icon.Ping className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.MISSED_CALL && (
                  <span className="conversation-list-cell-badge cell-badge-light" data-uie-name="status-missed-call">
                    <Icon.Hangup className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.MUTED && (
                  <span
                    className="conversation-list-cell-badge cell-badge-dark conversation-muted"
                    data-uie-name="status-silence"
                  >
                    <Icon.Mute className="svg-icon" />
                  </span>
                )}
                {cellState.icon === ConversationStatusIcon.UNREAD_MESSAGES && unreadState.allMessages.length > 0 && (
                  <span className="conversation-list-cell-badge cell-badge-light" data-uie-name="status-unread">
                    {unreadState.allMessages.length}
                  </span>
                )}
              </>
            )}
            {showJoinButton && (
              <div
                onClick={onClickJoinCall}
                className="call-ui__button call-ui__button--green call-ui__button--join"
                data-uie-name="do-call-controls-call-join"
              >
                {t('callJoin')}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ConversationListCell;

registerReactComponent('conversation-list-cell', {
  bindings:
    'offsetTop: ko.unwrap(offsetTop), index: ko.unwrap(index), showJoinButton: ko.unwrap(showJoinButton), conversation, is_selected, isVisibleFunc, onJoinCall, rightClick, onClick',
  component: ConversationListCell,
});
