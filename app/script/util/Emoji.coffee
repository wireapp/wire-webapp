#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

z.util.emoji = do ->

  # http://www.unicode.org/Public/emoji/1.0/emoji-data.txt
  # http://crocodillon.com/blog/parsing-emoji-unicode-in-javascript
  emoji_regex = /\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udeff]|\ud83e[\udd10-\uddff]|[\u231a-\u27ff][\ufe0f]?/g

  is_valid_string = (string) ->
    return _.isString(string) and string.length > 0

  remove_emojies = (text) ->
    return text.replace emoji_regex, ''

  remove_whitespace = (text) ->
    return text.replace ' ', ''

  includes_only_emojies = (text) ->
    return is_valid_string(text) and remove_emojies(remove_whitespace(text)).length is 0

  return {
    includes_only_emojies: includes_only_emojies
  }
