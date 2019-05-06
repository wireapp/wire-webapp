/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {isObject} from 'underscore';

import {ClientEvent} from '../event/Client';
import {MessageCategory} from './MessageCategory';

const _checkAsset = event => {
  const {data: eventData, type: eventType} = event;

  const isAssetAdd = eventType === ClientEvent.CONVERSATION.ASSET_ADD;
  if (isAssetAdd) {
    const isTagUndefined = eventData.info.tag === undefined;
    if (isTagUndefined) {
      return MessageCategory.FILE;
    }

    let category = MessageCategory.IMAGE;
    if (eventData.content_type === 'image/gif') {
      category = category | MessageCategory.GIF;
    }

    return category;
  }
};

const _checkLocation = event => {
  const isLocation = event.type === ClientEvent.CONVERSATION.LOCATION;
  if (isLocation) {
    return MessageCategory.LOCATION;
  }
};

const _checkPing = event => {
  const isPing = event.type === ClientEvent.CONVERSATION.KNOCK;
  if (isPing) {
    return MessageCategory.KNOCK;
  }
};

const _checkText = event => {
  const {data: eventData, type: eventType} = event;

  const isMessageAdd = eventType === ClientEvent.CONVERSATION.MESSAGE_ADD;
  if (isMessageAdd) {
    let category = MessageCategory.TEXT;

    const isLinkPreview = eventData.previews && !!eventData.previews.length;
    if (isLinkPreview) {
      category = category | MessageCategory.LINK | MessageCategory.LINK_PREVIEW;
    }

    return category;
  }
};

export const categoryFromEvent = event => {
  try {
    const eventReactions = event.reactions;
    let category = MessageCategory.NONE;

    const categoryChecks = [_checkText, _checkAsset, _checkPing, _checkLocation];
    for (const check of categoryChecks) {
      const matchedCategory = check(event);
      if (matchedCategory) {
        category = matchedCategory;
        break;
      }
    }

    const isReaction = isObject(eventReactions) && !!Object.keys(eventReactions).length;
    if (isReaction) {
      category = category | MessageCategory.LIKED;
    }

    return category;
  } catch (error) {
    return MessageCategory.UNDEFINED;
  }
};
