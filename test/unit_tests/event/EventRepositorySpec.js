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

describe('Event Repository', () => {
  const test_factory = new TestFactory();
  let last_notification_id = undefined;

  const websocket_service_mock = (() => {
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

  beforeEach((done) => {
    test_factory.exposeEventActors()
      .then((event_repository) => {
        event_repository.web_socket_service = websocket_service_mock;

        last_notification_id = undefined;
        done();
      })
      .catch(done.fail);
  });

  describe('update_from_stream', () => {
    beforeEach(() => {
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

    it('should fetch last notifications ID from backend if not found in storage', (done) => {
      const missed_events_spy = jasmine.createSpy();
      amplify.unsubscribeAll(z.event.WebApp.CONVERSATION.MISSED_EVENTS);
      amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, missed_events_spy);

      TestFactory.event_repository.connect_web_socket();
      TestFactory.event_repository.initialize_from_stream()
        .then(() => {
          expect(TestFactory.notification_service.get_last_notification_id_from_db).toHaveBeenCalled();
          expect(TestFactory.notification_service.get_notifications_last).toHaveBeenCalled();
          expect(TestFactory.notification_service.get_notifications).toHaveBeenCalled();
          expect(missed_events_spy).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should buffer notifications when notification stream is not processed', () => {
      last_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.connect_web_socket();
      websocket_service_mock.publish({id: z.util.create_random_uuid(), payload: []});
      expect(TestFactory.event_repository._buffer_web_socket_notification).toHaveBeenCalled();
      expect(TestFactory.event_repository._handle_notification).not.toHaveBeenCalled();
      expect(TestFactory.event_repository.notification_handling_state()).toBe(z.event.NOTIFICATION_HANDLING_STATE.STREAM);
      expect(TestFactory.event_repository.web_socket_buffer.length).toBe(1);
    });

    it('should handle buffered notifications after notifications stream was processed', (done) => {
      last_notification_id = z.util.create_random_uuid();
      const last_published_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.last_notification_id(last_notification_id);
      TestFactory.event_repository.connect_web_socket();
      websocket_service_mock.publish({id: z.util.create_random_uuid(), payload: []});

      websocket_service_mock.publish({id: last_published_notification_id, payload: []});
      TestFactory.event_repository.initialize_from_stream()
        .then(() => {
          expect(TestFactory.event_repository._handle_buffered_notifications).toHaveBeenCalled();
          expect(TestFactory.event_repository.web_socket_buffer.length).toBe(0);
          expect(TestFactory.event_repository.last_notification_id()).toBe(last_published_notification_id);
          expect(TestFactory.event_repository.notification_handling_state()).toBe(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_handle_notification', () => {
    last_notification_id = undefined;

    beforeEach(() => {
      last_notification_id = z.util.create_random_uuid();
      TestFactory.event_repository.last_notification_id(last_notification_id);
    });

    it('should not update last notification id if transient is true', (done) => {
      const notification_payload = {id: z.util.create_random_uuid(), payload: [], transient: true};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(last_notification_id);
          done();
        });
    });

    it('should update last notification id if transient is false', (done) => {
      const notification_payload = {id: z.util.create_random_uuid(), payload: [], transient: false};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(notification_payload.id);
          done();
        });
    });

    it('should update last notification id if transient is not present', (done) => {
      const notification_payload = {id: z.util.create_random_uuid(), payload: []};

      TestFactory.event_repository._handle_notification(notification_payload)
        .then(() => {
          expect(TestFactory.event_repository.last_notification_id()).toBe(notification_payload.id);
          done();
        });
    });
  });

  describe('_handle_event', () => {
    beforeEach(() => {
      TestFactory.event_repository.notification_handling_state(z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
      spyOn(TestFactory.event_repository.conversation_service, 'save_event').and.returnValue(Promise.resolve({data: 'dummy content'}));
      spyOn(TestFactory.event_repository, '_distribute_event');
    });

    it('should not save but distribute "user.*" events', (done) => {
      TestFactory.event_repository._handle_event({type: z.event.Backend.USER.UPDATE})
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should not save but distribute "call.*" events', (done) => {
      TestFactory.event_repository._handle_event({type: z.event.Client.CALL.E_CALL})
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('should not save but distribute "conversation.create" events', (done) => {
      TestFactory.event_repository._handle_event({type: z.event.Backend.CONVERSATION.CREATE})
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.rename events', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T11:57:37.498Z","data":{"name":"Renamed"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"7.800122000b2f7cca","type":"conversation.rename"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.member-join events', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:14.688Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"8.800122000b2f7d20","type":"conversation.member-join"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.member-leave events', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:01:56.363Z","data":{"user_ids":["e47bfafa-03dc-43ed-aadb-ad6c4d9f3d86"]},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"9.800122000b3d69bc","type":"conversation.member-leave"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts conversation.voice-channel-deactivate (missed call) events', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"64dcb45f-bf8d-4eac-a263-649a60d69305","time":"2016-08-09T12:09:28.294Z","data":{"reason":"missed"},"from":"0410795a-58dc-40d8-b216-cbc2360be21a","id":"16.800122000b3d4ade","type":"conversation.voice-channel-deactivate"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('accepts plain decryption error events', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"7f0939c8-dbd9-48f5-839e-b0ebcfffec8c","id":"f518d6ff-19d3-48a0-b0c1-cc71c6e81136","type":"conversation.unable-to-decrypt","from":"532af01e-1e24-4366-aacf-33b67d4ee376","time":"2016-08-09T12:58:49.485Z","error":"Offset is outside the bounds of the DataView (17cd13b4b2a3a98)","error_code":"1778 (17cd13b4b2a3a98)"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      TestFactory.event_repository._handle_event(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          expect(TestFactory.event_repository._distribute_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_handle_event_saving', () => {
    let event = undefined;
    let previously_stored_event = undefined;

    beforeEach(() => {
      event = {
        conversation: z.util.create_random_uuid(),
        data: {
          content: 'Lorem Ipsum',
          previews: [],
        },
        from: z.util.create_random_uuid(),
        id: z.util.create_random_uuid(),
        time: new Date().toISOString(),
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      spyOn(TestFactory.event_repository.conversation_service, 'save_event').and.callFake((saved_event) => Promise.resolve(saved_event));
    });

    it('saves an event with a previously not used ID', (done) => {
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve());

      TestFactory.event_repository._handle_event_saving(event)
        .then(() => {
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });

    it('ignores an event with an ID previously used by another user', (done) => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.from = z.util.create_random_uuid();
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('ignores a non-"text message" with an ID previously used by the same user', (done) => {
      event.type = z.event.Client.CALL.E_CALL;
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user for a non-"text message"', (done) => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      previously_stored_event.type = z.event.Client.CALL.E_CALL;
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('ignores a plain text message with an ID previously used by the same user', (done) => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message with link preview', (done) => {
      event.data.previews.push(1);
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', (done) => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      event.data.previews.push(1);
      event.data.content = 'Ipsum loren';

      TestFactory.event_repository._handle_event_saving(event)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          expect(TestFactory.event_repository.conversation_service.save_event).not.toHaveBeenCalled();
          done();
        });
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', (done) => {
      previously_stored_event = JSON.parse(JSON.stringify(event));
      spyOn(TestFactory.event_repository.conversation_service, 'load_event_from_db').and.returnValue(Promise.resolve(previously_stored_event));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      TestFactory.event_repository._handle_event_saving(event)
        .then((saved_event) => {
          expect(saved_event.time).toEqual(initial_time);
          expect(saved_event.time).not.toEqual(changed_time);
          expect(TestFactory.event_repository.conversation_service.save_event).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);
    });
  });

  describe('_handle_event_validation', () => {
    it('ignores "conversation.typing" events', (done) => {
      TestFactory.event_repository._handle_event_validation({type: z.event.Backend.CONVERSATION.TYPING})
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          done();
        });
    });

    it('skips outdated events arriving via notification stream', (done) => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const event = {"conversation":"9fe8b359-b9e0-4624-b63c-71747664e4fa","time":"2016-08-05T16:18:41.820Z","data":{"content":"Hello","nonce":"1cea64c5-afbe-4c9d-b7d0-c49aa3b0a53d"},"from":"532af01e-1e24-4366-aacf-33b67d4ee376","id":"74f.800122000b2d7182","type":"conversation.message-add"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      TestFactory.event_repository.last_event_date('2017-08-05T16:18:41.820Z');

      TestFactory.event_repository._handle_event_validation(event, z.event.EventRepository.SOURCE.STREAM)
        .then(done.fail)
        .catch((error) => {
          expect(error).toEqual(jasmine.any(z.event.EventError));
          expect(error.type).toBe(z.event.EventError.TYPE.VALIDATION_FAILED);
          done();
        });
    });
  });
});
