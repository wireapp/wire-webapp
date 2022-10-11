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
  KeyboardEvent as ReactKeyboardEvent,
  useLayoutEffect,
  useRef,
} from 'react';

import {QualifiedId} from '@wireapp/api-client/src/user';

import InViewport from 'Components/utils/InViewport';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageMarkerType, MessageMarkerType} from 'Util/conversationMessages';

import MessageTime from './MessageTime';
import {MessageWrapper} from './MessageWrapper';

import type {MessageRepository} from '../../../conversation/MessageRepository';
import type {Conversation} from '../../../entity/Conversation';
import type {ContentMessage} from '../../../entity/message/ContentMessage';
import type {DecryptErrorMessage} from '../../../entity/message/DecryptErrorMessage';
import type {MemberMessage as MemberMessageEntity} from '../../../entity/message/MemberMessage';
import {Message as BaseMessage} from '../../../entity/message/Message';
import type {Text} from '../../../entity/message/Text';
import type {User} from '../../../entity/User';
import {useRelativeTimestamp} from '../../../hooks/useRelativeTimestamp';
import {TeamState} from '../../../team/TeamState';

export interface MessageActions {
  onClickAvatar: (user: User | ServiceEntity) => void;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickImage: (message: ContentMessage, event: React.UIEvent) => void;
  onClickInvitePeople: () => void;
  onClickLikes: (message: BaseMessage) => void;
  onClickMessage: (message: ContentMessage | Text, event: ReactMouseEvent | ReactKeyboardEvent<HTMLElement>) => void;
  onClickParticipants: (participants: User[]) => void;
  onClickReceipts: (message: BaseMessage) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
  onLike: (message: ContentMessage, button?: boolean) => void;
}

export interface MessageParams extends MessageActions {
  conversation: Conversation;
  hasReadReceiptsTurnedOn: boolean;
  isLastDeliveredMessage: boolean;
  isMarked: boolean;
  isSelfTemporaryGuest: boolean;
  /** The last read timestamp at the moment the conversation was rendered */
  lastReadTimestamp: number;
  message: BaseMessage;
  messageActions: {
    deleteMessage: (conversation: Conversation, message: BaseMessage) => void;
    deleteMessageEveryone: (conversation: Conversation, message: BaseMessage) => void;
  };
  messageRepository: MessageRepository;
  onVisible?: () => void;
  previousMessage?: BaseMessage;
  selfId: QualifiedId;
  shouldShowInvitePeople: boolean;
  teamState?: TeamState;
}

const Message: React.FC<
  MessageParams & {scrollTo?: (elm: {center?: boolean; element: HTMLElement}, isUnread?: boolean) => void}
> = props => {
  const {message, previousMessage, isMarked, lastReadTimestamp, onVisible, scrollTo} = props;
  const messageElementRef = useRef<HTMLDivElement>(null);
  const {status, ephemeral_expires, timestamp} = useKoSubscribableChildren(message, [
    'status',
    'ephemeral_expires',
    'timestamp',
  ]);
  const timeago = useRelativeTimestamp(message.timestamp());
  const timeagoDay = useRelativeTimestamp(message.timestamp(), true);
  const markerType = getMessageMarkerType(message, lastReadTimestamp, previousMessage);

  useLayoutEffect(() => {
    if (!messageElementRef.current) {
      return;
    }
    if (isMarked) {
      scrollTo?.({center: true, element: messageElementRef.current});
    } else if (markerType === MessageMarkerType.UNREAD) {
      scrollTo?.({element: messageElementRef.current}, true);
    }
  }, [isMarked, messageElementRef]);

  const getTimestampClass = (): string => {
    const classes = {
      [MessageMarkerType.NONE]: '',
      [MessageMarkerType.DAY]: 'message-timestamp-visible message-timestamp-day',
      [MessageMarkerType.HOUR]: 'message-timestamp-visible',
      [MessageMarkerType.UNREAD]: 'message-timestamp-visible message-timestamp-unread',
    };
    return classes[markerType];
  };

  const content = <MessageWrapper {...props} hasMarker={markerType !== MessageMarkerType.NONE} />;
  const wrappedContent = onVisible ? (
    <InViewport requireFullyInView allowBiggerThanViewport onVisible={onVisible}>
      {content}
    </InViewport>
  ) : (
    content
  );
  return (
    <div
      className={`message ${isMarked ? 'message-marked' : ''}`}
      ref={messageElementRef}
      data-uie-uid={message.id}
      data-uie-value={message.super_type}
      data-uie-expired-status={ephemeral_expires}
      data-uie-send-status={status}
      data-uie-name="item-message"
    >
      <div className={`message-header message-timestamp ${getTimestampClass()}`}>
        <div className="message-header-icon">
          <span className="message-unread-dot"></span>
        </div>
        <div className="message-header-label">
          <MessageTime timestamp={timestamp} className="label-xs" data-timestamp-type="normal">
            {timeago}
          </MessageTime>
          <MessageTime timestamp={timestamp} data-timestamp-type="day" className="label-bold-xs">
            {timeagoDay}
          </MessageTime>
        </div>
      </div>
      {wrappedContent}
    </div>
  );
};

export default Message;
