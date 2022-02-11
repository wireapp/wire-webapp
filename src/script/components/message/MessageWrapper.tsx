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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {QualifiedId} from '@wireapp/api-client/src/user';

import {Message as BaseMessage} from '../../entity/message/Message';
import {ContextMenuEntry} from '../../ui/ContextMenu';
import type {ContentMessage} from '../../entity/message/ContentMessage';
import type {MemberMessage as MemberMessageEntity} from '../../entity/message/MemberMessage';
import type {CompositeMessage} from '../../entity/message/CompositeMessage';
import type {Text} from '../../entity/message/Text';
import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {DecryptErrorMessage} from '../../entity/message/DecryptErrorMessage';
import {AssetRepository} from '../../assets/AssetRepository';
import type {MessageRepository} from '../../conversation/MessageRepository';
import {TeamState} from '../../team/TeamState';

import {getMessageMarkerType, MessageMarkerType} from 'Util/conversationMessages';
import {
  TIME_IN_MILLIS,
  fromUnixTime,
  isYoungerThan2Minutes,
  isYoungerThan1Hour,
  isToday,
  isYesterday,
  formatTimeShort,
  isYoungerThan7Days,
  fromNowLocale,
  formatLocale,
  formatDayMonth,
  isThisYear,
} from 'Util/TimeUtil';

import VerificationMessage from './VerificationMessage';
import CallMessage from './CallMessage';
import CallTimeoutMessage from './CallTimeoutMessage';
import MissedMessage from './MissedMessage';
import FileTypeRestrictedMessage from './FileTypeRestrictedMessage';
import DeleteMessage from './DeleteMessage';
import DecryptionErrorMessage from './DecryptErrorMessage';
import LegalHoldMessage from './LegalHoldMessage';
import SystemMessage from './SystemMessage';
import MemberMessage from './MemberMessage';
import PingMessage from './PingMessage';
import TextMessage from './ContentMessage';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import InViewport from 'Components/utils/InViewport';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import MessageTime from './MessageTime';

export interface MessageActions {
  onClickAvatar: (user: User) => void;
  onClickCancelRequest: (message: MemberMessageEntity) => void;
  onClickImage: (message: ContentMessage, event: React.MouseEvent) => void;
  onClickInvitePeople: () => void;
  onClickLikes: (message: BaseMessage) => void;
  onClickMessage: (message: ContentMessage | Text, event: React.MouseEvent) => void;
  onClickParticipants: (participants: User[]) => void;
  onClickReceipts: (message: BaseMessage) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
  onLike: (message: ContentMessage, button?: boolean) => void;
}

interface MessageParams extends MessageActions {
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
  onContentUpdated: () => void;
  onVisible?: () => void;
  previousMessage?: BaseMessage;
  selfId: QualifiedId;
  shouldShowInvitePeople: boolean;
  teamState?: TeamState;
}

function useRelativeTimestamp(timestamp: number, asDay?: boolean) {
  const calculateTimestamp = (ts: number, isDay: boolean) => {
    const date = fromUnixTime(ts / TIME_IN_MILLIS.SECOND);
    if (isYoungerThan2Minutes(date)) {
      return t('conversationJustNow');
    }

    if (isYoungerThan1Hour(date)) {
      return fromNowLocale(date);
    }

    if (isToday(date)) {
      const time = formatTimeShort(date);
      return isDay ? `${t('conversationToday')} ${time}` : time;
    }

    if (isYesterday(date)) {
      return `${t('conversationYesterday')} ${formatTimeShort(date)}`;
    }
    if (isYoungerThan7Days(date)) {
      return formatLocale(date, 'EEEE p');
    }

    const weekDay = formatLocale(date, 'EEEE');
    const dayMonth = formatDayMonth(date);
    const year = isThisYear(date) ? '' : ` ${date.getFullYear()}`;
    const time = formatTimeShort(date);
    return isDay ? `${weekDay}, ${dayMonth}${year}, ${time}` : `${dayMonth}${year}, ${time}`;
  };
  const [timeago, setTimeago] = useState<string>(calculateTimestamp(timestamp, asDay));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeago(calculateTimestamp(timestamp, asDay));
    }, TIME_IN_MILLIS.MINUTE);
    return () => clearInterval(interval);
  });
  return timeago;
}

