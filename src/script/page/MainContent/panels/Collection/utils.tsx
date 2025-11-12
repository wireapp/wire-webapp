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

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';

import {MessageCategory} from '../../../../message/MessageCategory';

export type Category = 'images' | 'links' | 'files' | 'audio';

export const isOfCategory = (category: Category, message: ContentMessage) => {
  switch (category) {
    case 'images':
      return message.category & MessageCategory.IMAGE && !(message.category & MessageCategory.GIF);
    case 'links':
      return message.category & MessageCategory.LINK_PREVIEW;
    case 'audio':
      return message.category & MessageCategory.FILE && message.getFirstAsset()?.isAudio();
    case 'files':
      return (
        message.category & MessageCategory.FILE &&
        (message.getFirstAsset()?.isFile() || message.getFirstAsset()?.isVideo())
      );
    default:
      return false;
  }
};
