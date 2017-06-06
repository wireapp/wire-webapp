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
window.z.util = z.util || {};

z.util.emoji = {
  includes_only_emojies: function(text) {
    // http://www.unicode.org/Public/emoji/1.0/emoji-data.txt
    // http://crocodillon.com/blog/parsing-emoji-unicode-in-javascript
    const emoji_regex = /\ud83c[\udf00-\udfff]|\ud83c[\udde6-\uddff]|\ud83d[\udc00-\udeff]|\ud83e[\udd10-\uddff]|[\u231a-\u27ff][\ufe0f]?/g;

    const is_valid_string = (string) => _.isString(string) && string.length > 0;
    const remove_emojies = (string) => string.replace(emoji_regex, '');
    const remove_whitespace = (string) => string.replace(/\s/g, '');

    return (
      is_valid_string(text) &&
      remove_emojies(remove_whitespace(text)).length === 0
    );
  },
};
