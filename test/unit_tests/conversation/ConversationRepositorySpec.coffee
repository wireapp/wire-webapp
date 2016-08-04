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

# grunt test_init && grunt test_run:conversation/ConversationRepository
#@formatter:off
describe 'z.conversation.ConversationRepository', ->
  conversation_et = null
  self_user_et = null
  server = null
  test_factory = new TestFactory()
  client = test_factory.client

  _find_conversation = (conversation, conversations) ->
    ko.utils.arrayFirst conversations(), (conversation_et) ->
      return conversation_et.id is conversation.id

  _generate_asset_message = (state, uploaded_on_this_client = false) ->
    file_et = new z.entity.File()
    file_et.uploaded_on_this_client uploaded_on_this_client
    file_et.status state
    message_et = new z.entity.ContentMessage z.util.create_random_uuid()
    message_et.assets.push file_et
    return message_et

  _generate_conversation = (conversation_type = z.conversation.ConversationType.REGULAR, connection_status = z.user.ConnectionStatus.ACCEPTED) ->
    conversation_et = new z.entity.Conversation()
    conversation_et.id = z.util.create_random_uuid()
    conversation_et.type conversation_type

    connection_et = new z.entity.Connection()
    connection_et.conversation_id = conversation_et.id
    connection_et.status connection_status
    conversation_et.connection connection_et

    return conversation_et

  beforeAll (done) ->
    z.util.protobuf.load_protos 'ext/proto/generic-message-proto/messages.proto'
    .then -> done()

  beforeEach (done) ->
    server = sinon.fakeServer.create()
    sinon.spy jQuery, 'ajax'

    test_factory.exposeConversationActors()
    .then (conversation_repository) ->
      conversation_et = _generate_conversation z.conversation.ConversationType.SELF
      conversation_et.id = payload.conversations.knock.post.conversation
      conversation_repository.save_conversation conversation_et

      ping_url = "#{test_factory.settings.connection.rest_url}/conversations/#{conversation_et.id}/knock"
      server.respondWith 'POST', ping_url, [
        201
        'Content-Type': 'application/json'
        JSON.stringify payload.conversations.knock.post
      ]

      mark_as_read_url = "#{test_factory.settings.connection.rest_url}/conversations/#{conversation_et.id}/self"
      server.respondWith 'PUT', mark_as_read_url, [
        200
        {}
        ''
      ]

      conv =
        "creator": conversation_et.id,
        "members": {
          "self": {
            "status": 0,
            "last_read": "1.800122000a54449c",
            "muted_time": null,
            "muted": null,
            "status_time": "2015-01-28T12:53:41.847Z",
            "status_ref": "0.0",
            "id": conversation_et.id,
            "archived": null
          },
          "others": []
        },
        "name": null,
        "id": conversation_et.id,
        "type": 0,
        "last_event_time": "2015-03-20T13:41:12.580Z",
        "last_event": "25.800122000a0b0bc9"

      get_conversation_url = "#{test_factory.settings.connection.rest_url}/conversations/#{conversation_et.id}"

      server.respondWith 'GET', get_conversation_url, [
        201
        'Content-Type': 'application/json'
        JSON.stringify conv
      ]

      done()
    .catch done.fail

  afterEach ->
    server.restore()
    jQuery.ajax.restore()

  xdescribe 'Sending Ping events', ->
    # @todo Unit test for sending encrypted pings
    it 'can ping', ->
      conversation_repository.send_ping conversation_et
      server.respond()

      expect(conversation_et.messages().length).toBe 1
      expect(conversation_et.messages()[0].super_type).toEqual 'ping'

  # @todo Initialize z.proto Message types
  xdescribe 'Check for duplicated messages', ->
    it 'ignores duplicated events (even if they do not occur in pairs)', ->
      first_message = {"conversation": conversation_et.id, "time": "2015-03-12T16:43:37.993Z", "data": {"content": "Hello ", "nonce": "7092baae-d9ba-44a7-923b-0bffd076993f"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ec.800122000a775854", "type": "conversation.message-add"}
      second_message = {"conversation": conversation_et.id, "time": "2015-03-12T16:43:41.063Z", "data": {"content": "World", "nonce": "cef2e84f-4d22-4e4d-b252-74153a4bcc23"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ed.800122000a775857", "type": "conversation.message-add"}
      third_message = {"conversation": conversation_et.id, "time": "2015-03-12T16:44:51.253Z", "data": {"content": "!", "nonce": "4bc077b2-e261-4577-936f-2a105ddffd58"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ee.800122000a77587e", "type": "conversation.message-add"}

      conversation_repository.on_conversation_event first_message
      conversation_repository.on_conversation_event first_message

      expect(conversation_et.messages().length).toBe 1

      conversation_repository.on_conversation_event second_message
      conversation_repository.on_conversation_event first_message
      conversation_repository.on_conversation_event third_message
      conversation_repository.on_conversation_event first_message

      expect(conversation_et.messages().length).toBe 3

    it 'ignores duplicated events (in any order) of different event types', ->
      text = {"conversation": conversation_et.id, "time": "2015-03-12T23:33:53.717Z", "data": {"content": "Message", "nonce": "1dab326f-d410-47eb-bbc6-429642f8841b"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1a8.800122000a777d0e", "type": "conversation.message-add"}
      ping = {"conversation": conversation_et.id, "time": "2015-03-12T23:33:58.636Z", "data": {"nonce": "c2ebd2bf-d742-4c0c-b2a5-5b06f7d422f0"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1a9.800122000a777d10", "type": "conversation.knock"}
      hot_ping = {"conversation": conversation_et.id, "time": "2015-03-12T23:34:00.254Z", "data": {"nonce": "c2ebd2bf-d742-4c0c-b2a5-5b06f7d422f0", "ref": "1a9.800122000a777d10"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1aa.800122000a777d11", "type": "conversation.hot-knock"}
      call_activate = {"conversation": conversation_et.id, "time": "2015-03-12T23:34:10.501Z", "data": null, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ab.800122000a5c3101", "type": "conversation.voice-channel-activate"}
      call_deactivate = {"conversation": conversation_et.id, "time": "2015-03-12T23:34:28.328Z", "data": {"reason": "missed"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ac.800122000a5c3109", "type": "conversation.voice-channel-deactivate"}
      preview_image = {"conversation": conversation_et.id, "time": "2015-03-12T23:43:32.850Z", "data": {"content_length": 931, "data": "...", "content_type": "image/jpeg", "id": "3af1cdda-7f20-5cd9-b5fc-c13001979790", "info": {"height": 30, "tag": "preview", "original_width": 2448, "width": 30, "name": null, "correlation_id": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "original_height": 2448, "nonce": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "public": false}}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ae.800122000a5c318d", "type": "conversation.asset-add"}
      full_size_image = {"conversation": conversation_et.id, "time": "2015-03-12T23:43:36.405Z", "data": {"content_length": 212646, "data": null, "content_type": "image/jpeg", "id": "688309d6-c4aa-5bb1-908f-5051b74c1978", "info": {"height": 1448, "tag": "medium", "original_width": 2448, "width": 1448, "name": null, "correlation_id": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "original_height": 2448, "nonce": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "public": false}}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1af.800122000a5c318e", "type": "conversation.asset-add"}

      conversation_repository.on_conversation_event call_deactivate
      conversation_repository.on_conversation_event ping
      conversation_repository.on_conversation_event hot_ping
      conversation_repository.on_conversation_event call_deactivate
      conversation_repository.on_conversation_event call_deactivate
      conversation_repository.on_conversation_event hot_ping
      conversation_repository.on_conversation_event text
      conversation_repository.on_conversation_event ping
      conversation_repository.on_conversation_event preview_image
      conversation_repository.on_conversation_event full_size_image
      conversation_repository.on_conversation_event text
      conversation_repository.on_conversation_event text
      conversation_repository.on_conversation_event call_activate
      conversation_repository.on_conversation_event text

      expect(conversation_et.messages().length).toBe 7

    it 'accepts full size images being sent before preview images', ->
      preview_image = {"conversation": conversation_et.id, "time": "2015-03-12T23:43:32.850Z", "data": {"content_length": 931, "data": "...", "content_type": "image/jpeg", "id": "3af1cdda-7f20-5cd9-b5fc-c13001979790", "info": {"height": 30, "tag": "preview", "original_width": 2448, "width": 30, "name": null, "correlation_id": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "original_height": 2448, "nonce": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "public": false}}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ae.800122000a5c318d", "type": "conversation.asset-add"}
      full_size_image = {"conversation": conversation_et.id, "time": "2015-03-12T23:43:36.405Z", "data": {"content_length": 212646, "data": null, "content_type": "image/jpeg", "id": "688309d6-c4aa-5bb1-908f-5051b74c1978", "info": {"height": 1448, "tag": "medium", "original_width": 2448, "width": 1448, "name": null, "correlation_id": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "original_height": 2448, "nonce": "53f970d9-2e82-498f-89d2-5f8f25b0fafa", "public": false}}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1af.800122000a5c318e", "type": "conversation.asset-add"}

      conversation_repository.on_conversation_event full_size_image
      conversation_repository.on_conversation_event preview_image
      # Duplicated events will be ignored
      conversation_repository.on_conversation_event full_size_image

      expect(conversation_et.messages().length).toBe 2

  describe 'handle member join correctly', ->

    member_join_event = null

    beforeEach ->
      spyOn(conversation_repository, 'member_join').and.callThrough()

      member_join_event = {
        "conversation": conversation_et.id,
        "time": "2015-04-27T11:42:31.475Z",
        "data": {"user_ids": []},
        "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5",
        "id": "3.800122000a5dcd58",
        "type": "conversation.member-join"
      }

    it 'processes member join if joining a group conversation', ->
      conversation_repository.on_conversation_event member_join_event
      expect(conversation_repository.member_join).toHaveBeenCalled()

    # TODO: HERE!
    it 'ignores member join if joining a one2on2 conversation', ->

      # conversation has a corresponding pending connection
      connection_et_a = new z.entity.Connection()
      connection_et_a.conversation_id = conversation_et.id
      connection_et_a.status z.user.ConnectionStatus.PENDING
      user_repository.connections.push connection_et_a

      conversation_repository.on_conversation_event member_join_event
      expect(conversation_repository.member_join).not.toHaveBeenCalled()

    # @todo Cached conversation events are not properly reset anymore
    xit 'caches events while getting the conversation from the backend', ->
      expect(conversation_repository.conversations().length).toBe 1
      conversation_repository.conversations.removeAll()
      expect(conversation_repository.conversations().length).toBe 0

      conversation_repository.on_conversation_event member_join_event
      expect(conversation_repository.fetching_conversations[conversation_et.id]).toBeDefined()

      text_message_event = {"conversation": conversation_et.id, "time": "2015-03-12T16:43:37.993Z", "data": {"content": "Hello ", "nonce": "7092baae-d9ba-44a7-923b-0bffd076993f"}, "from": "d5a39ffb-6ce3-4cc8-9048-0e15d031b4c5", "id": "1ec.800122000a775854", "type": "conversation.message-add"}
      conversation_repository.on_conversation_event text_message_event
      expect(conversation_repository.fetching_conversations[conversation_et.id].length).toBe 2

      server.respond()
      expect(conversation_repository.fetching_conversations[conversation_et.id]).toBeUndefined()
      conversation = conversation_repository.get_conversation_by_id conversation_et.id
      expect(conversation.messages().length).toBe 2
      expect(conversation.messages()[0].type).toBe z.event.Backend.CONVERSATION.MEMBER_JOIN
      expect(conversation.messages()[1].type).toBe z.event.Backend.CONVERSATION.MESSAGE_ADD

  describe 'map connection', ->
    connection_et = undefined
    conversation_et = undefined

    beforeEach ->
      connection_et = new z.entity.Connection()
      connection_et.conversation_id = conversation_et.id

      spyOn(conversation_repository, 'fetch_conversation_by_id').and.callThrough()
      spyOn(conversation_repository, 'save_conversation').and.callThrough()
      spyOn(conversation_service, 'get_conversation_by_id').and.callThrough()
      spyOn(client, 'send_request').and.callThrough()

    it 'maps connection to existing conversation', ->
      conversation_repository.map_connection [connection_et]
      expect(conversation_et.connection()).toBe connection_et

    it 'maps connection to a new conversation', ->
      connection_et.status z.user.ConnectionStatus.ACCEPTED
      conversation_repository.conversations.removeAll()
      conversation_repository.map_connection [connection_et]

      expect(conversation_repository.fetch_conversation_by_id).toHaveBeenCalled()
      expect(conversation_service.get_conversation_by_id).toHaveBeenCalled()
      expect(client.send_request).toHaveBeenCalled()

      server.respond()

      expect(conversation_repository.save_conversation).toHaveBeenCalled()

    it 'maps cancelled connections to exiting conversation and filters it correctly', ->
      connection_et.status z.user.ConnectionStatus.CANCELLED
      conversation_repository.map_connection [connection_et]
      expect(_find_conversation(conversation_et, conversation_repository.conversations)).not.toBeNull()
      expect(_find_conversation(conversation_et, conversation_repository.filtered_conversations)).toBeNull()

  describe 'filtered conversations', ->

    it 'self conversation is not part of the filtered conversations', ->
      self_conversation_et = _generate_conversation z.conversation.ConversationType.SELF
      conversation_repository.save_conversation self_conversation_et
      expect(_find_conversation(self_conversation_et, conversation_repository.conversations)).not.toBeNull()
      expect(_find_conversation(self_conversation_et, conversation_repository.filtered_conversations)).toBeNull()

    it 'blocked conversation is not part of filtered conversations', ->
      blocked_conversation_et = _generate_conversation z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.BLOCKED
      conversation_repository.save_conversation blocked_conversation_et
      expect(_find_conversation(blocked_conversation_et, conversation_repository.conversations)).not.toBeNull()
      expect(_find_conversation(blocked_conversation_et, conversation_repository.filtered_conversations)).toBeNull()

    it 'cancelled conversation is not part of the conversation list', ->
      cancelled_conversation_et = _generate_conversation z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.CANCELLED
      conversation_repository.save_conversation cancelled_conversation_et
      expect(_find_conversation(cancelled_conversation_et, conversation_repository.conversations)).not.toBeNull()
      expect(_find_conversation(cancelled_conversation_et, conversation_repository.filtered_conversations)).toBeNull()

    it 'pending conversation is not part of the conversation list', ->
      pending_conversation_et = _generate_conversation z.conversation.ConversationType.ONE2ONE, z.user.ConnectionStatus.PENDING
      conversation_repository.save_conversation pending_conversation_et
      expect(_find_conversation(pending_conversation_et, conversation_repository.conversations)).not.toBeNull()
      expect(_find_conversation(pending_conversation_et, conversation_repository.filtered_conversations)).toBeNull()

  describe 'get_groups_by_name', ->

    beforeEach ->
      group_a = _generate_conversation z.conversation.ConversationType.REGULAR
      group_a.name 'Web Dudes'

      group_b = _generate_conversation z.conversation.ConversationType.REGULAR
      group_b.name 'René, Benny, Gregor, Lipis'

      group_c = _generate_conversation z.conversation.ConversationType.REGULAR
      self_user_et = new z.entity.User()
      self_user_et.name 'John'
      group_c.participating_user_ets.push self_user_et

      group_cleared = _generate_conversation z.conversation.ConversationType.REGULAR
      group_cleared.name 'Cleared'
      group_cleared.last_event_timestamp Date.now() - 1000
      group_cleared.set_timestamp Date.now(), z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP

      group_removed = _generate_conversation z.conversation.ConversationType.REGULAR
      group_removed.name 'Removed'
      group_removed.last_event_timestamp Date.now() - 1000
      group_removed.set_timestamp Date.now(), z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP
      group_removed.removed_from_conversation true

      conversation_repository.save_conversation group_a
      conversation_repository.save_conversation group_b
      conversation_repository.save_conversation group_c
      conversation_repository.save_conversation group_cleared

    it 'finds the correct groups by full name', ->
      result = conversation_repository.get_groups_by_name 'Web Dudes'
      expect(result.length).toBe 1

    it 'finds the correct groups by part of the group name', ->
      result = conversation_repository.get_groups_by_name 'Dudes'
      expect(result.length).toBe 1

    it 'finds the correct groups by using transliteration', ->
      result = conversation_repository.get_groups_by_name 'Rene'
      expect(result.length).toBe 1

    it 'finds the correct groups by search for string that is part of three groups', ->
      result = conversation_repository.get_groups_by_name 'e'
      expect(result.length).toBe 3

    it 'finds the correct groups by the name of a group member', ->
      result = conversation_repository.get_groups_by_name 'John'
      expect(result.length).toBe 1

    it 'finds a group that is cleared that the user is still a member of', ->
      result = conversation_repository.get_groups_by_name 'Cleared'
      expect(result.length).toBe 1

    it 'should not find a cleared group that the user left', ->
      result = conversation_repository.get_groups_by_name 'Removed'
      expect(result.length).toBe 0

  describe 'get_number_of_pending_uploads', ->

    it 'should return number of pending uploads if there are pending uploads', ->
      conversation_et = _generate_conversation z.conversation.ConversationType.REGULAR
      conversation_et.add_message _generate_asset_message(z.assets.AssetTransferState.UPLOADING, true)
      expect(conversation_et.get_number_of_pending_uploads()).toBe 1

      conversation_et = _generate_conversation z.conversation.ConversationType.REGULAR
      conversation_et.add_message _generate_asset_message(z.assets.AssetTransferState.UPLOADING, true)
      conversation_et.add_message _generate_asset_message(z.assets.AssetTransferState.UPLOADING)
      expect(conversation_et.get_number_of_pending_uploads()).toBe 1

      conversation_et = _generate_conversation z.conversation.ConversationType.REGULAR
      conversation_et.add_message _generate_asset_message(z.assets.AssetTransferState.UPLOADING, true)
      conversation_et.add_message _generate_asset_message(z.assets.AssetTransferState.UPLOADED)
      expect(conversation_et.get_number_of_pending_uploads()).toBe 1

    it 'should return 0 if there are no pending uploads', ->
      conversation_et.add_message new z.entity.Message z.util.create_random_uuid()
      expect(conversation_et.get_number_of_pending_uploads()).toBe 0

  describe 'asset upload', ->

    conversation_et = null
    message_et = null

    beforeEach ->
      conversation_et = _generate_conversation z.conversation.ConversationType.REGULAR
      conversation_repository.save_conversation conversation_et

      file_et = new z.entity.File()
      file_et.status z.assets.AssetTransferState.UPLOADING
      message_et = new z.entity.ContentMessage z.util.create_random_uuid()
      message_et.assets.push file_et
      conversation_et.add_message message_et

      spyOn conversation_service, 'update_asset_as_uploaded_in_db'
      spyOn conversation_service, 'update_asset_as_failed_in_db'
      spyOn conversation_service, 'update_asset_preview_in_db'
      spyOn conversation_service, 'delete_message_from_db'

    afterEach ->
      conversation_et.remove_messages()

    it 'should update original asset when asset upload is complete', ->
      # mocked event response
      event =
        data:
          id: z.util.create_random_uuid()
          otr_key: new Uint8Array([])
          sha256: new Uint8Array([])
        from: z.util.create_random_uuid()
        time: Date.now()
        id: message_et.id
        type: z.event.Backend.CONVERSATION.ASSET_UPLOAD_COMPLETE
        conversation: conversation_et.id

      conversation_repository.asset_upload_complete conversation_et, event

      expect(conversation_service.update_asset_as_uploaded_in_db).toHaveBeenCalled()
      expect(message_et.assets()[0].original_resource().otr_key).toBe event.data.otr_key
      expect(message_et.assets()[0].original_resource().sha256).toBe event.data.sha256
      expect(message_et.assets()[0].status()).toBe z.assets.AssetTransferState.UPLOADED

    it 'should update original asset when asset upload is complete', ->
      # mocked event response
      event =
        data:
          id: z.util.create_random_uuid()
          otr_key: new Uint8Array([])
          sha256: new Uint8Array([])
        from: z.util.create_random_uuid()
        time: Date.now()
        id: message_et.id
        type: z.event.Backend.CONVERSATION.ASSET_PREVIEW
        conversation: conversation_et.id

      conversation_repository.asset_preview conversation_et, event

      expect(conversation_service.update_asset_preview_in_db).toHaveBeenCalled()
      expect(message_et.assets()[0].preview_resource().otr_key).toBe event.data.otr_key
      expect(message_et.assets()[0].preview_resource().sha256).toBe event.data.sha256
      expect(message_et.assets()[0].status()).toBe z.assets.AssetTransferState.UPLOADING

    it 'should update original asset when asset upload failed', ->
      # mocked event response
      event =
        data:
          reason: z.assets.AssetUploadFailedReason.FAILED
        from: z.util.create_random_uuid()
        time: Date.now()
        id: message_et.id
        type: z.event.Backend.CONVERSATION.ASSET_UPLOAD_FAILED
        conversation: conversation_et.id

      conversation_repository.asset_upload_failed conversation_et, event

      expect(conversation_service.update_asset_as_failed_in_db).toHaveBeenCalled()
      expect(message_et.assets()[0].status()).toBe z.assets.AssetTransferState.UPLOAD_FAILED
      expect(message_et.assets()[0].upload_failed_reason()).toBe z.assets.AssetUploadFailedReason.FAILED

    it 'should remove original asset message when asset upload was cancelled', ->
      # mocked event response
      event =
        data:
          reason: z.assets.AssetUploadFailedReason.CANCELLED
        from: z.util.create_random_uuid()
        time: Date.now()
        id: message_et.id
        type: z.event.Backend.CONVERSATION.ASSET_UPLOAD_FAILED
        conversation: conversation_et.id

      conversation_repository.asset_upload_failed conversation_et, event

      expect(conversation_service.delete_message_from_db).toHaveBeenCalledWith conversation_et.id, message_et.id
      expect(conversation_et.get_message_by_id message_et.id).toBeUndefined()

    it 'should delete message on receiver side', ->
      # mocked event response
      event =
        data:
          conversation_id: conversation_et.id
          message_id: message_et.id
        from: z.util.create_random_uuid()
        time: Date.now()
        id: message_et.id
        type: z.event.Backend.CONVERSATION.MESSAGE_DELETE
        conversation: conversation_et.id

      conversation_repository.message_deleted event

      expect(conversation_service.delete_message_from_db).toHaveBeenCalledWith conversation_et.id, message_et.id
      expect(conversation_et.get_message_by_id message_et.id).toBeUndefined()

  #@formatter:on

  describe 'Encryption', ->
    beforeEach ->
      anne = new z.entity.User()
      anne.name 'Anne'

      window.bob = new z.entity.User()
      bob.id = '532af01e-1e24-4366-aacf-33b67d4ee376'
      bob.name 'Bob'

      jane = new z.entity.User window.entities.user.jane_roe.id
      jane.name 'Jane'

      john = new z.entity.User window.entities.user.john_doe.id
      john.name 'John'

      johns_computer = new z.client.Client {id: '83ad5d3c31d3c76b', class: 'tablet'}
      john.devices.push johns_computer

      lara = new z.entity.User()
      lara.name 'Lara'

      bobs_computer = new z.client.Client {id: '74606e4c02b2c7f9', class: 'desktop'}
      bobs_phone = new z.client.Client {id: '8f63631e129ed19d', class: 'phone'}

      bob.devices.push bobs_computer
      bob.devices.push bobs_phone

      dudes = _generate_conversation z.conversation.ConversationType.REGULAR
      dudes.name 'Web Dudes'
      dudes.participating_user_ets.push bob
      dudes.participating_user_ets.push john

      gals = _generate_conversation z.conversation.ConversationType.REGULAR
      gals.name 'Web Gals'
      gals.participating_user_ets.push anne
      gals.participating_user_ets.push jane
      gals.participating_user_ets.push lara

      mixed_group = _generate_conversation z.conversation.ConversationType.REGULAR
      mixed_group.name 'Web Dudes & Gals'
      mixed_group.participating_user_ets.push anne
      mixed_group.participating_user_ets.push bob
      mixed_group.participating_user_ets.push jane
      mixed_group.participating_user_ets.push john
      mixed_group.participating_user_ets.push lara

      conversation_repository.save_conversation dudes
      conversation_repository.save_conversation gals
      conversation_repository.save_conversation mixed_group

      cryptography_repository.cryptobox =
        session_delete: -> return Promise.resolve()
        session_load: -> true
        session_save: -> true

    it 'knows all users participating in a conversation (including the self user)', (done) ->
      dudes = conversation_repository.conversations()[1]
      conversation_repository.get_all_users_in_conversation dudes.id
      .then (user_ets) ->
        expect(user_ets.length).toBe 3
        expect(user_ets[0] instanceof z.entity.User).toBeTruthy()
        expect(conversation_repository.conversations().length).toBe 4
        done()
      .catch done.fail

    it 'can generate a user-client-map for users which have clients', (done) ->
      spyOn cryptography_repository, '_construct_session_id'

      dudes = conversation_repository.conversations()[1]
      user_ets = dudes.participating_user_ets()

      conversation_repository._create_user_client_map dudes.id
      .then (user_client_map) ->
        bobs_clients = user_client_map[Object.keys(user_client_map)[0]]

        expect(Object.keys(user_client_map).length).toBe 2
        expect(bobs_clients.length).toBe 2
        expect(user_ets.length).toBe 2
        done()
      .catch done.fail

    describe '412 handling', ->
      generic_message = undefined
      john_doe = undefined
      jane_roe = undefined

      beforeAll ->
        generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
        generic_message.set 'text', new z.proto.Text 'Test'

        john_doe =
          client_id: 'd13a2ec9b6436122'
          user_id: entities.user.john_doe.id
        jane_roe =
          client_id: 'edc943ba4d6ef6b1'
          user_id: entities.user.jane_roe.id

      beforeEach ->

      it 'can remove the payload of deleted clients', (done) ->
        error_response =
          missing: {}
          deleted:
            "#{jane_roe.user_id}": ["#{jane_roe.client_id}"]
          redundant: {}
          time: '2016-04-29T10:38:23.002Z'

        payload =
          sender: '43619b6a2ec22e24'
          recipients:
            "#{jane_roe.user_id}":
              "#{jane_roe.client_id}": '💣'

        conversation_repository._update_payload_for_changed_clients error_response, generic_message, payload
        .then (updated_payload) ->
          expect(Object.keys(updated_payload.recipients).length).toBe 0
          done()
        .catch done.fail

      it 'can encrypt a generic message for a missing clients', (done) ->
        session = new cryptobox.CryptoboxSession "#{john_doe.user_id}@#{john_doe.client_id}"
        spyOn(cryptography_repository, 'load_session').and.returnValue session

        error_response =
          missing:
            "#{john_doe.user_id}": ["#{john_doe.client_id}"]
          deleted: {}
          redundant: {}
          time: '2016-04-29T10:38:23.002Z'

        conversation_repository._update_payload_for_changed_clients error_response, generic_message
        .then (updated_payload) ->
          expect(Object.keys(updated_payload.recipients).length).toBe 1
          expect(Object.keys(updated_payload.recipients[john_doe.user_id]).length).toBe 1
          done()
        .catch done.fail

  describe '_send_as_external_message', ->

    it 'should return true for big payload', ->
      external_conversation_et = _generate_conversation()
      external_conversation_et.participating_user_ids [0..128]
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text 'massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external messagemassive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message massive external message'

      should_send_as_external = conversation_repository._send_as_external_message conversation_et, generic_message
      expect(should_send_as_external).toBeTruthy()

    it 'should return false for small payload', ->
      external_conversation_et = _generate_conversation()
      external_conversation_et.participating_user_ids [0..1]
      generic_message = new z.proto.GenericMessage z.util.create_random_uuid()
      generic_message.set 'text', new z.proto.Text 'Test'

      should_send_as_external = conversation_repository._send_as_external_message conversation_et, generic_message
      expect(should_send_as_external).toBeFalsy()

  describe '_construct_otr_message_event', ->

    it 'creates a time if no time is given', ->
      date = new Date 2016, 7, 10, 9, 2, 25, 350
      jasmine.clock().mockDate(date);

      backend_response =
        redundant: {}
        time: undefined
        missing: {}
        deleted: {}

      conversation_id = '35d8767e-83c9-4e9a-a5ee-32ba7de706f2'
      iso_date = date.toISOString()
      event = conversation_repository._construct_otr_message_event backend_response, conversation_id
      expect(event.time).toBe iso_date
      expect(event.conversation).toBe conversation_id
