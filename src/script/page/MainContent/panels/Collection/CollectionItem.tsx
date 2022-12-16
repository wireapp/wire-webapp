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

import {FC} from 'react';

import {Image} from 'Components/Image';
import {AudioAsset} from 'Components/MessagesList/Message/ContentMessage/asset/AudioAsset';
import {FileAsset} from 'Components/MessagesList/Message/ContentMessage/asset/FileAssetComponent';
import {LinkPreviewAsset} from 'Components/MessagesList/Message/ContentMessage/asset/LinkPreviewAssetComponent';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {isOfCategory} from './utils';

interface CollectionItemProps {
  allMessages: ContentMessage[];
  message: ContentMessage;
  onImageClick?: (message: ContentMessage) => void;
}

const CollectionItem: FC<CollectionItemProps> = ({message, onImageClick}) => {
  const {assets} = useKoSubscribableChildren(message, ['assets']);
  const firstAsset = assets[0];
  const {resource} = useKoSubscribableChildren(firstAsset as MediumImage, ['resource']);

  if (isOfCategory('images', message) && resource) {
    return (
      <Image
        className="collection-image"
        asset={resource}
        data-uie-name="image-asset"
        click={() => onImageClick?.(message)}
      />
    );
  }
  if (isOfCategory('links', message)) {
    return <LinkPreviewAsset message={message} header />;
  }

  if (isOfCategory('files', message)) {
    return <FileAsset message={message} hasHeader />;
  }

  if (isOfCategory('audio', message)) {
    return <AudioAsset className="collection-file" message={message} hasHeader />;
  }

  return null;
};

export {CollectionItem};
