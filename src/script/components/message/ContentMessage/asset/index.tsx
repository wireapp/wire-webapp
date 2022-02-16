import React from 'react';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {QualifiedId} from '@wireapp/api-client/src/user';
import {Asset} from 'src/script/entity/message/Asset';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import type {MediumImage} from 'src/script/entity/message/MediumImage';
import type {Text} from 'src/script/entity/message/Text';
import type {Location} from 'src/script/entity/message/Location';

import FileAssetComponent from './FileAssetComponent';
import AudioAssetComponent from './AudioAsset';
import ImageAssetComponent from './ImageAsset';
import LinkPreviewAssetComponent from './LinkPreviewAssetComponent';
import LocationAssetComponent from './LocationAsset';
import VideoAssetComponent from './VideoAsset';
import ButtonAssetComponent from './MessageButton';

import {AssetType} from '../../../../assets/AssetType';
import {Button} from 'src/script/entity/message/Button';
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import {StatusType} from '../../../../message/StatusType';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MessageActions} from '../../MessageWrapper';

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
  onClickButton: (message: ContentMessage, assetId: string) => void;
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

export default ContentAsset;
