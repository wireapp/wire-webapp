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

import type {FunctionComponent} from 'react';

import cx from 'classnames';

import {AudioAsset} from './audioAsset/audioAsset';
import {FileAsset} from './fileAsset/fileAsset';
import {ImageAsset} from './imageAsset';
import {LinkPreviewAsset} from './linkPreviewAssetComponent';
import {LocationAsset} from './locationAsset';
import {MessageButton} from './messageButton';
import {MultipartAssets} from './multipartAssets/multipartAssets';
import {TextMessageRenderer} from './textMessageRenderer';
import {VideoAsset} from './videoAsset/videoAsset';

import {MessageActions} from '../..';
import {QualifiedId} from '../../../../../apiClient/user/qualifiedId';
import {StatusType} from '../../../../../message/statusType';
import {AssetType} from '../../../../../repositories/assets/assetType';
import {Asset} from '../../../../../repositories/entity/message/asset';
import {Button} from '../../../../../repositories/entity/message/button';
import {CompositeMessage} from '../../../../../repositories/entity/message/compositeMessage';
import {ContentMessage} from '../../../../../repositories/entity/message/contentMessage';
import type {FileAsset as FileAssetType} from '../../../../../repositories/entity/message/fileAsset';
import type {Location} from '../../../../../repositories/entity/message/location';
import type {MediumImage} from '../../../../../repositories/entity/message/mediumImage';
import {Multipart} from '../../../../../repositories/entity/message/multipart';
import {Text} from '../../../../../repositories/entity/message/text';
import {useKoSubscribableChildren} from '../../../../../util/componentUtil';
import {includesOnlyEmojis} from '../../../../../util/emojiUtil';
import {ReadIndicator} from '../../readIndicator';

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

const ContentAsset: FunctionComponent<ContentAssetProps> = ({
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

          <MultipartAssets
            conversationId={message.conversation_id}
            senderName={senderName}
            timestamp={timestamp}
            assets={filesMultipart}
          />

          {shouldRenderTextMultipart && (
            <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
          )}
          {previews.map(() => {
            return (
              <div key={asset.id} className="message-asset">
                <LinkPreviewAsset message={message} isFocusable={isMessageFocused} />

                {!shouldRenderText && (
                  <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
                )}
              </div>
            );
          })}
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

          {previews.map(() => {
            return (
              <div key={asset.id} className="message-asset">
                <LinkPreviewAsset message={message} isFocusable={isMessageFocused} />

                {!shouldRenderText && (
                  <ReadIndicator message={message} is1to1Conversation={is1to1Conversation} onClick={onClickDetails} />
                )}
              </div>
            );
          })}
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
      if (!(
        message instanceof CompositeMessage &&
        asset instanceof Button &&
        assetId !== undefined &&
        assetId !== ''
      )) {
        return null;
      }

      return (
        <MessageButton
          onClick={() => {
            return onClickButton(message, assetId);
          }}
          label={asset.text}
          id={assetId}
          message={message as CompositeMessage}
        />
      );
  }

  return null;
};

export {ContentAsset};
