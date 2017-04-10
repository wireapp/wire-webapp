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

# grunt test_init && grunt test_run:conversation/EventMapper

describe 'Event Mapper', ->
  conversation_et = null
  event_mapper = null

  beforeAll (done) ->
    z.util.protobuf.load_protos 'ext/proto/generic-message-proto/messages.proto'
    .then -> done()

  beforeEach ->
    conversation_et = new z.entity.Conversation z.util.create_random_uuid()
    event_mapper = new z.conversation.EventMapper()

  describe 'map_json_event', ->
    it 'maps text messages without link previews', ->
      event_id = z.util.create_random_uuid

      event =
        conversation: conversation_et.id
        data:
          content: 'foo'
          nonce: event_id
        id: event_id
        from: z.util.create_random_uuid
        time: new Date().toISOString()
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD

      message_et = event_mapper.map_json_event event, conversation_et
      expect(message_et.get_first_asset().text).toBe event.data.content
      expect(message_et.get_first_asset().nonce).toBe event.data.nonce
      expect(message_et).toBeDefined()

    it 'maps text messages with deprecated link preview format', ->
      event_id = z.util.create_random_uuid

      article = new z.proto.Article 'test.com', 'Test title', 'Test description'
      link_preview = new z.proto.LinkPreview 'test.com', 0, article

      event =
        conversation: conversation_et.id
        data:
          content: 'test.com'
          nonce: event_id
          previews: [link_preview.encode64()]
        id: event_id
        from: z.util.create_random_uuid
        time: new Date().toISOString()
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD

      message_et = event_mapper.map_json_event event, conversation_et
      expect(message_et.get_first_asset().text).toBe event.data.content
      expect(message_et.get_first_asset().nonce).toBe event.data.nonce
      expect(message_et.get_first_asset().previews().length).toBe 1
      expect(message_et.get_first_asset().previews()[0].original_url).toBe 'test.com'
      expect(message_et).toBeDefined()

    it 'maps text messages with link preview', ->
      event_id = z.util.create_random_uuid

      link_preview = new z.proto.LinkPreview 'test.com', 0, null, 'test.com/perm', 'Test title', 'Test description'

      event =
        conversation: conversation_et.id
        data:
          content: 'test.com'
          nonce: event_id
          previews: [link_preview.encode64()]
        id: event_id
        from: z.util.create_random_uuid
        time: new Date().toISOString()
        type: z.event.Backend.CONVERSATION.MESSAGE_ADD

      message_et = event_mapper.map_json_event event, conversation_et
      expect(message_et.get_first_asset().text).toBe event.data.content
      expect(message_et.get_first_asset().nonce).toBe event.data.nonce
      expect(message_et.get_first_asset().previews().length).toBe 1
      expect(message_et.get_first_asset().previews()[0].original_url).toBe link_preview.url
      expect(message_et.get_first_asset().previews()[0].permanent_url).toBe link_preview.permanent_url
      expect(message_et).toBeDefined()

    it 'skips messages which cannot be mapped', ->
      # @formatter:off
      good_message = {"conversation":conversation_et.id,"id":"4cec0f75-d963-486d-9401-415240ac2ad8","from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2016-08-04T15:12:12.453Z","data":{"content":"Message with timestamp","nonce":"4cec0f75-d963-486d-9401-415240ac2ad8","previews":[]},"type":"conversation.message-add"}
      bad_message = {"conversation":conversation_et.id,"id":"aeac8355-739b-4dfc-a119-891a52c6a8dc","from":"532af01e-1e24-4366-aacf-33b67d4ee376","data":{"content":"Knock, are you there? :)","nonce":"aeac8355-739b-4dfc-a119-891a52c6a8dc"},"type":"conversation.message-add"}
      # @formatter:on

      message_ets = event_mapper.map_json_events [good_message, bad_message], conversation_et
      expect(message_ets.length).toBe 1

  describe '_map_system_event_unable_to_decrypt', ->
    it 'maps a message from a decrypt error event', ->
      # @formatter:off
      event = {"category": 0, "conversation": "fb1c051a-3ce3-46c5-bbc2-0153b6076af0", "error": "We received a message with session tag 'a8859a310a0c374a3da67e3a0f871145', but we don't have a session for this tag. (c0a70d96aaeb87b6)", "error_code": "205 (c0a70d96aaeb87b6)", "from": "2bde49aa-bdb5-458f-98cf-7d3552b10916", "id": "cb4972e0-9586-42a2-90cc-1798ec0cb648", "primary_key": 9, "time": "2017-04-03T12:58:04.301Z", "type": "conversation.unable-to-decrypt"}
      # @formatter:on
      message_et = event_mapper._map_system_event_unable_to_decrypt event
      expect(message_et.error_code).toBe '205'
      expect(message_et.client_id).toBe 'c0a70d96aaeb87b6'
