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

describe 'Conversation Service', ->
  conversation_mapper = null
  server = null

  urls =
    rest_url: 'http://localhost'
    websocket_url: 'wss://localhost'

  conversation_service = null
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

  describe 'get_last_events', ->
    it 'gets the latest event IDs of all conversations', ->
      request_url = "#{urls.rest_url}/conversations/last-events"
      server.respondWith 'GET', request_url, [
        200
        {'Content-Type': 'application/json'}
        JSON.stringify payload.conversations.last_events.get
      ]
      callback = sinon.spy()

      conversation_service.get_last_events callback
      server.respond()
      response = callback.getCall(0).args[0]
      expect(callback).toBeTruthy()
      expect(response.has_more).toBeFalsy()
      expect(response.conversations.length).toBe 5
      expect(response.conversations[0].event).toEqual '13c.800122000a64b3ee'
      expect(response.conversations[4].id).toEqual '0925d3a9-65a8-4445-b6dd-56f82a1ec75b'

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
        return conversation_service.storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
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

  describe 'update_message_timestamp_in_db', ->
    # @formatter:off
    messages = [
      {
        key: '35a9a89d-70dc-4d9e-88a2-4d8758458a6a@8b497692-7a38-4a5d-8287-e3d1006577d6@1470317278993'
        object: {"conversation":"35a9a89d-70dc-4d9e-88a2-4d8758458a6a","id":"4af67f76-09f9-4831-b3a4-9df877b8c29a","from":"8b497692-7a38-4a5d-8287-e3d1006577d6","time":"2016-08-04T13:27:58.993Z","data":{"content":"Second message","nonce":"4af67f76-09f9-4831-b3a4-9df877b8c29a","previews":[]},"type":"conversation.message-add"}
      }
    ]
    # @formatter:on

    beforeEach (done) ->
      Promise.all messages.map (message) ->
        return conversation_service.storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
      .then done
      .catch done.fail

    it 'returns updated record', (done) ->
      timestamp = Date.now()
      time = new Date(timestamp).toISOString()
      conversation_service.update_message_timestamp_in_db messages[0].key, timestamp
      .then (record) =>
        expect(record.time).toEqual time
        done()
      .catch done.fail

    it 'fails if no timestamp is specified', (done) ->
      conversation_service.update_message_timestamp_in_db messages[0].key, undefined
      .then done.fail
      .catch (error) ->
        expect((error)).toEqual jasmine.any(TypeError)
        done()

  describe 'load_events_from_db', ->
    conversation_id = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a'
    sender_id = '8b497692-7a38-4a5d-8287-e3d1006577d6'
    messages = undefined

    beforeEach (done) ->
      messages = [0...10].map (index) ->
        return {
          key: "#{conversation_id}@#{sender_id}@#{index}"
          object: {"conversation": conversation_id, "time": index}
        }

      Promise.all messages.map (message) ->
        return conversation_service.storage_service.save storage_service.OBJECT_STORE_CONVERSATION_EVENTS, message.key, message.object
      .then done
      .catch done.fail

    it 'doesnt load events for invalid conversation id', (done) ->
      conversation_service.load_events_from_db 'invalid_id', 9, 30
      .then (events) =>
        expect(events.length).toBe 0
        done()

    it 'loads all events', (done) ->
      conversation_service.load_events_from_db conversation_id
      .then (events) =>
        expect(events.length).toBe 10
        done()

    it 'loads all events with limit', (done) ->
      conversation_service.load_events_from_db conversation_id, null, null, 5
      .then (events) =>
        expect(events.length).toBe 5
        done()

    it 'loads events with start timestamp', (done) ->
      conversation_service.load_events_from_db conversation_id, 4
      .then (events) =>
        expect(events.length).toBe 4
        expect(events[0].time).toBe 3
        expect(events[1].time).toBe 2
        expect(events[2].time).toBe 1
        expect(events[3].time).toBe 0
        done()

    it 'loads events with start and end timestamp', (done) ->
      conversation_service.load_events_from_db conversation_id, 8, 6
      .then (events) =>
        expect(events.length).toBe 1
        expect(events[0].time).toBe 7
        done()

    it 'loads events with start and end timestamp', (done) ->
      conversation_service.load_events_from_db conversation_id, 8, 1, 2
      .then (events) =>
        expect(events.length).toBe 2
        expect(events[0].time).toBe 7
        expect(events[1].time).toBe 6
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
