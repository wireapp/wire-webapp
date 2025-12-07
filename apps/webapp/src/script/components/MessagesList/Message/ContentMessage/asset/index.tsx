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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import cx from 'classnames';
import {AssetType} from 'Repositories/assets/AssetType';
import {Asset} from 'Repositories/entity/message/Asset';
import {Button} from 'Repositories/entity/message/Button';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from 'Repositories/entity/message/FileAsset';
import type {Location} from 'Repositories/entity/message/Location';
import type {MediumImage} from 'Repositories/entity/message/MediumImage';
import {Multipart} from 'Repositories/entity/message/Multipart';
import {Text} from 'Repositories/entity/message/Text';
import {StatusType} from 'src/script/message/StatusType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';

import {AudioAsset} from './AudioAsset/AudioAsset';
import {FileAsset} from './FileAsset/FileAsset';
import {ImageAsset} from './ImageAsset';
import {LinkPreviewAsset} from './LinkPreviewAssetComponent';
import {LocationAsset} from './LocationAsset';
import {MessageButton} from './MessageButton';
import {MultipartAssets} from './MultipartAssets/MultipartAssets';
import {TextMessageRenderer} from './TextMessageRenderer';
import {VideoAsset} from './VideoAsset/VideoAsset';

import {MessageActions} from '../..';
import {ReadIndicator} from '../../ReadIndicator';

interface ContentAssetProps {
  asset: Asset;
  message: ContentMessage;
  onClickButton: (message: CompositeMessage, buttonId: string) => void;
  onClickImage: MessageActions['onClickImage'];
  onClickMessage: MessageActions['onClickMessage'];
  selfId: QualifiedId;
  isMessageFocused: boolean;
  is1to1Conversation: boolean;
  isFileShareRestricted: boolean;
  onClickDetails: () => void;
}

const ContentAsset = ({
  asset,
  message,
  selfId,
  onClickImage,
  onClickMessage,
  onClickButton,
  isMessageFocused,
  is1to1Conversation,
  onClickDetails,
}: ContentAssetProps) => {
  const {isObfuscated, status, senderName, timestamp} = useKoSubscribableChildren(message, [
    'isObfuscated',
    'status',
    'senderName',
    'timestamp',
  ]);
  const {previews} = useKoSubscribableChildren(asset as Text, ['previews']);

  switch (asset.type) {
    case AssetType.MULTIPART:
      const multipartAsset = asset as Multipart;
      const shouldRenderTextMultipart = multipartAsset.should_render_text();
      const renderTextMultipart = multipartAsset.render(selfId, message.accent_color());

      const filesMultipart = multipartAsset.getCellAssets();

      return (
        <>
          {shouldRenderTextMultipart && (
            <TextMessageRenderer
              onMessageClick={onClickMessage}
              text={renderTextMultipart}
              className={cx('text', {
                'text-foreground': [StatusType.FAILED, StatusType.FEDERATION_ERROR, StatusType.SENDING].includes(
                  status,
                ),
                'text-large': includesOnlyEmojis(asset.text),
                'ephemeral-message-obfuscated': isObfuscated,
              })}
              isFocusable={isMessageFocused}
            />
          )}

          <MultipartAssets senderName={senderName} timestamp={timestamp} assets={filesMultipart} />

          {shouldRenderTextMultipart && (
            <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
          )}
          {previews.map(() => (
            <div key={asset.id} className="message-asset">
              <LinkPreviewAsset message={message} isFocusable={isMessageFocused} />

              {!shouldRenderText && (
                <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
              )}
            </div>
          ))}
        </>
      );
    case AssetType.TEXT:
      const shouldRenderText = (asset as Text).should_render_text();
      const renderText = (asset as Text).render(selfId, message.accent_color());

      return (
        <>
          {shouldRenderText && (
            <TextMessageRenderer
              onMessageClick={onClickMessage}
              text={renderText}
              className={cx('text', {
                'text-foreground': [StatusType.FAILED, StatusType.FEDERATION_ERROR, StatusType.SENDING].includes(
                  status,
                ),
                'text-large': includesOnlyEmojis(asset.text),
                'ephemeral-message-obfuscated': isObfuscated,
              })}
              isFocusable={isMessageFocused}
            />
          )}

          {shouldRenderText && (
            <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
          )}

          {previews.map(() => (
            <div key={asset.id} className="message-asset">
              <LinkPreviewAsset message={message} isFocusable={isMessageFocused} />

              {!shouldRenderText && (
                <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
              )}
            </div>
          ))}
        </>
      );
    case AssetType.FILE:
      if ((asset as FileAssetType).isFile()) {
        return <FileAsset message={message} isFocusable={isMessageFocused} />;
      }

      if ((asset as FileAssetType).isAudio()) {
        return <AudioAsset message={message} isFocusable={isMessageFocused} />;
      }

      if ((asset as FileAssetType).isVideo()) {
        return <VideoAsset message={message} isFocusable={isMessageFocused} />;
      }

    case AssetType.IMAGE:
      return (
        <ImageAsset
          asset={asset as MediumImage}
          message={message}
          onClick={onClickImage}
          isFocusable={isMessageFocused}
        />
      );

    case AssetType.LOCATION:
      return <LocationAsset asset={asset as Location} />;

    case AssetType.BUTTON:
      const assetId = asset.id;
      if (!(message instanceof CompositeMessage && asset instanceof Button && assetId)) {
        return null;
      }

      return (
        <MessageButton
          onClick={() => onClickButton(message, assetId)}
          label={asset.text}
          id={assetId}
          message={message as CompositeMessage}
        />
      );
  }

  return null;
};

export {ContentAsset};
