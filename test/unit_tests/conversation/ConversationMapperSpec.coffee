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

# grunt test_init && grunt test_run:conversation/ConversationMapper

describe 'Conversation Mapper', ->
  conversation_mapper = null

  beforeEach ->
    conversation_mapper = new z.conversation.ConversationMapper()

  it 'can map a conversation', ->
    conversation = null
    conversation_et = conversation_mapper.map_conversation conversation

    expect(conversation_et).toBe undefined

    conversation = entities.conversation
    conversation_et = conversation_mapper.map_conversation conversation

    expected_participant_ids = [
      conversation.members.others[0].id
      conversation.members.others[1].id
      conversation.members.others[2].id
      conversation.members.others[3].id
    ]

    expect(conversation_et.participating_user_ids()).toEqual expected_participant_ids
    expect(conversation_et.id).toBe conversation.id
    expect(conversation_et.name()).toBe conversation.name
    expect(conversation_et.type()).toBe z.conversation.ConversationType.REGULAR
    expect(conversation_et.is_group()).toBeTruthy()
    expect(conversation_et.number_of_participants()).toBe conversation.members.others.length
    expect(conversation_et.is_muted()).toBe conversation.members.self.otr_muted
    expect(conversation_et.muted_timestamp()).toEqual new Date(conversation.members.self.otr_muted_ref).getTime()

  it 'can map conversations', ->
    conversations = payload.conversations.get.conversations
    conversation_ets = conversation_mapper.map_conversations conversations

    expect(conversation_ets.length).toBe conversations.length
    expect(conversation_ets[0].id).toBe conversations[0].id
    expect(conversation_ets[1].name()).toBe conversations[1].name

  it 'can update the properties of a conversation', ->
    creator_id = z.util.create_random_uuid()
    conversation_et = conversation_mapper._create_conversation_et payload.conversations.get.conversations[0]
    data = {name: 'New foo bar conversation name', id: 'd5a39ffb-6ce3-4cc8-9048-0123456789abc', creator: creator_id}
    updated_conversation_et = conversation_mapper.update_properties conversation_et, data

    expect(updated_conversation_et.name()).toBe 'New foo bar conversation name'
    expect(updated_conversation_et.id).not.toBe 'd5a39ffb-6ce3-4cc8-9048-0123456789abc'
    expect(updated_conversation_et.creator).toBe creator_id
    expect(updated_conversation_et.creator).toBe data.creator

  describe 'update_self_status', ->
    conversation_et = undefined

    beforeEach ->
      conversation_et = conversation_mapper._create_conversation_et payload.conversations.get.conversations[0]

    it 'returns without updating if conversation entity does not exist', ->
      conversation_et = undefined
      self_status = {muted: false}
      expect(conversation_et).toBe undefined
      expect(conversation_mapper.update_self_status conversation_et, self_status).toBeFalsy()

    it 'can update the self status if the user leaves a conversation', ->
      self_status = {status: z.conversation.ConversationStatus.PAST_MEMBER}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.removed_from_conversation()).toBeTruthy()

    it 'can update the self status if the user joins a conversation', ->
      conversation_et.removed_from_conversation true
      self_status = {status: z.conversation.ConversationStatus.CURRENT_MEMBER}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.removed_from_conversation()).toBeFalsy()

    it 'can does not change the self status if properties update does not contain a status', ->
      conversation_et.removed_from_conversation true
      self_status = {otr_archived: true}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.removed_from_conversation()).toBeTruthy()

    it 'can update the self status with last event timestamp', ->
      time = Date.now()
      self_status = {last_event_timestamp: time}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.last_event_timestamp()).toBe time

    it 'can update the self status using otr_archived', ->
      time = Date.now()
      conversation_et.last_event_timestamp time
      otr_archived_ref = new Date(conversation_et.last_event_timestamp()).toISOString()

      self_status =
        otr_archived: true
        otr_archived_ref: otr_archived_ref
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status

      expect(updated_conversation_et.archived_timestamp()).toBe time
      expect(updated_conversation_et.archived_state()).toBe true

    it 'can update the self status using archived timestamp', ->
      time = Date.now()
      archived_timestamp = time
      self_status =
        archived_timestamp: archived_timestamp
        archived_state: true
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.archived_timestamp()).toBe time
      expect(updated_conversation_et.archived_state()).toBe true

    it 'can update the self when archive state is false', ->
      archived_timestamp = Date.now()
      self_status =
        archived_timestamp: archived_timestamp
        archived_state: false
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.archived_timestamp()).toBe archived_timestamp
      expect(updated_conversation_et.archived_state()).toBe false

    it 'can update the self status if a conversation is cleared', ->
      time = Date.now()
      last_event_timestamp = time
      cleared_timestamp = time
      self_status =
        last_event_timestamp: last_event_timestamp
        cleared_timestamp: cleared_timestamp

      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status

      expect(updated_conversation_et.last_event_timestamp()).toBe time
      expect(updated_conversation_et.cleared_timestamp()).toBe time

    it 'can update the self status if a conversation is read', ->
      time = Date.now()
      self_status = {last_read_timestamp: time}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.last_read_timestamp()).toBe time

    it 'can update the self status if a conversation is muted', ->
      time = Date.now()
      conversation_et.last_event_timestamp time
      otr_muted_ref = new Date(conversation_et.last_event_timestamp()).toISOString()
      self_status =
        otr_muted_ref: otr_muted_ref
        otr_muted: true

      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status

      expect(updated_conversation_et.last_event_timestamp()).toBe time
      expect(updated_conversation_et.muted_state()).toBe true

    it 'accepts string values which must be parsed later on', ->
      conversation_et.last_read_timestamp 0
      self_status = {"last_read_timestamp":"1480339377099"}
      last_read_timestamp_number = window.parseInt self_status.last_read_timestamp, 10
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.last_read_timestamp()).toBe last_read_timestamp_number
