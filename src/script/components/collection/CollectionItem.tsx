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
import Image from 'Components/Image';
import FileAssetComponent from 'Components/MessagesList/Message/ContentMessage/asset/FileAssetComponent';
import AudioAsset from 'Components/MessagesList/Message/ContentMessage/asset/AudioAsset';
import LinkPreviewAssetComponent from 'Components/MessagesList/Message/ContentMessage/asset/LinkPreviewAssetComponent';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MediumImage} from 'src/script/entity/message/MediumImage';
import {MessageCategory} from '../../message/MessageCategory';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

export type Category = 'images' | 'links' | 'files' | 'audio' | 'video';

export const isOfCategory = (category: Category, message: ContentMessage) => {
  switch (category) {
    case 'images':
      return message.category & MessageCategory.IMAGE;
    case 'links':
      return message.category & MessageCategory.LINK_PREVIEW;
    case 'files':
      return message.getFirstAsset()?.isFile();
    case 'audio':
      return message.getFirstAsset()?.isAudio();
    case 'video':
      return message.getFirstAsset()?.isVideo();
    default:
      return false;
  }
};

export const CollectionItem: React.FC<{allMessages: ContentMessage[]; message: ContentMessage}> = ({
  message,
  allMessages,
}) => {
  if (isOfCategory('images', message)) {
    return (
      <Image
        className="collection-image"
        asset={(message.getFirstAsset() as MediumImage).resource()}
        click={() => {
          amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, message, allMessages, 'collection');
        }}
      />
    );
  }
  if (isOfCategory('links', message)) {
    return <LinkPreviewAssetComponent message={message} header={true} />;
  }
  if (isOfCategory('files', message)) {
    return <FileAssetComponent message={message} hasHeader={true} />;
  }
  if (isOfCategory('audio', message)) {
    return <AudioAsset className="collection-file" message={message} hasHeader={true} />;
  }
  if (isOfCategory('video', message)) {
    return <FileAssetComponent message={message} hasHeader={true} />;
  }
  return null;
};
