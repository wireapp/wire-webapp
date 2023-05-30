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

import React, {useMemo} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Conversation} from 'src/script/entity/Conversation';
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Message} from 'src/script/entity/message/Message';
import {StatusType} from 'src/script/message/StatusType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageAriaLabel} from 'Util/conversationMessages';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {ContentAsset} from './asset';
import {MessageFooterLike} from './MessageFooterLike';
import {MessageHeader} from './MessageHeader';
import {MessageLike} from './MessageLike';
import {Quote} from './MessageQuote';
import {CompleteFailureToSendWarning, PartialFailureToSendWarning} from './Warnings';

import {MessageActions} from '..';
import {EphemeralStatusType} from '../../../../message/EphemeralStatusType';
import {ContextMenuEntry, showContextMenu} from '../../../../ui/ContextMenu';
import {EphemeralTimer} from '../EphemeralTimer';
import {MessageTime} from '../MessageTime';
import {ReadReceiptStatus} from '../ReadReceiptStatus';
import {useMessageFocusedTabIndex} from '../util';

export interface ContentMessageProps extends Omit<MessageActions, 'onClickResetSession'> {
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  hasMarker?: boolean;
  isMessageFocused: boolean;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickButton: (message: CompositeMessage, buttonId: string) => void;
  onRetry: (message: ContentMessage) => void;
  previousMessage?: Message;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
  isMsgElementsFocusable: boolean;
}

const ContentMessageComponent: React.FC<ContentMessageProps> = ({
  conversation,
  message,
  findMessage,
  selfId,
  hasMarker,
  isMessageFocused,
  isLastDeliveredMessage,
  contextMenu,
  previousMessage,
  onClickReceipts,
  onClickAvatar,
  onClickImage,
  onClickTimestamp,
  onClickMessage,
  onClickLikes,
  onClickButton,
  onLike,
  onRetry,
  isMsgElementsFocusable,
}) => {
  const msgFocusState = useMemo(
    () => isMsgElementsFocusable && isMessageFocused,
    [isMsgElementsFocusable, isMessageFocused],
  );
  const messageFocusedTabIndex = useMessageFocusedTabIndex(msgFocusState);
  const {entries: menuEntries} = useKoSubscribableChildren(contextMenu, ['entries']);
  const {
    senderName,
    timestamp,
    ephemeral_caption,
    ephemeral_status,
    assets,
    other_likes,
    was_edited,
    failedToSend,
    status,
    user,
  } = useKoSubscribableChildren(message, [
    'senderName',
    'timestamp',
    'ephemeral_caption',
    'ephemeral_status',
    'assets',
    'other_likes',
    'was_edited',
    'failedToSend',
    'status',
    'user',
  ]);

  const shouldShowAvatar = (): boolean => {
    if (!previousMessage || hasMarker) {
      return true;
    }

    if (message.isContent() && was_edited) {
      return true;
    }

    return !previousMessage.isContent() || previousMessage.user().id !== user.id;
  };

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
      const newEvent = setContextMenuPosition(event);
      showContextMenu(newEvent, menuEntries, 'message-options-menu');
    }
  };

  const [messageAriaLabel] = getMessageAriaLabel({
    assets,
    displayTimestampShort: message.displayTimestampShort(),
    senderName,
  });

  return (
    <div aria-label={messageAriaLabel}>
      {shouldShowAvatar() && (
        <MessageHeader onClickAvatar={onClickAvatar} message={message} focusTabIndex={messageFocusedTabIndex}>
          {was_edited && (
            <span className="message-header-label-icon icon-edit" title={message.displayEditedTimestamp()}></span>
          )}
        </MessageHeader>
      )}
      {message.quote() && (
        <Quote
          conversation={conversation}
          quote={message.quote()}
          selfId={selfId}
          findMessage={findMessage}
          showDetail={onClickImage}
          focusMessage={onClickTimestamp}
          handleClickOnMessage={onClickMessage}
          showUserDetails={onClickAvatar}
          isMessageFocused={msgFocusState}
        />
      )}
      <div className="message-body" title={ephemeral_caption}>
        {ephemeral_status === EphemeralStatusType.ACTIVE && (
          <div className="message-ephemeral-timer">
            <EphemeralTimer message={message} />
          </div>
        )}

        {assets.map(asset => (
          <ContentAsset
            key={asset.type}
            asset={asset}
            message={message}
            selfId={selfId}
            onClickButton={onClickButton}
            onClickImage={onClickImage}
            onClickMessage={onClickMessage}
            isMessageFocused={msgFocusState}
          />
        ))}

        {failedToSend && (
          <PartialFailureToSendWarning
            isMessageFocused={msgFocusState}
            failedToSend={failedToSend}
            knownUsers={conversation.allUserEntities()}
          />
        )}

        {[StatusType.FAILED, StatusType.FEDERATION_ERROR].includes(status) && (
          <CompleteFailureToSendWarning
            {...(status === StatusType.FEDERATION_ERROR && {unreachableDomain: conversation.domain})}
            isMessageFocused={msgFocusState}
            onRetry={() => onRetry(message)}
          />
        )}

        {!other_likes.length && message.isReactable() && (
          <div className="message-body-like">
            <MessageLike
              className="message-body-like-icon like-button message-show-on-hover"
              message={message}
              onLike={onLike}
              isMessageFocused={msgFocusState}
            />
          </div>
        )}

        <div className="message-body-actions">
          {menuEntries.length > 0 && (
            <button
              tabIndex={messageFocusedTabIndex}
              className="context-menu icon-more font-size-xs"
              aria-label={t('accessibility.conversationContextMenuOpenLabel')}
              onKeyDown={handleContextKeyDown}
              onClick={event => showContextMenu(event, menuEntries, 'message-options-menu')}
            ></button>
          )}

          {ephemeral_status === EphemeralStatusType.ACTIVE && (
            <time
              className="time"
              data-uie-uid={message.id}
              title={ephemeral_caption}
              data-timestamp={timestamp}
              data-bind="showAllTimestamps"
            >
              {message.displayTimestampShort()}
            </time>
          )}

          {ephemeral_status !== EphemeralStatusType.ACTIVE && (
            <MessageTime data-uie-uid={message.id} timestamp={timestamp}>
              {message.displayTimestampShort()}
            </MessageTime>
          )}

          <ReadReceiptStatus
            message={message}
            is1to1Conversation={conversation.is1to1()}
            isLastDeliveredMessage={isLastDeliveredMessage}
            onClickReceipts={onClickReceipts}
            isMessageFocused={msgFocusState}
          />
        </div>
      </div>

      {other_likes.length > 0 && (
        <div>
          <MessageFooterLike
            message={message}
            is1to1Conversation={conversation.is1to1()}
            onLike={onLike}
            onClickLikes={onClickLikes}
            isMessageFocused={msgFocusState}
          />
        </div>
      )}
    </div>
  );
};

export {ContentMessageComponent};
