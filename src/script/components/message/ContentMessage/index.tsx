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

import React, {useEffect} from 'react';

import {QualifiedId} from '@wireapp/api-client/src/user';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

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
import {StatusType} from '../../../message/StatusType';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {MessageActions} from '../MessageWrapper';

export interface TextMessageProps extends Omit<MessageActions, 'onClickResetSession'> {
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickButton?: (message: ContentMessage, assetId: string) => void;
  onContentUpdated?: () => void;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
  shouldShowAvatar: boolean;
}

const ContentAsset = ({
  asset,
  message,
  selfId,
  onClickImage,
  onClickMessage,
  onClickButton,
}: {
  asset: Asset;
  message: ContentMessage;
  onClickButton: TextMessageProps['onClickButton'];
  onClickImage: MessageActions['onClickImage'];
  onClickMessage: MessageActions['onClickMessage'];
  selfId: QualifiedId;
}) => {
  const {isObfuscated, status} = useKoSubscribableChildren(message, ['isObfuscated', 'status']);
  switch (asset.type) {
    case AssetType.TEXT:
      return (
        <>
          {(asset as Text).should_render_text() && (
            <div
              className={`text ${includesOnlyEmojis((asset as Text).text) ? 'text-large' : ''} ${
                status === StatusType.SENDING ? 'text-foreground' : ''
              } ${isObfuscated ? 'ephemeral-message-obfuscated' : ''}`}
              dangerouslySetInnerHTML={{__html: (asset as Text).render(selfId, message.accent_color())}}
              onClick={event => onClickMessage(asset as Text, event)}
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
          <div className={`message-asset ${isObfuscated && 'ephemeral-asset-expired icon-file'}`}>
            <FileAssetComponent message={message} />
          </div>
        );
      }
      if ((asset as FileAsset).isAudio()) {
        return (
          <div className={`message-asset ${isObfuscated && 'ephemeral-asset-expired'}`}>
            <AudioAssetComponent message={message} />
          </div>
        );
      }
      if ((asset as FileAsset).isVideo()) {
        return (
          <div className={`message-asset ${isObfuscated && 'ephemeral-asset-expired icon-movie'}`}>
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
  isLastDeliveredMessage,
  contextMenu,
  shouldShowAvatar,
  onClickReceipts,
  onClickAvatar,
  onClickImage,
  onClickTimestamp,
  onClickMessage,
  onClickLikes,
  onClickButton,
  onContentUpdated,
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

  useEffect(() => {
    if (message.hasAssetText()) {
      // add a listener to any changes to the assets. This will warn the parent that the message has changed
      const assetSubscription = message.assets.subscribe(onContentUpdated);
      // also listen for link previews on a single Text entity
      const previewSubscription = (message.getFirstAsset() as Text).previews.subscribe(onContentUpdated);
      return () => {
        if (assetSubscription) {
          assetSubscription.dispose();
          previewSubscription.dispose();
        }
      };
    }
    return undefined;
  }, []);

  const avatarSection = shouldShowAvatar ? (
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
          onContentUpdated={onContentUpdated}
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
            <span
              className="context-menu icon-more font-size-xs"
              onClick={event => showContextMenu(event, menuEntries, 'message-options-menu')}
            ></span>
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

export default TextMessage;
