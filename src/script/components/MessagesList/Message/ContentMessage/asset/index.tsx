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

import {QualifiedId} from '@wireapp/api-client/src/user';

import {Asset} from 'src/script/entity/message/Asset';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import type {Location} from 'src/script/entity/message/Location';
import type {MediumImage} from 'src/script/entity/message/MediumImage';
import type {Text} from 'src/script/entity/message/Text';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';

import {FileAssetComponent} from './FileAssetComponent';
import {LinkPreviewAssetComponent} from './LinkPreviewAssetComponent';

import {MessageActions} from '../..';
import {AssetType} from '../../../../../assets/AssetType';
import {Button} from '../../../../../entity/message/Button';
import {CompositeMessage} from '../../../../../entity/message/CompositeMessage';
import {ContentMessage} from '../../../../../entity/message/ContentMessage';
import {StatusType} from '../../../../../message/StatusType';

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
  onClickButton: (message: CompositeMessage, buttonId: string) => void;
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
              role="button"
              tabIndex={0}
              className={`text ${includesOnlyEmojis((asset as Text).text) ? 'text-large' : ''} ${
                status === StatusType.SENDING ? 'text-foreground' : ''
              } ${isObfuscated ? 'ephemeral-message-obfuscated' : ''}`}
              dangerouslySetInnerHTML={{__html: (asset as Text).render(selfId, message.accent_color())}}
              onClick={event => onClickMessage(asset as Text, event)}
              onKeyDown={event => handleKeyDown(event, () => onClickMessage(asset as Text, event))}
              onAuxClick={event => onClickMessage(asset as Text, event)}
              dir="auto"
            />
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
          <div className={`message-asset ${isObfuscated ? 'ephemeral-asset-expired icon-file' : ''}`}>
            <FileAssetComponent message={message} />
          </div>
        );
      }

      if ((asset as FileAsset).isAudio()) {
        return (
          <div className={`message-asset ${isObfuscated ? 'ephemeral-asset-expired' : ''}`}>
            <AudioAssetComponent message={message} />
          </div>
        );
      }

      if ((asset as FileAsset).isVideo()) {
        return (
          <div className={`message-asset ${isObfuscated ? 'ephemeral-asset-expired icon-movie' : ''}`}>
            <VideoAssetComponent message={message} />
          </div>
        );
      }
    case AssetType.IMAGE:
      return <ImageAssetComponent asset={asset as MediumImage} message={message} onClick={onClickImage} />;
    case AssetType.LOCATION:
      return <LocationAssetComponent asset={asset as Location} />;
    case AssetType.BUTTON:
      const assetId = asset.id;
      if (!(message instanceof CompositeMessage && asset instanceof Button && assetId)) {
        return null;
      }

      return (
        <ButtonAssetComponent
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
