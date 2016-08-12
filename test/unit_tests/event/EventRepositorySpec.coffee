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

# grunt test_init && grunt test_run:event/EventRepository

describe 'Event Repository', ->
  test_factory = new TestFactory()
  last_notification_id = undefined

  websocket_service_mock = do ->
    websocket_handler = null

    connect: (handler) ->
      websocket_handler = handler

    publish: (payload) ->
      websocket_handler payload

  beforeEach (done) ->
    test_factory.exposeEventActors()
    .then (event_repository) ->
      event_repository.web_socket_service = websocket_service_mock
      notification_service.get_notifications = ->
        return new Promise (resolve) ->
          window.setTimeout ->
            resolve {
              has_more: false
              notifications: [
                {id: z.util.create_random_uuid(), payload: []}
                {id: z.util.create_random_uuid(), payload: []}
              ]
            }
          , 10

      notification_service.get_last_notification_id_from_db = ->
        if last_notification_id
          Promise.resolve last_notification_id
        else
          Promise.reject new z.event.EventError 'ID not found in storage', z.event.EventError::TYPE.DATABASE_NOT_FOUND

      notification_service.save_last_notification_id_to_db = ->
        Promise.resolve z.event.NotificationService::PRIMARY_KEY_LAST_NOTIFICATION

      last_notification_id = undefined
      done()
    .catch done.fail

  describe 'update_from_notification_stream', ->
    beforeEach ->
      spyOn(cryptography_repository, 'save_encrypted_event')
      spyOn(event_repository, '_handle_notification').and.callThrough()
      spyOn(event_repository, '_buffer_web_socket_notification').and.callThrough()
      spyOn(event_repository, '_handle_buffered_notifications').and.callThrough()
      spyOn(event_repository, '_handle_event')
      spyOn(event_repository, '_distribute_event')
      spyOn(notification_service, 'get_notifications').and.callThrough()
      spyOn(notification_service, 'get_last_notification_id_from_db').and.callThrough()

    it 'should skip fetching notifications if last notification ID not found in storage', (done) ->
      event_repository.connect()
      event_repository.update_from_notification_stream()
      .then ->
        expect(notification_service.get_last_notification_id_from_db).toHaveBeenCalled()
        expect(notification_service.get_notifications).not.toHaveBeenCalled()
        done()
      .catch done.fail

    it 'should buffer notifications when notification stream is not processed', ->
      last_notification_id = z.util.create_random_uuid()
      event_repository.connect()
      websocket_service_mock.publish {id: z.util.create_random_uuid(), payload: []}
      expect(event_repository._buffer_web_socket_notification).toHaveBeenCalled()
      expect(event_repository._handle_notification).not.toHaveBeenCalled()
      expect(event_repository.can_handle_web_socket()).toBeFalsy()
      expect(event_repository.web_socket_buffer.length).toBe 1

    it 'should handle buffered notifications after notifications stream was processed', (done) ->
      last_notification_id = z.util.create_random_uuid()
      last_published_notification_id = z.util.create_random_uuid()
      event_repository.last_notification_id last_notification_id
      event_repository.connect()
      websocket_service_mock.publish {id: z.util.create_random_uuid(), payload: []}

      websocket_service_mock.publish {id: last_published_notification_id, payload: []}
      event_repository.update_from_notification_stream()
      .then () ->
        expect(event_repository._handle_buffered_notifications).toHaveBeenCalled()
        expect(event_repository.web_socket_buffer.length).toBe 0
        expect(event_repository.last_notification_id()).toBe last_published_notification_id
        expect(event_repository.can_handle_web_socket()).toBeTruthy()
        done()
      .catch done.fail

  describe '_handle_event', ->
    beforeEach ->
      spyOn(cryptography_repository, 'save_encrypted_event').and.returnValue Promise.resolve(mapped: 'dummy content')
      spyOn(event_repository, '_distribute_event')

    it 'should not save but distribute user events', (done) ->
      event_repository._handle_event {type: z.event.Backend.USER.UPDATE}, z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET
      .then ->
        expect(cryptography_repository.save_encrypted_event).not.toHaveBeenCalled()
        expect(event_repository._distribute_event).toHaveBeenCalled()
        done()
      .catch done.fail

    it 'should not save but distribute call events', (done) ->
      event_repository._handle_event {type: z.event.Backend.CALL.FLOW_ACTIVE}, z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET
      .then ->
        expect(cryptography_repository.save_encrypted_event).not.toHaveBeenCalled()
        expect(event_repository._distribute_event).toHaveBeenCalled()
        done()
      .catch done.fail

    it 'should not save but distribute conversation.create event', (done) ->
      event_repository._handle_event {type: z.event.Backend.CONVERSATION.CREATE}, z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET
      .then ->
        expect(cryptography_repository.save_encrypted_event).not.toHaveBeenCalled()
        expect(event_repository._distribute_event).toHaveBeenCalled()
        done()
      .catch done.fail

    it 'shouldn\'t save and distribute "conversation.message-add" events', (done) ->
      # @formatter:off
      event = {"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-12T10:40:58.769Z","data":{"content":"unencrypted","nonce":"9f239249-3648-4a6c-a5f6-a3c8f902a919"},"from":"062418ea-9b93-4d93-b59b-11aba3f702d8","id":"754.800122000b3f0470","type":"conversation.message-add"}
      # @formatter:on

      event_repository._handle_event event, z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET
      .catch (error) ->
        expect(error.message).toBe z.event.EventError::TYPE.OUTDATED_SCHEMA
        done()

    it 'skips old events arriving via WebSocket', (done) ->
      # @formatter:off
      notification = {"payload":[{"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Unencrypted Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"}],"transient":false,"id":"46569440-5b28-11e6-bfff-22000a520a63"}
      # @formatter:on

      event = notification.payload[0]
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .catch (error) ->
        expect(error.message).toBe z.event.EventError::TYPE.OUTDATED_SCHEMA
        done()

    it 'skips old events arriving via notification stream', (done) ->
      # @formatter:off
      notification = {"payload":[{"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Unencrypted Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"}],"transient":false,"id":"46569440-5b28-11e6-bfff-22000a520a63"}
      # @formatter:on
      event = notification.payload[0]
      source = z.event.EventRepository::NOTIFICATION_SOURCE.STREAM

      event_repository._handle_event event, source
      .catch (error) ->
        expect(error.message).toBe z.event.EventError::TYPE.OUTDATED_SCHEMA
        done()

    it 'skips old events which get injected', (done) ->
      # @formatter:off
      notification = {"payload":[{"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Unencrypted Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"}],"transient":false,"id":"46569440-5b28-11e6-bfff-22000a520a63"}
      # @formatter:on
      event = notification.payload[0]
      source = z.event.EventRepository::NOTIFICATION_SOURCE.INJECTION

      event_repository._handle_event event, source
      .catch (error) ->
        expect(error.message).toBe z.event.EventError::TYPE.OUTDATED_SCHEMA
        done()

    it 'accepts plain conversation rename events', (done) ->
      # @formatter:off
      event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T11:57:37.498Z","data":{"name":"Renamed"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"7.800122000b2f7cca","type":"conversation.rename"}
      # @formatter:on
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .then (record) ->
        expect(record.raw.type).toBe z.event.Backend.CONVERSATION.RENAME
        done()
      .catch done.fail

    it 'accepts plain member join events', (done) ->
      # @formatter:off
      event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:14.688Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"8.800122000b2f7d20","type":"conversation.member-join"}
      # @formatter:on
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .then (record) ->
        expect(record.raw.type).toBe z.event.Backend.CONVERSATION.MEMBER_JOIN
        done()
      .catch done.fail

    it 'accepts plain member leave events', (done) ->
      # @formatter:off
      event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:56.363Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"9.800122000b3d69bc","type":"conversation.member-leave"}
      # @formatter:on
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .then (record) ->
        expect(record.raw.type).toBe z.event.Backend.CONVERSATION.MEMBER_LEAVE
        done()
      .catch done.fail

    it 'accepts plain missed calls events', (done) ->
      # @formatter:off
      event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:09:28.294Z","data":{"reason":"missed"},"from":"0410795a-58dc-40d8-b216-cbc2360be21a","id":"16.800122000b3d4ade","type":"conversation.voice-channel-deactivate"}
      # @formatter:on
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .then (record) ->
        expect(record.raw.type).toBe z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
        done()
      .catch done.fail

    it 'accepts plain decryption error events', (done) ->
      # @formatter:off
      event = {"conversation":"7f0939c8-dbd9-48f5-839e-b0ebcfffec8c","id":"f518d6ff-19d3-48a0-b0c1-cc71c6e81136","type":"conversation.unable-to-decrypt","from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2016-08-09T12:58:49.485Z","error":"Offset is outside the bounds of the DataView (17cd13b4b2a3a98)","error_code":"1778 (17cd13b4b2a3a98)"}
      # @formatter:on
      source = z.event.EventRepository::NOTIFICATION_SOURCE.SOCKET

      event_repository._handle_event event, source
      .then (record) ->
        expect(record.raw.type).toBe z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
        done()
      .catch done.fail
