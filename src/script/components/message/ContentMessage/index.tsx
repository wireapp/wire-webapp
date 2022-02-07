/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import {registerReactComponent} from 'Util/ComponentUtil';

import {Message} from 'src/script/entity/message/Message';
import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {EphemeralStatusType} from '../../../message/EphemeralStatusType';

import {Asset} from 'src/script/entity/message/Asset';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import type {MediumImage} from 'src/script/entity/message/MediumImage';
import type {Text} from 'src/script/entity/message/Text';
import type {Location} from 'src/script/entity/message/Location';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import MessageQuote from './MessageQuote';
import MessageLike from './MessageLike';
import MessageFooterLike from './MessageFooterLike';
import FileAssetComponent from './asset/FileAssetComponent';
import AudioAssetComponent from './asset/AudioAsset';
import ImageAssetComponent from './asset/ImageAsset';
import LinkPreviewAssetComponent from './asset/LinkPreviewAssetComponent';
import LocationAssetComponent from './asset/LocationAsset';
import VideoAssetComponent from './asset/VideoAsset';
import ButtonAssetComponent from './asset/MessageButton';
import ReadReceiptStatus from '../ReadReceiptStatus';
import EphemeralTimer from '../EphemeralTimer';

import {AssetType} from '../../../assets/AssetType';
import {Button} from 'src/script/entity/message/Button';
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import MessageTime from '../MessageTime';
import {ContextMenuEntry, showContextMenu} from '../../../ui/ContextMenu';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

export interface TextMessageProps {
  contextMenuEntries: ContextMenuEntry[];
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickAvatar?: () => void;
  onClickButton?: (message: ContentMessage, assetId: string) => void;
  onClickImage?: () => void;
  onClickLikes?: () => void;
  onClickMessage?: () => void;
  onClickReceipts?: (view: {message: Message}) => void;
  onClickTimestamp?: () => void;
  onLike?: () => void;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
  shouldShowAvatar: boolean;
}

const ContentAsset = ({
  asset,
  message,
  selfId,
  onClickImage,
  onClickButton,
}: {
  asset: Asset;
  message: ContentMessage;
  onClickButton: (message: ContentMessage, assetId: string) => void;
  onClickImage: () => void;
  selfId: QualifiedId;
}) => {
  switch (asset.type) {
    case AssetType.TEXT:
      return (
        <>
          {(asset as Text).should_render_text() && (
            <div
              className="text"
              dangerouslySetInnerHTML={{__html: (asset as Text).render(selfId, message.accent_color())}}
              data-bind="html: asset.render(selfId(), accentColor()), event: {mousedown: (data, event) => onClickMessage(asset, event)}, css: {'text-large': includesOnlyEmojis(asset.text), 'text-foreground': message.status() === StatusType.SENDING, 'ephemeral-message-obfuscated': message.isObfuscated()}"
              dir="auto"
            ></div>
          )}
          {(asset as Text).previews().map(preview => (
            <div key={preview.url} className="message-asset">
              <LinkPreviewAssetComponent message={message} />
            </div>
          ))}
        </>
      );
    case AssetType.FILE:
      if ((asset as FileAsset).isFile()) {
        return (
          <div className={`message-asset ${message.isObfuscated() && 'ephemeral-asset-expired icon-file'}`}>
            <FileAssetComponent message={message} />
          </div>
        );
      }
      if ((asset as FileAsset).isAudio()) {
        return (
          <div className={`message-asset ${message.isObfuscated() && 'ephemeral-asset-expired'}`}>
            <AudioAssetComponent message={message} />
          </div>
        );
      }
      if ((asset as FileAsset).isVideo()) {
        return (
          <div className={`message-asset ${message.isObfuscated() && 'ephemeral-asset-expired icon-movie'}`}>
            <VideoAssetComponent message={message} />
          </div>
        );
      }
    case AssetType.IMAGE:
      return <ImageAssetComponent asset={asset as MediumImage} message={message} onClick={onClickImage} />;
    case AssetType.LOCATION:
      return <LocationAssetComponent asset={asset as Location} />;
    case AssetType.BUTTON:
      return (
        <ButtonAssetComponent
          onClick={() => onClickButton(message, asset.id)}
          label={(asset as Button).text}
          id={asset.id}
          message={message as CompositeMessage}
        />
      );
  }
  return null;
};

