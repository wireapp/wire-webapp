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

class z.conversation.ConversationVerificationStateHandler

  constructor: (@conversation_repository) ->
    @logger = new z.util.Logger 'z.conversation.ConversationVerificationStateHandler', z.config.LOGGER.OPTIONS

    amplify.subscribe z.event.WebApp.CLIENT.ADD, @on_client_add, 11
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @on_client_removed, 11
    amplify.subscribe z.event.WebApp.CONVERSATION.VERIFICATION_STATE_CHANGED, @on_verification_state_changed

  ###
  Handle conversation verification state change.
  @param conversation_et [z.entity.Conversation]
  ###
  on_verification_state_changed: (conversation_et) ->
    if conversation_et.verification_state() is z.conversation.ConversationVerificationState.VERIFIED
      amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  Add new device message to conversations.
  @param user_ids [String|Array]
  ###
  on_client_add: (user_ids) =>
    if _.isString user_ids
      user_ids = [user_ids]

    if not user_ids?.length > 0
      throw new TypeError 'Failed to add new device message because of missing user ids'

    valid_conversation_ets = @conversation_repository.filtered_conversations()
    .filter (conversation_et) ->
      not conversation_et.removed_from_conversation()
    .filter (conversation_et) ->
      conversation_et.verification_state() is z.conversation.ConversationVerificationState.DEGRADED

    if valid_conversation_ets.length is 0
      return @logger.info 'No conversation found to add new device message'

    for conversation_et in valid_conversation_ets
      user_ids_in_conversation = _.intersection user_ids, conversation_et.participating_user_ids().concat conversation_et.self.id
      if user_ids_in_conversation.length
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_new_device conversation_et, user_ids_in_conversation

  on_client_removed: ->
    LOG 'client removed'
