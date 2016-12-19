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

window.z ?= {}
z.message ?= {}

z.message.MessagaCategorization = do ->

  check_text = (event) ->
    category = z.message.MessageCategory.NONE

    if event.data.content?.length > 0
      category = z.message.MessageCategory.TEXT

      if event.data.previews?.length > 0
        category = category | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW

    return category

  check_image = (event) ->
    category = z.message.MessageCategory.NONE

    if event.data.info?.tag is z.assets.ImageSizeType.MEDIUM
      category = z.message.MessageCategory.IMAGE

      if event.data.content_type is 'image/gif'
        category = category | z.message.MessageCategory.GIF

    return category

  check_file = (event) ->
    category = z.message.MessageCategory.NONE

    if event.data.info?.name? # TODO only uploaded?
      category = z.message.MessageCategory.FILE

    return category

  category_from_event = (event) ->

    if event.ephemeral_expires # String, Number, true
      return z.message.MessageCategory.NONE

    # TODO improvement avoid unnecessary checking
    category = [
      check_text
      check_image
      check_file
    ].map (check_fn) ->
      check_fn event
    .reduce (current, next) ->
      if next? and next isnt z.message.MessageCategory.NONE
        return current | next
      return current
    , z.message.MessageCategory.NONE

    if Object.keys(event.reactions?).length > 0
      category = category | z.message.MessageCategory.LIKED

    return category

  return {
    category_from_message: category_from_event
  }
