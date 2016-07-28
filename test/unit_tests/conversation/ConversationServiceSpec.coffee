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
  server = null

  urls =
    rest_url: 'http://localhost'
    websocket_url: 'wss://localhost'

  conversation_service = null

  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeStorageActors()
    .then (storage_repository) ->
      server = sinon.fakeServer.create()
      client = test_factory.client
      storage_service = storage_repository.storage_service
      conversation_service = new z.conversation.ConversationService client, storage_service
      done()
    .catch done.fail

  afterEach ->
    server.restore()

  describe 'get_last_events', ->
    it 'can get the latest event IDs of all conversations', ->
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
      expect(callback).toBeTruthy
      expect(response.has_more).toBeFalsy()
      expect(response.conversations.length).toBe 5
      expect(response.conversations[0].event).toEqual '13c.800122000a64b3ee'
      expect(response.conversations[4].id).toEqual '0925d3a9-65a8-4445-b6dd-56f82a1ec75b'

  describe 'load_events_from_db', ->

    it 'returns an information set about the loaded events even if no records are found', (done) ->
      conversation_service.load_events_from_db 'invalid_id', 1466549621778, 30
      .then (loaded_events) =>
        [events, has_further_events] = loaded_events
        expect(events.length).toBe 0
        expect(has_further_events).toBe false
        done()

    xit 'works', (done) ->
      conversation_payload = {
        "access": ["private"],
        "creator": "0410795a-58dc-40d8-b216-cbc2360be21a",
        "members": {
          "self": {
            "hidden_ref": null,
            "status": 0,
            "last_read": "24fe.800122000b16c279",
            "muted_time": null,
            "otr_muted_ref": null,
            "muted": false,
            "status_time": "2014-12-03T18:39:12.319Z",
            "hidden": false,
            "status_ref": "0.0",
            "id": "532af01e-1e24-4366-aacf-33b67d4ee376",
            "otr_archived": false,
            "cleared": null,
            "otr_muted": false,
            "otr_archived_ref": "2016-07-25T11:30:07.883Z",
            "archived": null
          }, "others": [{"status": 0, "id": "0410795a-58dc-40d8-b216-cbc2360be21a"}]
        },
        "name": "Michael Koppen",
        "id": "573b6978-7700-443e-9ce5-ff78b35ac590",
        "type": 2,
        "last_event_time": "2016-06-21T22:53:41.778Z",
        "last_event": "24fe.800122000b16c279"
      }

      conversation_service.load_events_from_db conversation_payload.id, 1466549621778, 30
      .then (loaded_events) =>
        console.log "BENY", loaded_events
        expect(loaded_events.length).toBe 0
        done()
