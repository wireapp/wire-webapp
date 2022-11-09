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

import React from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {Conversation} from 'src/script/entity/Conversation';
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {Message} from 'src/script/entity/message/Message';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageAriaLabel} from 'Util/conversationMessages';
import {isTabKey, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {setContextMenuPosition} from 'Util/util';

import {ContentAsset} from './asset';
import {MessageFooterLike} from './MessageFooterLike';
import {MessageLike} from './MessageLike';
import {Quote} from './MessageQuote';

import {MessageActions} from '..';
import {EphemeralStatusType} from '../../../../message/EphemeralStatusType';
import {ContextMenuEntry, showContextMenu} from '../../../../ui/ContextMenu';
import {EphemeralTimer} from '../EphemeralTimer';
import {MessageTime} from '../MessageTime';
import {ReadReceiptStatus} from '../ReadReceiptStatus';

export interface ContentMessageProps extends Omit<MessageActions, 'onClickResetSession'> {
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  hasMarker?: boolean;
  focusConversation: boolean;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickButton: (message: CompositeMessage, buttonId: string) => void;
  previousMessage?: Message;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
  handleFocus: (index: number) => void;
  totalMessage: number;
}

const ContentMessageComponent: React.FC<ContentMessageProps> = ({
  conversation,
  message,
  findMessage,
  selfId,
  hasMarker,
  focusConversation,
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
  handleFocus,
  totalMessage,
}) => {
  const {entries: menuEntries} = useKoSubscribableChildren(contextMenu, ['entries']);
  const {headerSenderName, timestamp, ephemeral_caption, ephemeral_status, assets, other_likes, was_edited} =
    useKoSubscribableChildren(message, [
      'headerSenderName',
      'timestamp',
      'ephemeral_caption',
      'ephemeral_status',
      'assets',
      'other_likes',
      'was_edited',
    ]);
  const shouldShowAvatar = (): boolean => {
    if (!previousMessage || hasMarker) {
      return true;
    }

    if (message.isContent() && was_edited) {
      return true;
    }

    return !previousMessage.isContent() || previousMessage.user().id !== message.user().id;
  };

  //console.log('focusConversation', focusConversation);
  const avatarSection = shouldShowAvatar() ? (
    <div className="message-header">
      <div className="message-header-icon">
        <Avatar
          tabIndex={focusConversation ? 0 : -1}
          participant={message.user()}
          onAvatarClick={onClickAvatar}
          avatarSize={AVATAR_SIZE.X_SMALL}
        />
      </div>
      <div className="message-header-label" role="button">
        <span className={`message-header-label-sender ${message.accent_color()}`} data-uie-name="sender-name">
          {headerSenderName}
        </span>
        {message.user().isService && (
          <span className="message-header-icon-service">
            <Icon.Service />
          </span>
        )}
        {message.user().isExternal() && (
          <span
            className="message-header-icon-external with-tooltip with-tooltip--external"
            data-tooltip={t('rolePartner')}
            data-uie-name="sender-external"
          >
            <Icon.External />
          </span>
        )}
        {message.user().isFederated && (
          <span
            className="message-header-icon-guest with-tooltip with-tooltip--external"
            data-tooltip={message.user().handle}
            data-uie-name="sender-federated"
          >
            <Icon.Federation />
          </span>
        )}
        {message.user().isDirectGuest() && (
          <span
            className="message-header-icon-guest with-tooltip with-tooltip--external"
            data-tooltip={t('conversationGuestIndicator')}
            data-uie-name="sender-guest"
          >
            <Icon.Guest />
          </span>
        )}
        {was_edited && (
          <span className="message-header-label-icon icon-edit" title={message.displayEditedTimestamp()}></span>
        )}
      </div>
    </div>
  ) : null;

  const handleContextKeyDown = (event: React.KeyboardEvent) => {
    if ([KEY.SPACE, KEY.ENTER].includes(event.key)) {
      const newEvent = setContextMenuPosition(event);
      showContextMenu(newEvent, menuEntries, 'message-options-menu');
    }

    // context menu is the last tabbale element of a message, next tab press should
    // focus on the message input bar
    if (isTabKey(event)) {
      handleFocus(totalMessage - 1);
    }
  };

  const [messageAriaLabel] = getMessageAriaLabel({
    assets,
    displayTimestampShort: message.displayTimestampShort(),
    headerSenderName,
  });

  return (
    <div aria-label={messageAriaLabel}>
      {avatarSection}
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
          focusConversation={focusConversation}
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
            focusConversation={focusConversation}
          />
        ))}

        {!other_likes.length && message.isReactable() && (
          <div className="message-body-like">
            <MessageLike
              className="message-body-like-icon like-button message-show-on-hover"
              message={message}
              onLike={onLike}
              focusConversation={focusConversation}
            />
          </div>
        )}

        <div className="message-body-actions">
          {menuEntries.length && (
            <button
              tabIndex={focusConversation ? 0 : -1}
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
          <div>
            <ReadReceiptStatus
              message={message}
              is1to1Conversation={conversation.is1to1()}
              isLastDeliveredMessage={isLastDeliveredMessage}
              onClickReceipts={onClickReceipts}
              focusConversation={focusConversation}
            />
          </div>
        </div>
      </div>
      {other_likes.length > 0 && (
        <div>
          <MessageFooterLike
            message={message}
            is1to1Conversation={conversation.is1to1()}
            onLike={onLike}
            onClickLikes={onClickLikes}
            focusConversation={focusConversation}
          />
        </div>
      )}
    </div>
  );
};

export {ContentMessageComponent};
