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
z.conversation ?= {}

class z.conversation.ConversationError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.conversation.ConversationError::TYPE.UNKNOWN

    @message = switch @type
      when z.conversation.ConversationError::TYPE.CONVERSATION_NOT_FOUND
        'Conversation not found'
      when z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND
        'Message not found'
      when z.conversation.ConversationError::TYPE.NO_CHANGES
        'Missing changes to message'
      when z.conversation.ConversationError::TYPE.NON_SEQUENTIAL_UPDATE
        'Update is non sequential'
      when z.conversation.ConversationError::TYPE.WRONG_USER
        'Wrong user tried to change or delete a message'
      else
        'Unknown ConversationError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    CONVERSATION_NOT_FOUND: 'z.conversation.ConversationError::TYPE.CONVERSATION_NOT_FOUND'
    MESSAGE_NOT_FOUND: 'z.conversation.ConversationError::TYPE.MESSAGE_NOT_FOUND'
    NO_CHANGES: 'z.conversation.ConversationError::TYPE.NO_CHANGES'
    NON_SEQUENTIAL_UPDATE: 'z.conversation.ConversationError::TYPE.NON_SEQUENTIAL_UPDATE'
    WRONG_USER: 'z.conversation.ConversationError::TYPE.WRONG_USER'
    UNKNOWN: 'z.conversation.ConversationError::TYPE.UNKNOWN'
