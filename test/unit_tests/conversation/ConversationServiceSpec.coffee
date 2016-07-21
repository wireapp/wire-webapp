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

  beforeEach ->
    server = sinon.fakeServer.create()

    client = new z.service.Client urls
    client.logger.level = client.logger.levels.OFF
    conversation_service = new z.conversation.ConversationService client

  afterEach ->
    server.restore()

  # https://dev-nginz-https.zinfra.io/conversations/last-events
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

    expect(callback).toBeTruthy
    if callback.called
      response = callback.getCall(0).args[0]
      expect(response.has_more).toBeFalsy()
      expect(response.conversations.length).toBe 5
      expect(response.conversations[0].event).toEqual '13c.800122000a64b3ee'
      expect(response.conversations[4].id).toEqual '0925d3a9-65a8-4445-b6dd-56f82a1ec75b'
