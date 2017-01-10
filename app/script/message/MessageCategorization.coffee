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

z.message.MessageCategorization = do ->

  check_text = (event) ->
    if event.type is z.event.Backend.CONVERSATION.MESSAGE_ADD
      category = z.message.MessageCategory.TEXT

      if event.data.previews?.length > 0
        category = category | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW

      return category

  check_image = (event) ->
    if event.type is z.event.Backend.CONVERSATION.ASSET_ADD
      category = z.message.MessageCategory.IMAGE

      if event.data.content_type is 'image/gif'
        category = category | z.message.MessageCategory.GIF

      return category

  check_file = (event) ->
    if event.type is z.event.Client.CONVERSATION.ASSET_META
      return z.message.MessageCategory.FILE

  check_ping = (event) ->
    if event.type is z.event.Backend.CONVERSATION.KNOCK
      return z.message.MessageCategory.KNOCK

  check_location = (event) ->
    if event.type is z.event.Client.CONVERSATION.LOCATION
      return z.message.MessageCategory.LOCATION

  category_from_event = (event) ->
    try
      category = z.message.MessageCategory.NONE

      if event.ephemeral_expires # String, Number, true
        return z.message.MessageCategory.NONE

      for check in [check_text, check_image, check_file, check_ping, check_location]
        temp_category = check(event)
        if temp_category?
          category = temp_category
          break

      if event.reactions? and Object.keys(event.reactions).length > 0
        category = category | z.message.MessageCategory.LIKED

      return category

    catch error
      return z.message.MessageCategory.UNDEFINED

  return {
    category_from_event: category_from_event
  }
