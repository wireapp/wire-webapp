/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

// grunt test_init && grunt test_run:event/EventRepository

'use strict';

describe('Event Repository', function() {
  const test_factory = new TestFactory();
  let last_notification_id = undefined;

  const websocket_service_mock = (function() {
    let websocket_handler = null;

    return {
      connect(handler) {
        return websocket_handler = handler;
      },

      publish(payload) {
        return websocket_handler(payload);
      },
    };
  })();

  beforeEach(function(done) {
    test_factory.exposeEventActors()
      .then(function(event_repository) {
        event_repository.web_socket_service = websocket_service_mock;

        last_notification_id = undefined;
        done();
      })
      .catch(done.fail);
  });

  describe('update_from_stream', function() {
    beforeEach(function() {
      spyOn(TestFactory.event_repository, '_handle_notification').and.callThrough();
      spyOn(TestFactory.event_repository, '_buffer_web_socket_notification').and.callThrough();
      spyOn(TestFactory.event_repository, '_handle_buffered_notifications').and.callThrough();
      spyOn(TestFactory.event_repository, '_handle_event');
      spyOn(TestFactory.event_repository, '_distribute_event');

      spyOn(TestFactory.notification_service, 'get_notifications')
        .and.callFake(() => {
          return new Promise((resolve) => {
            window.setTimeout(() => {
              resolve({
                has_more: false,
                notifications: [
                  {id: z.util.create_random_uuid(), payload: []},
                  {id: z.util.create_random_uuid(), payload: []},
                ],
              });
            }, 10);
          });
        });

      spyOn(TestFactory.notification_service, 'get_notifications_last')
        .and.returnValue(Promise.resolve({id: z.util.create_random_uuid(), payload: []}));

      spyOn(TestFactory.notification_service, 'get_last_notification_id_from_db')
        .and.callFake(() => {
          if (last_notification_id) {
            return Promise.resolve(last_notification_id);
          }
          return Promise.reject(new z.event.EventError(z.event.EventError.TYPE.NO_LAST_ID));
        });

      spyOn(TestFactory.notification_service, 'save_last_notification_id_to_db')
        .and.returnValue(Promise.resolve(z.event.NotificationService.prototype.PRIMARY_KEY_LAST_NOTIFICATION));
    });

    it('should fetch last notifications ID from backend if not found in storage', function(done) {
      const missed_events_spy = jasmine.createSpy();
      amplify.unsubscribeAll(z.event.WebApp.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, missed_events_spy);

      TestFactory.event_repository.connect_web_socket();
      TestFactory.event_repository.initialize_from_stream()
        .then(function() {
          expect(TestFactory.notification_service.get_last_notification_id_from_db).toHaveBeenCalled();
          expect(TestFactory.notification_service.get_notifications_last).toHaveBeenCalled();
          expect(TestFactory.notification_service.get_notifications).toHaveBeenCalled();
          expect(missed_events_spy).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should buffer notifications when notification stream is not processed', function() {
      last_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.connect_web_socket();
      websocket_service_mock.publish({id: z.util.create_random_uuid(), payload: []});
      expect(TestFactory.event_repository._buffer_web_socket_notification).toHaveBeenCalled();
      expect(TestFactory.event_repository._handle_notification).not.toHaveBeenCalled();
      expect(TestFactory.event_repository.notification_handling_state()).toBe(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
      expect(TestFactory.event_repository.web_socket_buffer.length).toBe(1);
    });

    it('should handle buffered notifications after notifications stream was processed', function(done) {
      last_notification_id = z.util.create_random_uuid();
      const last_published_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.last_notification_id(last_notification_id);
      TestFactory.event_repository.connect_web_socket();
      websocket_service_mock.publish({id: z.util.create_random_uuid(), payload: []});

      websocket_service_mock.publish({id: last_published_notification_id, payload: []});
      TestFactory.event_repository.initialize_from_stream()
        .then(function() {
          expect(TestFactory.event_repository._handle_buffered_notifications).toHaveBeenCalled();
          expect(TestFactory.event_repository.web_socket_buffer.length).toBe(0);
          expect(TestFactory.event_repository.last_notification_id()).toBe(last_published_notification_id);
          expect(TestFactory.event_repository.notification_handling_state()).toBe(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_handle_notification', function() {
    last_notification_id = undefined;

    beforeEach(function() {
      last_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.last_notification_id(last_notification_id);
    });

    it('should not update last notification id if transient is true', function(done) {
      const notification_payload = {id: z.util.create_random_uuid(), payload: [], transient: true};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(last_notification_id);
          done();
        });
    });

    it('should update last notification id if transient is false', function(done) {
      const notification_payload = {id: z.util.create_random_uuid(), payload: [], transient: false};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(notification_payload.id);
          done();
        });
    });

    it('should update last notification id if transient is not present', function(done) {
      const notification_payload = {id: z.util.create_random_uuid(), payload: []};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(notification_payload.id);
          done();
        });
    });
  });

  describe('_handle_event', function() {
    beforeEach(function() {
      TestFactory.event_repository.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn(TestFactory.event_repository.conversation_service, 'save_event').and.returnValue(Promise.resolve({data: 'dummy content'}));
      spyOn(TestFactory.event_repository, '_distribute_event');
    });

    it('should not save but distribute user events', function(done) {
      TestFactory.event_repository._handle_event({type: z.event.Backend.USER.UPDATE})
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should not save but distribute call events', function(done) {
      TestFactory.event_repository._handle_event({type: z.event.Backend.CALL.FLOW_ACTIVE})
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should not save but distribute conversation.create event', function(done) {
      TestFactory.event_repository._handle_event({type: z.event.Backend.CONVERSATION.CREATE})
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('skips outdated "conversation.message-add" events arriving', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function(result) {
          expect(result).toBeTruthy();
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('skips outdated "conversation.asset-add" events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"data":{"data":"/9j/4AAQSkZJRgABAQAAAQABAAD/.../Z","content_type":"image/jpeg","id":"01c86ab7-4d38-4a4e-8e7e-e6d73a3c2b94","content_length":1218,"info":{"original_width":1094,"public":true,"width":49,"correlation_id":"48aa1bd4-fbb1-4cdc-bbbc-7160dc4d032e","original_height":1919,"tag":"preview","nonce":"48aa1bd4-fbb1-4cdc-bbbc-7160dc4d032e","height":86}},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2015-12-18T11:15:00.201Z","id":"ae8.800122000b259e4e","type":"conversation.asset-add","conversation":"5aeafc6d-2a2d-4105-bc87-41cc8b72774a"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function(result) {
          expect(result).toBeTruthy();
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('skips outdated "conversation.knock" events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"data":{"nonce":"33a16765-2b23-42a1-b1cc-414d1baa9095"},"from":"d794bf14-96a0-43e9-be95-ae761d1acb4e","time":"2015-12-21T10:14:59.661Z","id":"a2b.800122000ad94450","type":"conversation.knock","conversation":"872eaa34-9673-44af-abaa-e1b6979a7cff"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function(result) {
          expect(result).toBeTruthy();
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('skips outdated events arriving via notification stream', function(done) {
      TestFactory.event_repository.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function(result) {
          expect(result).toBeTruthy();
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).not.toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.rename events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T11:57:37.498Z","data":{"name":"Renamed"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"7.800122000b2f7cca","type":"conversation.rename"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.member-join events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:14.688Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"8.800122000b2f7d20","type":"conversation.member-join"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.member-leave events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:56.363Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"9.800122000b3d69bc","type":"conversation.member-leave"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.voice-channel-deactivate (missed call) events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:09:28.294Z","data":{"reason":"missed"},"from":"0410795a-58dc-40d8-b216-cbc2360be21a","id":"16.800122000b3d4ade","type":"conversation.voice-channel-deactivate"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts plain decryption error events', function(done) {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"7f0939c8-dbd9-48f5-839e-b0ebcfffec8c","id":"f518d6ff-19d3-48a0-b0c1-cc71c6e81136","type":"conversation.unable-to-decrypt","from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2016-08-09T12:58:49.485Z","error":"Offset is outside the bounds of the DataView (17cd13b4b2a3a98)","error_code":"1778 (17cd13b4b2a3a98)"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(function() {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });
});
