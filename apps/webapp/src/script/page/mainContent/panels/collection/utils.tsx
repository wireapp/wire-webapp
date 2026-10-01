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

import {ContentMessage} from 'Repositories/entity/message/contentMessage';

import {MessageCategory} from '../../../../message/messageCategory';

export type Category = 'images' | 'links' | 'files' | 'audio';

export const isOfCategory = (category: Category, message: ContentMessage) => {
  const messageCategory = message.category;
  if (messageCategory === undefined) {
    return false;
  }
  switch (category) {
    case 'images': {
      const imageCategory = messageCategory & MessageCategory.IMAGE;

      return imageCategory === 0 ? 0 : (messageCategory & MessageCategory.GIF) === 0;
    }
    case 'links':
      return messageCategory & MessageCategory.LINK_PREVIEW;
    case 'audio': {
      const fileCategory = messageCategory & MessageCategory.FILE;

      return fileCategory === 0 ? 0 : message.getFirstAsset()?.isAudio();
    }
    case 'files': {
      const fileCategory = messageCategory & MessageCategory.FILE;
      if (fileCategory === 0) {
        return 0;
      }

      const isFile = message.getFirstAsset()?.isFile();

      return isFile === true ? true : message.getFirstAsset()?.isVideo();
    }
    default:
      return false;
  }
};
