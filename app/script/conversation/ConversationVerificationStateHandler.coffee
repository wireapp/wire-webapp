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

    amplify.subscribe z.event.WebApp.USER.CLIENT_ADDED, @on_client_add
    amplify.subscribe z.event.WebApp.USER.CLIENT_REMOVED, @on_client_removed
    amplify.subscribe z.event.WebApp.USER.CLIENTS_UPDATED, @on_clients_updated
    amplify.subscribe z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, @on_client_verification_changed

  ###
  Handle client verification state change.
  @param user_id [String] Self user
  @param client_id [String]
  @param is_verified [Boolean]
  ###
  on_client_verification_changed: (user_id, client_id, is_verified) =>
    @_get_active_conversations().forEach (conversation_et) =>
      if @_will_change_to_degraded conversation_et
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_degraded conversation_et, [user_id], z.message.VerificationMessageType.UNVERIFIED
      else if @_will_change_to_verified conversation_et
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  Self user added a client or other participants added clients.
  @param user_ids [String|Array] can include self user
  ###
  on_client_add: (user_ids) =>
    if _.isString user_ids
      user_ids = [user_ids]

    @_get_active_conversations().forEach (conversation_et) =>
      if @_will_change_to_degraded conversation_et
        user_ids_in_conversation = _.intersection user_ids, conversation_et.participating_user_ids().concat conversation_et.self.id
        if user_ids_in_conversation.length
          event = z.conversation.EventBuilder.build_degraded conversation_et, user_ids, z.message.VerificationMessageType.NEW_DEVICE
          amplify.publish z.event.WebApp.EVENT.INJECT, event

  ###
  Self user removed a client or other participants deleted clients.
  ###
  on_client_removed: =>
    @_get_active_conversations().forEach (conversation_et) =>
      if @_will_change_to_verified conversation_et
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  Clients of a user where updated.
  ###
  on_clients_updated: (user_id) =>
    @_get_active_conversations().forEach (conversation_et) =>
      if @_will_change_to_degraded conversation_et
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_degraded conversation_et, [user_id], z.message.VerificationMessageType.NEW_DEVICE
      else if @_will_change_to_verified conversation_et
        amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  New member(s) joined the conversation
  @param conversation_et [z.entity.Conversation]
  @param user_ids [Array]
  ###
  on_member_joined: (conversation_et, user_ids) ->
    if _.isString user_ids
      user_ids = [user_ids]

    if @_will_change_to_degraded conversation_et
      event = z.conversation.EventBuilder.build_degraded conversation_et, user_ids, z.message.VerificationMessageType.NEW_MEMBER
      amplify.publish z.event.WebApp.EVENT.INJECT, event

  ###
  Member(s) left the conversation
  @param conversation_et [z.entity.Conversation]
  ###
  on_member_left: (conversation_et) ->
    if @_will_change_to_verified conversation_et
      amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  New conversation was created
  @param conversation_et [z.entity.Conversation]
  ###
  on_conversation_created: (conversation_et) ->
    if @_will_change_to_verified conversation_et
      amplify.publish z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_all_verified conversation_et

  ###
  Get all conversation where self user is active
  ###
  _get_active_conversations: =>
    @conversation_repository.filtered_conversations().filter (conversation_et) ->
      not conversation_et.removed_from_conversation()

  ###
  Check whether to degrade conversation and set corresponding state
  @param conversation_et [z.entity.Conversation]
  ###
  _will_change_to_degraded: (conversation_et) ->
    state = conversation_et.verification_state()

    if state is z.conversation.ConversationVerificationState.DEGRADED
      return false

    if state is z.conversation.ConversationVerificationState.VERIFIED and not conversation_et.is_verified()
      conversation_et.verification_state z.conversation.ConversationVerificationState.DEGRADED
      return true

    return false

  ###
  Check whether to verify conversation and set corresponding state
  @param conversation_et [z.entity.Conversation]
  ###
  _will_change_to_verified: (conversation_et) ->
    if conversation_et.verification_state() is z.conversation.ConversationVerificationState.VERIFIED
      return false

    if conversation_et.is_verified()
      conversation_et.verification_state z.conversation.ConversationVerificationState.VERIFIED
      return true

    return false
