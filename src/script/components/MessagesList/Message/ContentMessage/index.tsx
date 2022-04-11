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

import {QualifiedId} from '@wireapp/api-client/src/user';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {EphemeralStatusType} from '../../../../message/EphemeralStatusType';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import MessageQuote from './MessageQuote';
import MessageLike from './MessageLike';
import MessageFooterLike from './MessageFooterLike';
import ReadReceiptStatus from '../ReadReceiptStatus';
import EphemeralTimer from '../EphemeralTimer';

import MessageTime from '../MessageTime';
import {ContextMenuEntry, showContextMenu} from '../../../../ui/ContextMenu';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {MessageActions} from '..';
import {Message} from 'src/script/entity/message/Message';
import ContentAsset from './asset';

export interface ContentMessageProps extends Omit<MessageActions, 'onClickResetSession'> {
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  hasMarker?: boolean;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickButton?: (message: ContentMessage, assetId: string) => void;
  previousMessage: Message;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
}

const ContentMessageComponent: React.FC<ContentMessageProps> = ({
  conversation,
  message,
  findMessage,
  selfId,
  hasMarker,
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

  const avatarSection = shouldShowAvatar() ? (
    <div className="message-header">
      <div className="message-header-icon">
        <Avatar participant={message.user()} onAvatarClick={onClickAvatar} avatarSize={AVATAR_SIZE.X_SMALL} />
      </div>
      <div className="message-header-label">
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

  return (
    <>
      {avatarSection}
      {message.quote() && (
        <MessageQuote
          conversation={conversation}
          quote={message.quote()}
          selfId={selfId}
          findMessage={findMessage}
          showDetail={onClickImage}
          focusMessage={onClickTimestamp}
          handleClickOnMessage={onClickMessage}
          showUserDetails={onClickAvatar}
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
          />
        ))}

        {!other_likes.length && message.isReactable() && (
          <div className="message-body-like">
            <MessageLike
              className="message-body-like-icon like-button message-show-on-hover"
              message={message}
              onLike={onLike}
            />
          </div>
        )}

        <div className="message-body-actions">
          {menuEntries.length > 0 && (
            <button
              className="context-menu icon-more font-size-xs"
              aria-label={t('accessibility.conversationContextMenuOpenLabel')}
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
          />
        </div>
      </div>
      {other_likes.length > 0 && (
        <MessageFooterLike
          message={message}
          is1to1Conversation={conversation.is1to1()}
          onLike={onLike}
          onClickLikes={onClickLikes}
        />
      )}
    </>
  );
};

export default ContentMessageComponent;
