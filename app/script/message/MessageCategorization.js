/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.message = z.message || {};

z.message.MessageCategorization = (function() {

  const _check_text = function(event) {
    if (event.type === z.event.Client.CONVERSATION.MESSAGE_ADD) {
      let category = z.message.MessageCategory.TEXT;

      if (event.data.previews && event.data.previews.length > 0) {
        category = category | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW;
      }

      return category;
    }
  };

  const _check_asset = function(event) {
    if (event.type === z.event.Client.CONVERSATION.ASSET_ADD) {
      if (event.data.info.tag === undefined) {
        return z.message.MessageCategory.FILE;
      }

      let category = z.message.MessageCategory.IMAGE;

      if (event.data.content_type === 'image/gif') {
        category = category | z.message.MessageCategory.GIF;
      }

      return category;
    }
  };

  const _check_ping = function(event) {
    if (event.type === z.event.Backend.CONVERSATION.KNOCK) {
      return z.message.MessageCategory.KNOCK;
    }
  };

  const _check_location = function(event) {
    if (event.type === z.event.Client.CONVERSATION.LOCATION) {
      return z.message.MessageCategory.LOCATION;
    }
  };

  const _category_from_event = function(event) {
    try {
      let category = z.message.MessageCategory.NONE;

      if (event.ephemeral_expires) { // String, Number, true
        return z.message.MessageCategory.NONE;
      }

      for (const check of [_check_text, _check_asset, _check_ping, _check_location]) {
        const temp_category = check(event);
        if (temp_category) {
          category = temp_category;
          break;
        }
      }

      if (_.isObject(event.reactions) && (Object.keys(event.reactions).length > 0)) {
        category = category | z.message.MessageCategory.LIKED;
      }

      return category;

    } catch (error) {
      return z.message.MessageCategory.UNDEFINED;
    }
  };

  return {
    category_from_event: _category_from_event,
  };
})();
