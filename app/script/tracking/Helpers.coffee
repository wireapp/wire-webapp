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
z.tracking ?= {}

z.tracking.helpers = {

  ###
  Get corresponding tracking attribute for conversation type
  @param conversation_et [z.entity.Conversation]
  @return [z.tracking.attribute.ConversationType]
  ###
  get_conversation_type: (conversation_et) ->
    return if not (conversation_et instanceof z.entity.Conversation)

    if conversation_et.is_one2one()
      return z.tracking.attribute.ConversationType.ONE_TO_ONE
    else
      return z.tracking.attribute.ConversationType.GROUP

  ###
  Get corresponding tracking attribute for message type
  @param conversation_et [z.entity.Message]
  @return [z.tracking.attribute.MessageType]
  ###
  get_message_type: (message_et) ->
    return if not (message_et instanceof z.entity.Message)

    switch
      when message_et.is_system() then return z.tracking.attribute.MessageType.SYSTEM
      when message_et.is_ping() then return z.tracking.attribute.MessageType.PING
      when message_et.has_asset_image() then return z.tracking.attribute.MessageType.IMAGE
      when message_et.has_asset() then return z.tracking.attribute.MessageType.FILE
      else return z.tracking.attribute.MessageType.TEXT

}