const MessageWrapper: React.FC<MessageParams & {hasMarker: boolean}> = ({
  message,
  conversation,
  selfId,
  hasMarker,
  isSelfTemporaryGuest,
  isLastDeliveredMessage,
  shouldShowInvitePeople,
  previousMessage,
  hasReadReceiptsTurnedOn,
  onContentUpdated,
  onClickAvatar,
  onClickImage,
  onClickInvitePeople,
  onClickLikes,
  onClickMessage,
  onClickTimestamp,
  onClickParticipants,
  onClickReceipts,
  onClickResetSession,
  onClickCancelRequest,
  onLike,
  onVisible,
  messageRepository,
  messageActions,
  teamState = container.resolve(TeamState),
}) => {
  const findMessage = (conversation: Conversation, messageId: string) => {
    return messageRepository.getMessageInConversationById(conversation, messageId, true, true);
  };
  const clickButton = (message: CompositeMessage, buttonId: string) => {
    if (message.selectedButtonId() !== buttonId && message.waitingButtonId() !== buttonId) {
      message.waitingButtonId(buttonId);
      messageRepository.sendButtonAction(conversation, message, buttonId);
    }
  };

  const contextMenuEntries = ko.pureComputed(() => {
    const entries: ContextMenuEntry[] = [];

    const isRestrictedFileShare = !teamState.isFileSharingReceivingEnabled();

    const canDelete = message.user().isMe && !conversation.removed_from_conversation() && message.isDeletable();

    const canEdit = message.isEditable() && !conversation.removed_from_conversation();

    const hasDetails = !conversation.is1to1() && !message.isEphemeral() && !conversation.removed_from_conversation();

    if (message.isDownloadable() && !isRestrictedFileShare) {
      entries.push({
        click: () => message.download(container.resolve(AssetRepository)),
        label: t('conversationContextMenuDownload'),
      });
    }

    if (message.isReactable() && !conversation.removed_from_conversation()) {
      const label = message.is_liked() ? t('conversationContextMenuUnlike') : t('conversationContextMenuLike');

      entries.push({
        click: () => onLike(message, false),
        label,
      });
    }

    if (canEdit) {
      entries.push({
        click: () => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.EDIT, message),
        label: t('conversationContextMenuEdit'),
      });
    }

    if (message.isReplyable() && !conversation.removed_from_conversation()) {
      entries.push({
        click: () => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, message),
        label: t('conversationContextMenuReply'),
      });
    }

    if (message.isCopyable() && !isRestrictedFileShare) {
      entries.push({
        click: () => message.copy(),
        label: t('conversationContextMenuCopy'),
      });
    }

    if (hasDetails) {
      entries.push({
        click: () => onClickReceipts(message),
        label: t('conversationContextMenuDetails'),
      });
    }

    if (message.isDeletable()) {
      entries.push({
        click: () => messageActions.deleteMessage(conversation, message),
        label: t('conversationContextMenuDelete'),
      });
    }

    if (canDelete) {
      entries.push({
        click: () => messageActions.deleteMessageEveryone(conversation, message),
        label: t('conversationContextMenuDeleteEveryone'),
      });
    }

    return entries;
  });

  if (message.isContent()) {
    const content = (
      <TextMessage
        message={message}
        findMessage={findMessage}
        conversation={conversation}
        previousMessage={previousMessage}
        hasMarker={hasMarker}
        selfId={selfId}
        isLastDeliveredMessage={isLastDeliveredMessage}
        onLike={onLike}
        onContentUpdated={onContentUpdated}
        onClickMessage={onClickMessage}
        onClickTimestamp={onClickTimestamp}
        onClickLikes={onClickLikes}
        onClickButton={clickButton}
        onClickAvatar={onClickAvatar}
        contextMenu={{entries: contextMenuEntries}}
        onClickCancelRequest={onClickCancelRequest}
        onClickImage={onClickImage}
        onClickInvitePeople={onClickInvitePeople}
        onClickParticipants={onClickParticipants}
        onClickReceipts={onClickReceipts}
      />
    );
    if (onVisible) {
      return <InViewport onVisible={onVisible}>{content}</InViewport>;
    }
    return content;
  }
  if (message.isUnableToDecrypt()) {
    return <DecryptionErrorMessage message={message} onClickResetSession={onClickResetSession} />;
  }
  if (message.isLegalHold()) {
    return <LegalHoldMessage message={message}></LegalHoldMessage>;
  }
  if (message.isVerification()) {
    return <VerificationMessage message={message} />;
  }
  if (message.isDelete()) {
    return <DeleteMessage message={message} onClickAvatar={onClickAvatar} />;
  }
  if (message.isCall()) {
    return <CallMessage message={message} />;
  }
  if (message.isCallTimeout()) {
    return <CallTimeoutMessage message={message} />;
  }
  if (message.isSystem()) {
    return <SystemMessage message={message as any} />;
  }
  if (message.isMember()) {
    return (
      <MemberMessage
        message={message}
        onClickInvitePeople={onClickInvitePeople}
        onClickParticipants={onClickParticipants}
        onClickCancelRequest={onClickCancelRequest}
        hasReadReceiptsTurnedOn={hasReadReceiptsTurnedOn}
        shouldShowInvitePeople={shouldShowInvitePeople}
        isSelfTemporaryGuest={isSelfTemporaryGuest}
      />
    );
  }
  if (message.isPing()) {
    const content = (
      <PingMessage
        message={message}
        is1to1Conversation={conversation.is1to1()}
        isLastDeliveredMessage={isLastDeliveredMessage}
        onClickReceipts={onClickReceipts}
      />
    );
    if (onVisible) {
      return <InViewport onVisible={onVisible}>{content}</InViewport>;
    }
    return content;
  }
  if (message.isFileTypeRestricted()) {
    return <FileTypeRestrictedMessage message={message} />;
  }
  if (message.isMissed()) {
    return <MissedMessage />;
  }
  return null;
};

const Wrapper: React.FC<
  MessageParams & {conversationLastReadTimestamp: number; scrollTo?: (element: HTMLElement, center?: boolean) => void}
> = props => {
  const {message, previousMessage, conversationLastReadTimestamp, isMarked} = props;
  const messageElementRef = useRef<HTMLDivElement>();
  const {status, ephemeral_expires, timestamp} = useKoSubscribableChildren(message, [
    'status',
    'ephemeral_expires',
    'timestamp',
  ]);
  const timeago = useRelativeTimestamp(message.timestamp());
  const timeagoDay = useRelativeTimestamp(message.timestamp(), true);
  const markerType = getMessageMarkerType(message, previousMessage, conversationLastReadTimestamp);

  useLayoutEffect(() => {
    if (isMarked) {
      props.scrollTo(messageElementRef.current, true);
    } else if (markerType === MessageMarkerType.UNREAD) {
      props.scrollTo(messageElementRef.current);
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

  return (
    <div
      className={`message ${isMarked ? 'message-marked' : ''}`}
      ref={messageElementRef}
      key={message.id}
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

      <MessageWrapper {...props} hasMarker={markerType !== MessageMarkerType.NONE} />
    </div>
  );
};

export default Wrapper;
