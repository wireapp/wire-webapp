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

window.z = window.z || {};
window.z.message = z.message || {};

z.message.MessageCategorization = (() => {
  const _checkAsset = event => {
    const {data: eventData, type: eventType} = event;

    const isAssetAdd = eventType === z.event.Client.CONVERSATION.ASSET_ADD;
    if (isAssetAdd) {
      const isTagUndefined = eventData.info.tag === undefined;
      if (isTagUndefined) {
        return z.message.MessageCategory.FILE;
      }

      let category = z.message.MessageCategory.IMAGE;
      if (eventData.content_type === 'image/gif') {
        category = category | z.message.MessageCategory.GIF;
      }

      return category;
    }
  };

  const _checkLocation = event => {
    const isLocation = event.type === z.event.Client.CONVERSATION.LOCATION;
    if (isLocation) {
      return z.message.MessageCategory.LOCATION;
    }
  };

  const _checkPing = event => {
    const isPing = event.type === z.event.Client.CONVERSATION.KNOCK;
    if (isPing) {
      return z.message.MessageCategory.KNOCK;
    }
  };

  const _checkText = event => {
    const {data: eventData, type: eventType} = event;

    const isMessageAdd = eventType === z.event.Client.CONVERSATION.MESSAGE_ADD;
    if (isMessageAdd) {
      let category = z.message.MessageCategory.TEXT;

      const isLinkPreview = eventData.previews && !!eventData.previews.length;
      if (isLinkPreview) {
        category = category | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW;
      }

      return category;
    }
  };

  return {
    categoryFromEvent: event => {
      try {
        const eventReactions = event.reactions;
        let category = z.message.MessageCategory.NONE;

        const categoryChecks = [_checkText, _checkAsset, _checkPing, _checkLocation];
        for (const check of categoryChecks) {
          const matchedCategory = check(event);
          if (matchedCategory) {
            category = matchedCategory;
            break;
          }
        }

        const isReaction = _.isObject(eventReactions) && !!Object.keys(eventReactions).length;
        if (isReaction) {
          category = category | z.message.MessageCategory.LIKED;
        }

        return category;
      } catch (error) {
        return z.message.MessageCategory.UNDEFINED;
      }
    },
  };
})();
