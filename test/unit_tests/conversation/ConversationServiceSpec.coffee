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

  describe 'load_events_from_db', ->

    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    sender_id = '8b497692-7a38-4a5d-8287-e3d1006577d6'

    # @formatter:off
    messages = [
      {
        key: "#{conversation_id}@#{sender_id}@1470317275182"
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"}
      },
      {
        key: "#{conversation_id}@#{sender_id}@1470317278993"
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
      }
    ]
    # @formatter:on

    beforeEach (done) ->
      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
      .then done
      .catch done.fail

    it 'returns mapped message_et if event with id is found', (done) ->
      conversation_service.load_event_from_db conversation_id, '4af67f76-09f9-4831-b3a4-9df877b8c29a'
      .then (message_et) =>
        expect(message_et).toEqual messages[1].object
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

  describe 'load_events_from_db', ->
    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    sender_id = '8b497692-7a38-4a5d-8287-e3d1006577d6'
    messages = undefined

    beforeEach (done) ->
      timestamp = 1479903546799
      messages = [0...10].map (index) ->
        return {
          key: "#{conversation_id}@#{sender_id}@#{index}"
          object: {"conversation": conversation_id, "time": new Date(timestamp + index).toISOString()}
        }

      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
      .then done
      .catch done.fail

    it 'doesn\'t load events for invalid conversation id', (done) ->
      conversation_service.load_events_from_db 'invalid_id', new Date(30), new Date 1479903546808
      .then (events) =>
        expect(events.length).toBe 0
        done()

    it 'loads all events', (done) ->
      conversation_service.load_events_from_db conversation_id
      .then (events) =>
        expect(events.length).toBe 10
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[9].time).toBe '2016-11-23T12:19:06.799Z'
        done()

    it 'loads all events with limit', (done) ->
      conversation_service.load_events_from_db conversation_id, undefined, undefined, 5
      .then (events) =>
        expect(events.length).toBe 5
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[4].time).toBe '2016-11-23T12:19:06.804Z'
        done()

    it 'loads events with lower bound', (done) ->
      conversation_service.load_events_from_db conversation_id, new Date 1479903546805
      .then (events) =>
        expect(events.length).toBe 4
        expect(events[0].time).toBe '2016-11-23T12:19:06.808Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.807Z'
        expect(events[2].time).toBe '2016-11-23T12:19:06.806Z'
        expect(events[3].time).toBe '2016-11-23T12:19:06.805Z'
        done()

    it 'loads events with upper bound', (done) ->
      conversation_service.load_events_from_db conversation_id, undefined, new Date 1479903546803
      .then (events) =>
        expect(events.length).toBe 4
        expect(events[0].time).toBe '2016-11-23T12:19:06.802Z'
        expect(events[1].time).toBe '2016-11-23T12:19:06.801Z'
        expect(events[2].time).toBe '2016-11-23T12:19:06.800Z'
        expect(events[3].time).toBe '2016-11-23T12:19:06.799Z'
        done()

    it 'loads events with upper and lower bound', (done) ->
      conversation_service.load_events_from_db conversation_id, new Date(1479903546806), new Date 1479903546807
      .then (events) =>
        expect(events.length).toBe 1
        expect(events[0].time).toBe '2016-11-23T12:19:06.806Z'
        done()

    it 'loads events with upper and lower bound and a fetch limit', (done) ->
      conversation_service.load_events_from_db conversation_id, new Date(1479903546800), new Date(1479903546807), 2
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
      conversation_service.save_conversation_in_db conversation_et
      .then (conversation_record) =>
        expect(conversation_record.name()).toBe conversation_payload.name
        done()

  describe 'delete_message_with_key_from_db', ->

    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    sender_id = '8b497692-7a38-4a5d-8287-e3d1006577d6'

    # @formatter:off
    messages = [
      {
        key: "#{conversation_id}@#{sender_id}@1470317275182"
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:55.182Z","data":{"content":"First message","nonce":"68a28ab1-d7f8-4014-8b52-5e99a05ea3b1","previews":[]},"type":"conversation.message-add"}
      },
      {
        key: "#{conversation_id}@#{sender_id}@1470317278993"
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
      },

      {
        key: "#{conversation_id}@#{sender_id}@1470317278994"
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message (Duplicate)","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
      }
    ]
    # @formatter:on

    beforeEach (done) ->
      Promise.all messages.map (message) ->
        return storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
      .then done
      .catch done.fail

    it 'deletes message with the given key', (done) ->
      conversation_service.delete_message_with_key_from_db conversation_id, messages[1].key
      .then ->
        conversation_service.load_events_from_db conversation_id
      .then (events) ->
        expect(events.length).toBe 2
        for event in events
          expect(event.data.content).not.toBe messages[1].object.data.content
        done()
      .catch done.fail

    it 'does not delete the event if key is wrong', (done) ->
      conversation_service.delete_message_with_key_from_db conversation_id, 'wrongKey'
      .then ->
        conversation_service.load_events_from_db conversation_id
      .then (events) ->
        expect(events.length).toBe 3
        done()
      .catch done.fail
