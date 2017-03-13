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

# Conversation Mapper to convert all server side JSON conversation objects into core entities
class z.conversation.ConversationMapper
  # Construct a new Conversation Mapper.
  constructor: ->
    @logger = new z.util.Logger 'z.conversation.ConversationMapper', z.config.LOGGER.OPTIONS

  ###
  Convert a JSON conversation into a conversation entity.
  @param json [Object] Conversation data
  @return [z.entity.Conversation] Mapped conversation entity
  ###
  map_conversation: (json) ->
    conversation_ets = @map_conversations [json?.data or json]
    return conversation_ets[0]

  ###
  Convert multiple JSON conversations into a conversation entities.
  @param json [Object] Conversation data
  @return [Array<z.entity.Conversation>] Mapped conversation entities
  ###
  map_conversations: (json) ->
    return (@_create_conversation_et conversation for conversation in json)

  ###
  Updates all properties of a conversation specified

  @example data: {"name":"ThisIsMyNewConversationName"}
  @todo make utility?

  @param conversation_et [z.entity.Conversation] Conversation to be updated
  @param data [Object] Conversation data
  @return [z.entity.Conversation] Updated conversation entity
  ###
  update_properties: (conversation_et, data) ->
    for key, value of data
      continue if key is 'id'
      if conversation_et[key]?
        if ko.isObservable conversation_et[key]
          conversation_et[key] value
        else
          conversation_et[key] = value

    return conversation_et

  ###
  Update the membership properties of a conversation.

  @param conversation_et [z.entity.Conversation] Conversation to be updated
  @param self [Object] Conversation self data
  @return [z.entity.Conversation] Updated conversation entity
  ###
  update_self_status: (conversation_et, self) ->
    return if not conversation_et?

    if self.ephemeral_timer?
      conversation_et.ephemeral_timer self.ephemeral_timer

    if self.status?
      conversation_et.status self.status

    if self.last_event_timestamp
      conversation_et.set_timestamp self.last_event_timestamp,
        z.conversation.ConversationUpdateType.LAST_EVENT_TIMESTAMP

    if self.archived_timestamp
      timestamp = self.archived_timestamp
      conversation_et.set_timestamp timestamp, z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP
      conversation_et.archived_state self.archived_state

    if self.cleared_timestamp
      conversation_et.set_timestamp self.cleared_timestamp, z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP

    if self.last_read_timestamp
      conversation_et.set_timestamp self.last_read_timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP

    if self.muted_timestamp
      conversation_et.set_timestamp self.muted_timestamp, z.conversation.ConversationUpdateType.MUTED_TIMESTAMP
      conversation_et.muted_state self.muted_state

    if self.verification_state
      conversation_et.verification_state self.verification_state

    # BE
    if self.otr_archived?
      timestamp =  new Date(self.otr_archived_ref).getTime()
      conversation_et.set_timestamp timestamp, z.conversation.ConversationUpdateType.ARCHIVED_TIMESTAMP
      conversation_et.archived_state self.otr_archived

    if self.otr_muted?
      timestamp = new Date(self.otr_muted_ref).getTime()
      conversation_et.set_timestamp timestamp, z.conversation.ConversationUpdateType.MUTED_TIMESTAMP
      conversation_et.muted_state self.otr_muted

    return conversation_et

  ###
  Creates a conversation entity from JSON data.

  @private
  @param data [Object] Either locally stored or backend data
  @return [z.entity.Conversation] Mapped conversation entity
  ###
  _create_conversation_et: (data) ->
    if not data?
      throw new Error 'Cannot create conversation entity without data'

    conversation_et =  new z.entity.Conversation data.id
    conversation_et.id = data.id
    conversation_et.creator = data.creator
    conversation_et.type data.type
    conversation_et.name data.name ? ''
    conversation_et = @update_self_status conversation_et, data.members?.self or data

    if not conversation_et.last_event_timestamp()
      conversation_et.last_event_timestamp Date.now()

    # all users that are still active
    if data.others
      conversation_et.participating_user_ids data.others
    else
      participating_user_ids = data.members.others
        .filter (other) -> other.status is z.conversation.ConversationStatus.CURRENT_MEMBER
        .map (other) -> other.id
      conversation_et.participating_user_ids participating_user_ids

    return conversation_et

  ###
  Merge local database records with remote backend payload.
  @param local [Array] database records
  @param remote [Array] backend payload
  ###
  merge_conversations: (local, remote) ->
    return remote.map (remote_conversation, index) ->
      local_conversation = local.find (c) -> c.id is remote_conversation.id
      local_conversation ?= id: remote_conversation.id
      local_conversation.name = remote_conversation.name
      local_conversation.type = remote_conversation.type
      local_conversation.creator = remote_conversation.creator
      local_conversation.status = remote_conversation.members.self.status
      local_conversation.others = remote_conversation.members.others
        .filter (other) -> other.status is z.conversation.ConversationStatus.CURRENT_MEMBER
        .map (other) -> other.id

      if not local_conversation.last_event_timestamp
        if remote_conversation.last_event_time?
          local_conversation.last_event_timestamp = new Date(remote_conversation.last_event_time).getTime()
        else
          local_conversation.last_event_timestamp = index + 1 # this should ensure a proper order

      if not local_conversation.archived_state?
        local_conversation.archived_state = remote_conversation.members.self.otr_archived
        local_conversation.archived_timestamp = remote_conversation.members.self.otr_archived_ref

      if not local_conversation.muted_state?
        local_conversation.muted_state = remote_conversation.members.self.otr_muted
        local_conversation.muted_timestamp = remote_conversation.members.self.otr_muted_ref

      return local_conversation