const TextMessage: React.FC<TextMessageProps> = ({
  conversation,
  message,
  findMessage,
  selfId,
  shouldShowAvatar,
  isLastDeliveredMessage,
  contextMenuEntries,
  onClickReceipts,
  onClickAvatar,
  onClickImage,
  onClickTimestamp,
  onClickMessage,
  onClickLikes,
  onClickButton,
  onLike,
}) => {
  /*
  const {unsafeSenderName, caption, timestamp, ephemeral_caption, isObfuscated} = useKoSubscribableChildren(message, [
    'unsafeSenderName',
    'timestamp',
    'ephemeral_caption',
    'isObfuscated',
  ]);
  */

  const avatarSection = shouldShowAvatar ? (
    <div className="message-header">
      <div className="message-header-icon">
        <Avatar participant={message.user()} onAvatarClick={onClickAvatar} avatarSize={AVATAR_SIZE.X_SMALL} />
      </div>
      <div className="message-header-label">
        <span className={`message-header-label-sender ${message.accent_color()}`} data-uie-name="sender-name">
          {message.headerSenderName()}
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
        {message.was_edited() && (
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
      <div className="message-body" title={message.ephemeral_caption()}>
        {message.ephemeral_status() === EphemeralStatusType.ACTIVE && (
          <div className="message-ephemeral-timer">
            <EphemeralTimer message={message} />
          </div>
        )}

        {message.assets().map(asset => (
          <ContentAsset
            key={asset.id}
            asset={asset}
            message={message}
            selfId={selfId}
            onClickButton={onClickButton}
            onClickImage={onClickImage}
          />
        ))}

        {!message.other_likes().length && message.isReactable() && (
          <div className="message-body-like">
            <MessageLike
              className="message-body-like-icon like-button message-show-on-hover"
              message={message}
              onLike={onLike}
            />
          </div>
        )}

        <div className="message-body-actions">
          {contextMenuEntries.length > 0 && (
            <span
              className="context-menu icon-more font-size-xs"
              onClick={event => showContextMenu(event, contextMenuEntries, 'message-options-menu')}
            ></span>
          )}
          {message.ephemeral_status() === EphemeralStatusType.ACTIVE && (
            <time
              className="time"
              data-uie-uid={message.id}
              title={message.ephemeral_caption()}
              data-timestamp={message.timestamp}
              data-bind="showAllTimestamps"
            >
              {message.displayTimestampShort()}
            </time>
          )}
          {message.ephemeral_status() !== EphemeralStatusType.ACTIVE && (
            <MessageTime data-uie-uid={message.id} timestamp={message.timestamp()}>
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

        {message.other_likes().length > 0 && (
          <MessageFooterLike
            message={message}
            is1to1Conversation={conversation.is1to1()}
            onLike={onLike}
            onClickLikes={onClickLikes}
          />
        )}
      </div>
    </>
  );
};

export default TextMessage;

registerReactComponent('text-message', {
  bindings: `message: ko.unwrap(message),
    conversation: ko.unwrap(conversation),
    selfId: selfId,
    contextMenuEntries: ko.unwrap(contextMenuEntries),
    findMessage: findMessage,
    isLastDeliveredMessage: ko.unwrap(isLastDeliveredMessage),
    onClickReceipts: onClickReceipts,
    onLike: onLike,
    onClickAvatar: onClickAvatar,
    onClickMessage: onClickMessage,
    onClickTimestamp: onClickTimestamp,
    onClickLikes: onClickLikes,
    onClickButton: onClickButton,
    shouldShowAvatar: shouldShowAvatar,
    `,
  component: TextMessage,
});
