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

# grunt test_init && grunt test_run:conversation/ConversationService

describe 'z.conversation.ConversationService', ->
  conversation_mapper = null
  conversation_service = null
  server = null
  storage_service = null
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeStorageActors()
    .then (storage_repository) ->
      client = test_factory.client
      storage_service = storage_repository.storage_service
      conversation_service = new z.conversation.ConversationService client, storage_service
      conversation_mapper = new z.conversation.ConversationMapper()
      server = sinon.fakeServer.create()
      done()
    .catch done.fail

  afterEach ->
    storage_service.clear_all_stores()
    server.restore()

  describe 'load_preceding_events_from_db', ->

    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'

    # @formatter:off
    messages = [
      {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"}
      {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
    ]
    # @formatter:on

    beforeEach (done) ->
      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, message
      .then done
      .catch done.fail

    it 'returns mapped message_et if event with id is found', (done) ->
      conversation_service.load_event_from_db conversation_id, '4af67f76-09f9-4831-b3a4-9df877b8c29a'
      .then (message_et) =>
        expect(message_et).toEqual messages[1]
        done()
      .catch done.fail

    it 'returns undefined if no event with id is found', (done) ->
      conversation_service.load_event_from_db conversation_id, z.util.create_random_uuid()
      .then (message_et) =>
        expect(message_et).not.toBeDefined()
        done()
      .catch done.fail

  describe 'update_message_in_db', ->
    # @formatter:off
    event = {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
    # @formatter:on

    it 'updated event in the database', (done) ->
      event.time = new Date().toISOString()
      event.primary_key = 1337
      conversation_service.update_message_in_db event, {time: event.time}
      .then done
      .catch done.fail

    it 'fails if changes are not specified', (done) ->
      conversation_service.update_message_in_db event, undefined
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.conversation.ConversationError
        expect(error.type).toBe z.conversation.ConversationError::TYPE.NO_CHANGES
        done()

  describe 'load_preceding_events_from_db', ->
    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    messages = undefined

    beforeEach (done) ->
      timestamp = 1479903546799
      messages = [0...10].map (index) ->
        return {"conversation": conversation_id, "time": new Date(timestamp + index).toISOString()}

      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, message
      .then done
      .catch done.fail

    it 'doesn\'t load events for invalid conversation id', (done) ->
      conversation_service.load_preceding_events_from_db 'invalid_id', new Date(30), new Date 1479903546808
      .then (events) =>
        expect(events.length).toBe 0
        done()

    it 'loads all events', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id
      .then (events) =>
        expect(events.length).toBe 10
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[9].time).toBe '2016-11-23T12:19:06.799Z'
        done()

    it 'loads all events with limit', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id, undefined, undefined, 5
      .then (events) =>
        expect(events.length).toBe 5
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[4].time).toBe '2016-11-23T12:19:06.804Z'
        done()

    it 'loads events with lower bound', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id, new Date 1479903546805
      .then (events) =>
        expect(events.length).toBe 4
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.807Z'
        expect(events[2].time).toBe '2016-11-23T12:19:06.806Z'
        expect(events[3].time).toBe '2016-11-23T12:19:06.805Z'
        done()

    it 'loads events with upper bound', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id, undefined, new Date 1479903546803
      .then (events) =>
        expect(events.length).toBe 4
        expect(events[0].time).toBe '2016-11-23T12:19:06.802Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.801Z'
        expect(events[2].time).toBe '2016-11-23T12:19:06.800Z'
        expect(events[3].time).toBe '2016-11-23T12:19:06.799Z'
        done()

    it 'loads events with upper and lower bound', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id, new Date(1479903546806), new Date 1479903546807
      .then (events) =>
        expect(events.length).toBe 1
        expect(events[0].time).toBe '2016-11-23T12:19:06.806Z'
        done()

    it 'loads events with upper and lower bound and a fetch limit', (done) ->
      conversation_service.load_preceding_events_from_db conversation_id, new Date(1479903546800), new Date(1479903546807), 2
      .then (events) =>
        expect(events.length).toBe 2
        expect(events[0].time).toBe '2016-11-23T12:19:06.806Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.805Z'
        done()

  describe 'save_conversation_in_db', ->
    it 'saves a conversation', (done) ->
      # @formatter:off
      conversation_payload = {"access":["private"],"creator":"0410795a-58dc-40d8-b216-cbc2360be21a","members":{"self":{"hidden_ref":null,"status":0,"last_read":"24fe.800122000b16c279","muted_time":null,"otr_muted_ref":null,"muted":false,"status_time":"2014-12-03T18:39:12.319Z","hidden":false,"status_ref":"0.0","id":"532af01e-1e24-4366-aacf-33b67d4ee376","otr_archived":false,"cleared":null,"otr_muted":false,"otr_archived_ref":"2016-07-25T11:30:07.883Z","archived":null},"others":[{"status":0,"id":"0410795a-58dc-40d8-b216-cbc2360be21a"}]},"name":"Michael","id":"573b6978-7700-443e-9ce5-ff78b35ac590","type":2,"last_event_time":"2016-06-21T22:53:41.778Z","last_event":"24fe.800122000b16c279"}
      # @formatter:on
      conversation_et = conversation_mapper.map_conversation conversation_payload
      conversation_service.save_conversation_state_in_db conversation_et
      .then (conversation_record) =>
        expect(conversation_record.name()).toBe conversation_payload.name
        done()

  describe 'load_subsequent_events_from_db', ->
    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    sender_id = '8b497692-7a38-4a5d-8287-e3d1006577d6'
    events = undefined

    beforeEach (done) ->
      timestamp = new Date('2016-11-23T12:19:06.808Z').getTime()
      events = [0...10].map (index) ->
        return {"conversation": conversation_id, "time": new Date(timestamp + index).toISOString(), "from": sender_id}

      Promise.all events.map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then done
      .catch done.fail

    it 'loads all events', (done) ->
      conversation_service.load_subsequent_events_from_db conversation_id, new Date('2016-11-23T12:19:06.808Z'), 2
      .then (events) =>
        expect(events.length).toBe 2
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.809Z'
        done()

    it 'loads all events when include message is false', (done) ->
      conversation_service.load_subsequent_events_from_db conversation_id, new Date('2016-11-23T12:19:06.808Z'), 2, false
      .then (events) =>
        expect(events.length).toBe 2
        expect(events[0].time).toBe '2016-11-23T12:19:06.809Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.810Z'
        done()

  describe 'delete_message_with_key_from_db', ->

    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    primary_keys = undefined

    # @formatter:off
    messages = [
      {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"}
      {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
      {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message (Duplicate)","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
    ]
    # @formatter:on

    beforeEach (done) ->
      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, message
      .then (ids) =>
        primary_keys = ids
        done()
      .catch done.fail

    it 'deletes message with the given key', (done) ->
      conversation_service.delete_message_with_key_from_db conversation_id, primary_keys[1]
      .then ->
        conversation_service.load_preceding_events_from_db conversation_id
      .then (events) ->
        expect(events.length).toBe 2
        for event in events
          expect(event.primary_key).not.toBe primary_keys[1]
        done()
      .catch done.fail

    it 'does not delete the event if key is wrong', (done) ->
      conversation_service.delete_message_with_key_from_db conversation_id, 'wrongKey'
      .then ->
        conversation_service.load_preceding_events_from_db conversation_id
      .then (events) ->
        expect(events.length).toBe 3
        done()
      .catch done.fail

  describe 'load_events_with_category_from_db', ->

    events = undefined

    beforeEach ->
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"b6498d81-92e8-4da7-afd2-054239595da7","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:11:15.632Z","status":2,"data":{"content":"test","nonce":"b6498d81-92e8-4da7-afd2-054239595da7","previews":[]},"type":"conversation.message-add","category": 16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"da7930dd-4c30-4378-846d-b29e1452bdfb","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:37:31.941Z","status":1,"data":{"content_length":47527,"content_type":"image/jpeg","id":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d","info":{"tag":"medium","width":1448,"height":905,"nonce":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d"},"otr_key":{},"sha256":{}},"type":"conversation.asset-add","category": 128}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"da7930dd-4c30-4378-846d-b29e1452bdfa","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:47:31.941Z","status":1,"data":{"content_length":47527,"content_type":"image/jpeg","id":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d","info":{"tag":"medium","width":1448,"height":905,"nonce":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d"},"otr_key":{},"sha256":{}},"type":"conversation.asset-add","category": 128}
      ]

    it 'should return no entry matches the given category', (done) ->
      Promise.all events.slice(0,1).map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then ->
        return conversation_service.load_events_with_category_from_db events[0].conversation, z.message.MessageCategory.IMAGE
      .then (result) ->
        expect(result.length).toBe 0
        done()
      .catch done.fail

    it 'should get images in the correct order', (done) ->
      Promise.all events.map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then ->
        return conversation_service.load_events_with_category_from_db events[0].conversation, z.message.MessageCategory.IMAGE
      .then (result) ->
        expect(result.length).toBe 2
        expect(result[0].id).toBe events[1].id
        expect(result[1].id).toBe events[2].id
        done()
      .catch done.fail

  describe 'search_in_conversation', ->

    events = undefined

    beforeEach ->
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"2017-01-09T13:11:15.051Z","data":{"content":"https://wire.com","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category": 16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2276","from":"5598f954-674f-4a34-ad47-9e5ee8f00bce","time":"2017-01-09T13:11:15.052Z","data":{"content":"https://wire.com","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2276","previews":["CjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgQABpWCjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgSHFdpcmUgwrcgTW9kZXJuIGNvbW11bmljYXRpb24="]},"type":"conversation.message-add","category": 112}
      ]

    it 'should find query in text message', (done) ->
      Promise.all events.slice(0, 1).map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then ->
        return conversation_service.search_in_conversation events[0].conversation, 'https://wire.com'
      .then (result) ->
        expect(result.length).toBe 1
        expect(result[0].id).toBe 'f7adaa16-38f5-483e-b621-72ff1dbd2275'
        done()
      .catch done.fail

    it 'should find query in text message with link preview', (done) ->
      Promise.all events.map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then ->
        return conversation_service.search_in_conversation events[0].conversation, 'https://wire.com'
      .then (result) ->
        expect(result.length).toBe 2
        expect(result[0].id).toBe 'f7adaa16-38f5-483e-b621-72ff1dbd2275'
        expect(result[1].id).toBe 'f7adaa16-38f5-483e-b621-72ff1dbd2276'
        done()
      .catch done.fail

  describe 'search_in_conversation', ->

    events = undefined

    beforeEach ->
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date().toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date(Date.now() - 1).toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date(Date.now() - 2).toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date(Date.now() - 3).toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date(Date.now() - 4).toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c2","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"#{new Date(Date.now() - 5).toISOString()}","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c3","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"2016-01-09T13:11:15.051Z","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16}
      ]

    it 'should return conversation ids sorted by number of messages', (done) ->
      Promise.all events.map (event) ->
        return storage_service.save storage_service.OBJECT_STORE_EVENTS, undefined, event
      .then ->
        return conversation_service.get_active_conversations_from_db()
      .then (result) ->
        expect(result.length).toBe 3
        expect(result[0]).toBe '34e7f58e-b834-4d84-b628-b89b295d46c1'
        expect(result[1]).toBe '34e7f58e-b834-4d84-b628-b89b295d46c0'
        expect(result[2]).toBe '34e7f58e-b834-4d84-b628-b89b295d46c2'
        done()
      .catch done.fail

    describe 'merge_conversations', ->
      it 'accumulates local data with remote data from the backend', ->
        #@formatter:off
        local_data = {"archived_state": false, "archived_timestamp": 1487239601118, "cleared_timestamp": 0, "ephemeral_timer": false, "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "last_event_timestamp": 1488387380633, "last_read_timestamp": 1488387380633, "muted_state": false, "muted_timestamp": 0, "verification_state": 0}
        remote_data = {"access": ["private"], "creator": "532af01e-1e24-4366-aacf-33b67d4ee376", "members": { "self": { "hidden_ref": null, "status": 0, "last_read": "3d.800122000ad95594", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2015-01-07T16:26:51.363Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "cleared": null, "otr_muted": false, "otr_archived_ref": "2017-02-16T10:06:41.118Z", "archived": null }, "others": [{ "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }] }, "name": "Family Gathering", "id": "de7466b0-985c-4dc3-ad57-17877db45b4c", "type": 2, "last_event_time": "2017-02-14T17:11:10.619Z", "last_event": "4a.800122000a62e4a1"}
        #@formatter:on

        merged_conversations = conversation_service.merge_conversations [local_data], [remote_data]
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

        merged_conversations = conversation_service.merge_conversations [], [remote_data]
        merged_data = merged_conversations[0]

        expect(merged_data.others.length).toBe 2

      it 'just maps conversations where we are part of', ->
        #@formatter:off
        remote_data = [{"access": ["invite"], "creator": "7af94151-652b-4c13-8336-ba6be8f9938c", "members": { "self": { "hidden_ref": null, "status": 1, "last_read": "18.800122000a4ffb33", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2016-02-22T14:23:57.206Z", "hidden": false, "status_ref": "18.800122000a4ffb33", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": true, "cleared": "18.800122000a4ffb33", "otr_muted": false, "otr_archived_ref": "2016-02-22T14:23:57.206Z", "archived": "18.800122000a4ffb33" }, "others": [{ "status": 0, "id": "1435d7fe-1dc5-44fc-9c8a-1a1d47938503" }, { "status": 0, "id": "1ddb1c9f-fdbf-4ccd-8e6e-a70107f6e021" }, { "status": 0, "id": "228d931a-3929-4f50-bb2b-e40aa7195969" }, { "status": 0, "id": "2f8a5640-8ece-4c58-9473-b1dda0ddb5c8" }, { "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }, { "status": 0, "id": "65040647-cf54-4450-90e6-dc2307101b89" }, { "status": 0, "id": "7af94151-652b-4c13-8336-ba6be8f9938c" }, { "status": 0, "id": "84d29540-8b82-4adb-a4ba-f84adffef7e7" }, { "status": 0, "id": "9c3b2672-aaf9-4ebb-a8af-747b558becf9" }, { "status": 0, "id": "9ebf4524-f8b8-449c-ba01-298d07a984db" }, { "status": 0, "id": "ae0d5c3d-f3e3-40ea-8c2c-484e81e3223a" }, { "status": 0, "id": "ae33b3f4-fc3f-4478-ac94-59417224a72c" }, { "status": 0, "id": "c31e8831-d6b7-4c8d-adb0-c169a6e0e625" }, { "status": 0, "id": "c71474aa-62ff-4e6c-8983-1cba81e39487" }, { "status": 0, "id": "d794bf14-96a0-43e9-be95-ae761d1acb4e" }, { "status": 0, "id": "e3cfe44e-f4a9-4c9a-a759-8b718f3dfaf6" }] }, "name": "Hello World", "id": "07fb5fc8-9a65-46fb-8700-de02a21ce2f2", "type": 0, "last_event_time": "2016-02-22T14:23:57.206Z", "last_event": "18.800122000a4ffb33"}, {"access": ["invite"], "creator": "7442a7df-8cd8-493f-aa7c-4939a2683d02", "members": { "self": { "hidden_ref": null, "status": 0, "last_read": "2.800122000a632b43", "muted_time": null, "service": null, "otr_muted_ref": null, "muted": null, "status_time": "2015-07-23T15:29:00.611Z", "hidden": false, "status_ref": "0.0", "id": "8b497692-7a38-4a5d-8287-e3d1006577d6", "otr_archived": false, "cleared": null, "otr_muted": false, "otr_archived_ref": null, "archived": null }, "others": [{ "status": 1, "id": "0410795a-58dc-40d8-b216-cbc2360be21a" }, { "status": 0, "id": "2bde49aa-bdb5-458f-98cf-7d3552b10916" }, { "status": 0, "id": "36876ec6-9481-41db-a6a8-94f92953c538" }, { "status": 0, "id": "532af01e-1e24-4366-aacf-33b67d4ee376" }, { "status": 1, "id": "6b7e0641-6df8-49fe-812d-74c4561edbb4" }, { "status": 1, "id": "7442a7df-8cd8-493f-aa7c-4939a2683d02" }, { "status": 0, "id": "a29b13c5-587a-421b-bc77-b7f5b20c4352" }, { "status": 0, "id": "b7cc6726-deda-4bd1-a10d-a0c6a0baf878" }] }, "name": "This is a call", "id": "0144f29d-bf2d-4afd-a91b-754dc0e26d2a", "type": 0, "last_event_time": "2015-08-11T10:09:35.936Z", "last_event": "31.800122000a69fde1"}]
        #@formatter:on

        merged_conversations = conversation_service.merge_conversations [], remote_data

        expect(merged_conversations.length).toBe 1
        expect(merged_conversations[0].name).toBe remote_data[1].name
