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

  ranges = [
    '\ud83c[\udf00-\udfff]'
    '\ud83d[\udc00-\udeff]'
    '\ud83e[\udd10-\uddff]'
    '[\u2600-\u27ff][\ufe0f]?'
  ]

  is_valid_string = (string) ->
    return _.isString(string) and string.length > 0

  find_surrogate_pair = (point) ->
    offset = point - 0x10000
    lead = 0xd800 + (offset >> 10)
    trail = 0xdc00 + (offset & 0x3ff)
    return [lead.toString(16), trail.toString(16)]

  contains_only_emojies = (text) ->
    if is_valid_string(text)
      return text.replace(new RegExp(ranges.join('|'), 'g'), '').length is 0
    return

  return {
    contains_only_emojies: contains_only_emojies
    find_surrogate_pair: find_surrogate_pair
  }
