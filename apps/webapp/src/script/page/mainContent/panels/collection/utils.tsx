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

export const isOfCategory = (category: Category, message: ContentMessage): boolean => {
  const messageCategory = message.category;
  if (messageCategory === undefined) {
    return false;
  }
  switch (category) {
    case 'images':
      return (messageCategory & MessageCategory.IMAGE) !== 0 && (messageCategory & MessageCategory.GIF) === 0;
    case 'links':
      return (messageCategory & MessageCategory.LINK_PREVIEW) !== 0;
    case 'audio':
      return (messageCategory & MessageCategory.FILE) !== 0 && message.getFirstAsset()?.isAudio() === true;
    case 'files':
      return (
        (messageCategory & MessageCategory.FILE) !== 0 &&
        message.getFirstAsset()?.isAudio() !== true &&
        (message.getFirstAsset()?.isFile() === true || message.getFirstAsset()?.isVideo() === true)
      );
    default:
      return false;
  }
};
