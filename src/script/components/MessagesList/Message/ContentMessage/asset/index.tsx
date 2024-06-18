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

import {Asset} from 'src/script/entity/message/Asset';
import type {FileAsset as FileAssetType} from 'src/script/entity/message/FileAsset';
import type {Location} from 'src/script/entity/message/Location';
import type {MediumImage} from 'src/script/entity/message/MediumImage';
import {Text} from 'src/script/entity/message/Text';
import {StatusType} from 'src/script/message/StatusType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';

import {AudioAsset} from './AudioAsset';
import {FileAsset} from './FileAssetComponent';
import {ImageAsset} from './ImageAsset';
import {LinkPreviewAsset} from './LinkPreviewAssetComponent';
import {LocationAsset} from './LocationAsset';
import {MessageButton} from './MessageButton';
import {TextMessageRenderer} from './TextMessageRenderer';
import {VideoAsset} from './VideoAsset';

import {MessageActions} from '../..';
import {AssetType} from '../../../../../assets/AssetType';
import {Button} from '../../../../../entity/message/Button';
import {CompositeMessage} from '../../../../../entity/message/CompositeMessage';
import {ContentMessage} from '../../../../../entity/message/ContentMessage';
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
  const {isObfuscated, status} = useKoSubscribableChildren(message, ['isObfuscated', 'status']);
  const {previews} = useKoSubscribableChildren(asset as Text, ['previews']);

  switch (asset.type) {
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
