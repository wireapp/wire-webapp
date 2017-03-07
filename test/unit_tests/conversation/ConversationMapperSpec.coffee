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
      self_status = {status: z.conversation.ConversationStatus.CURRENT_MEMBER}
      updated_conversation_et = conversation_mapper.update_self_status conversation_et, self_status
      expect(updated_conversation_et.removed_from_conversation()).toBeFalsy()

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

  describe 'merge_conversations', ->
    it 'accumulates local data with remote data from the backend', ->
      #@formatter:off
      local_data = {"archived_state": false, "archived_timestamp": 1487239601118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": false, "muted_timestamp": 0, "verification_state": 0}
      remote_data = {"access": ["private"], "creator": "532af01e-1e24-4366-aacf-33b67d4ee376", "members": { "self": { "hidden_ref": null, "status": 0, "last_read": "3d.800122000ad95594", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2015-01-07T16:26:51.363Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "cleared": null, "otr_muted": false, "otr_archived_ref": "2017-02-16T10:06:41.118Z", "archived": null }, "others": [{ "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }] }, "name": "Family Gathering", "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "type": 2, "last_event_time": "2017-02-14T17:11:10.619Z", "last_event": "4a.800122000a62e4a1"}
      #@formatter:on

      merged_conversations = conversation_mapper.merge_conversations [local_data], [remote_data]
      merged_data = merged_conversations[0]

      expect(merged_data.creator).toBe remote_data.creator
      expect(merged_data.name).toBe remote_data.name
      expect(merged_data.others[0]).toBe remote_data.members.others[0].id
      expect(merged_data.status).toBe remote_data.members.self.status
      expect(merged_data.type).toBe remote_data.type

      expect(merged_data.archived_state).toBe local_data.archived_state
      expect(merged_data.archived_timestamp).toBe local_data.archived_timestamp
      expect(merged_data.cleared_timestamp).toBe local_data.cleared_timestamp
      expect(merged_data.ephemeral_timer).toBe local_data.ephemeral_timer
      expect(merged_data.id).toBe local_data.id
      expect(merged_data.last_event_timestamp).toBe local_data.last_event_timestamp
      expect(merged_data.last_read_timestamp).toBe local_data.last_read_timestamp
      expect(merged_data.muted_state).toBe local_data.muted_state
      expect(merged_data.muted_timestamp).toBe local_data.muted_timestamp
      expect(merged_data.verification_state).toBe local_data.verification_state

    it 'only maps other participants if they are still in the conversation', ->
      #@formatter:off
      remote_data = {"access": [ "invite" ], "creator": "d270c7b4-6492-4953-b1bf-be817fe665b2", "members": { "self": { "hidden_ref": null, "status": 0, "last_read": "1.800122000a55200f", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2016-07-05T08:22:32.899Z", "hidden": false, "status_ref": "0.0", "id": "9b47476f-974d-481c-af64-13f82ed98a5f", "otr_archived": true, "cleared": null, "otr_muted": false, "otr_archived_ref": "2016-07-05T09:17:57.741Z", "archived": null }, "others": [ { "status": 1, "id": "39b7f597-dfd1-4dff-86f5-fe1b79cb70a0" }, { "status": 0, "id": "5eeba863-44be-43ff-8c47-7565a028f182" }, { "status": 1, "id": "a187fd3e-479a-4e85-a77f-5e4ab95477cf" }, { "status": 0, "id": "d270c7b4-6492-4953-b1bf-be817fe665b2" } ] }, "name": null, "id": "01251ff6-383d-45b8-9420-751d365c6efe", "type": 0, "last_event_time": "2016-07-05T09:17:57.741Z", "last_event": "4.800122000a5520e4"}
      #@formatter:on

      merged_conversations = conversation_mapper.merge_conversations [], [remote_data]
      merged_data = merged_conversations[0]

      expect(merged_data.others.length).toBe 2

    it 'just maps conversations where we are part of', ->
      #@formatter:off
      remote_data = [{"access": ["invite"], "creator": "7af94151-652b-4c13-8336-ba6be8f9938c", "members": { "self": { "hidden_ref": null, "status": 1, "last_read": "18.800122000a4ffb33", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2016-02-22T14:23:57.206Z", "hidden": false, "status_ref": "18.800122000a4ffb33", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": true, "cleared": "18.800122000a4ffb33", "otr_muted": false, "otr_archived_ref": "2016-02-22T14:23:57.206Z", "archived": "18.800122000a4ffb33" }, "others": [{ "status": 0, "id": "1435d7fe-1dc5-44fc-9c8a-1a1d47938503" }, { "status": 0, "id": "1ddb1c9f-fdbf-4ccd-8e6e-a70107f6e021" }, { "status": 0, "id": "228d931a-3929-4f50-bb2b-e40aa7195969" }, { "status": 0, "id": "2f8a5640-8ece-4c58-9473-b1dda0ddb5c8" }, { "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }, { "status": 0, "id": "65040647-cf54-4450-90e6-dc2307101b89" }, { "status": 0, "id": "7af94151-652b-4c13-8336-ba6be8f9938c" }, { "status": 0, "id": "84d29540-8b82-4adb-a4ba-f84adffef7e7" }, { "status": 0, "id": "9c3b2672-aaf9-4ebb-a8af-747b558becf9" }, { "status": 0, "id": "9ebf4524-f8b8-449c-ba01-298d07a984db" }, { "status": 0, "id": "ae0d5c3d-f3e3-40ea-8c2c-484e81e3223a" }, { "status": 0, "id": "ae33b3f4-fc3f-4478-ac94-59417224a72c" }, { "status": 0, "id": "c31e8831-d6b7-4c8d-adb0-c169a6e0e625" }, { "status": 0, "id": "c71474aa-62ff-4e6c-8983-1cba81e39487" }, { "status": 0, "id": "d794bf14-96a0-43e9-be95-ae761d1acb4e" }, { "status": 0, "id": "e3cfe44e-f4a9-4c9a-a759-8b718f3dfaf6" }] }, "name": "Hello World", "id": "07fb5fc8-9a65-46fb-8700-de02a21ce2f2", "type": 0, "last_event_time": "2016-02-22T14:23:57.206Z", "last_event": "18.800122000a4ffb33"}, {"access": ["invite"], "creator": "7442a7df-8cd8-493f-aa7c-4939a2683d02", "members": { "self": { "hidden_ref": null, "status": 0, "last_read": "2.800122000a632b43", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2015-07-23T15:29:00.611Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "cleared": null, "otr_muted": false, "otr_archived_ref": null, "archived": null }, "others": [{ "status": 1, "id": "0410795a-58dc-40d8-b216-cbc2360be21a" }, { "status": 0, "id": "2bde49aa-bdb5-458f-98cf-7d3552b10916" }, { "status": 0, "id": "36876ec6-9481-41db-a6a8-94f92953c538" }, { "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }, { "status": 1, "id": "6b7e0641-6df8-49fe-812d-74c4561edbb4" }, { "status": 1, "id": "7442a7df-8cd8-493f-aa7c-4939a2683d02" }, { "status": 0, "id": "a29b13c5-587a-421b-bc77-b7f5b20c4352" }, { "status": 0, "id": "b7cc6726-deda-4bd1-a10d-a0c6a0baf878" }] }, "name": "This is a call", "id": "0144f29d-bf2d-4afd-a91b-754dc0e26d2a", "type": 0, "last_event_time": "2015-08-11T10:09:35.936Z", "last_event": "31.800122000a69fde1"}]
      #@formatter:on

      merged_conversations = conversation_mapper.merge_conversations [], remote_data

      expect(merged_conversations.length).toBe 1
      expect(merged_conversations[0].name).toBe remote_data[1].name
