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

import {ClientEvent} from 'Repositories/event/client';
import {EventRecord} from 'Repositories/storage/record/eventRecord';

import {messageCategory} from './messageCategory';

const _checkAsset = (event: any): messageCategory | void => {
  const {data: eventData, type: eventType} = event;

  const isAssetAdd = eventType === ClientEvent.CONVERSATION.ASSET_ADD;
  if (isAssetAdd) {
    const isTagUndefined = eventData.info.tag === undefined;
    if (isTagUndefined) {
      return messageCategory.FILE;
    }

    let category = messageCategory.IMAGE;
    if (eventData.content_type === 'image/gif') {
      category = category | messageCategory.GIF;
    }

    return category;
  }
};

const _checkLocation = (event: any): messageCategory | void => {
  const isLocation = event.type === ClientEvent.CONVERSATION.LOCATION;
  if (isLocation) {
    return messageCategory.LOCATION;
  }
};

const _checkPing = (event: any): messageCategory | void => {
  const isPing = event.type === ClientEvent.CONVERSATION.KNOCK;
  if (isPing) {
    return messageCategory.KNOCK;
  }
};

const _checkComposite = (event: any): messageCategory | void => {
  const isComposite = event.type === ClientEvent.CONVERSATION.COMPOSITE_MESSAGE_ADD;
  if (isComposite) {
    return messageCategory.COMPOSITE;
  }
};

const _checkText = (event: any): messageCategory | void => {
  const {data: eventData, type: eventType} = event;

  const isMessageAdd =
    eventType === ClientEvent.CONVERSATION.MESSAGE_ADD || eventType === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD;
  if (isMessageAdd) {
    let category = messageCategory.TEXT;

    const isLinkPreview = eventData.previews && !!eventData.previews.length;
    if (isLinkPreview) {
      category = category | messageCategory.LINK | messageCategory.LINK_PREVIEW;
    }

    return category;
  }
};

export const categoryFromEvent = (event: Partial<EventRecord>): messageCategory => {
  try {
    const eventReactions = 'reactions' in event && event.reactions;
    let category = messageCategory.NONE;

    const categoryChecks = [_checkText, _checkAsset, _checkPing, _checkLocation, _checkComposite];
    for (const check of categoryChecks) {
      const matchedCategory = check(event);
      if (matchedCategory) {
        category = matchedCategory;
        break;
      }
    }

    const isReaction = isObject(eventReactions) && !!Object.keys(eventReactions).length;
    if (isReaction) {
      category = category | messageCategory.LIKED;
    }

    return category;
  } catch (error: unknown) {
    return messageCategory.UNDEFINED;
  }
};
