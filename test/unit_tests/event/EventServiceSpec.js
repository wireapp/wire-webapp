/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:conversation/ConversationService

'use strict';

describe('z.event.EventService', () => {
  const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
  const senderId = '8b497692-7a38-4a5d-8287-e3d1006577d6';

  const test_factory = new TestFactory();
  const eventStoreName = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;

  beforeEach(() => test_factory.exposeEventActors());

  describe('loadEvent', () => {
    /* eslint-disable sort-keys, quotes */
    const events = [
      {
        conversation: conversationId,
        id: '68a28ab1-d7f8-4014-8b52-5e99a05ea3b1',
        from: senderId,
        time: '2016-08-04T13:27:55.182Z',
        data: {content: 'First message', previews: []},
        type: 'conversation.message-add',
      },
      {
        conversation: conversationId,
        id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
        from: senderId,
        time: '2016-08-04T13:27:58.993Z',
        data: {content: 'Second message', previews: []},
        type: 'conversation.message-add',
      },
    ];
    /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

    beforeEach(() => {
      // feed database before each test
      return Promise.all(events.map(message => TestFactory.storage_service.save(eventStoreName, undefined, message)));
    });

    afterEach(() => {
      TestFactory.storage_service.clearStores();
    });

    it('throws an error if parameters are missing', () => {
      const eventService = TestFactory.event_service;
      const params = [[undefined, undefined], ['conv-id', undefined], [undefined, 'event-id']];
      const promises = params.map(args => {
        return eventService
          .loadEvent(...args)
          .then(() => fail('should have thrown'))
          .catch(() => {});
      });
      return Promise.all(promises);
    });

    it('returns mapped message entity if event with id is found', () => {
      return TestFactory.event_service.loadEvent(conversationId, events[1].id).then(messageEntity => {
        expect(messageEntity).toEqual(events[1]);
      });
    });

    it('returns undefined if no event with id is found', () => {
      return TestFactory.event_service.loadEvent(conversationId, z.util.createRandomUuid()).then(messageEntity => {
        expect(messageEntity).not.toBeDefined();
      });
    });
  });

  describe('loadPrecedingEvents', () => {
    let messages = undefined;

    beforeEach(() => {
      const timestamp = 1479903546799;
      messages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => {
        return {
          conversation: conversationId,
          time: new Date(timestamp + index).toISOString(),
        };
      });

      return Promise.all(messages.map(message => TestFactory.storage_service.save(eventStoreName, undefined, message)));
    });

    afterEach(() => {
      TestFactory.storage_service.clearStores();
    });

    it("doesn't load events for invalid conversation id", () => {
      return TestFactory.event_service
        .loadPrecedingEvents('invalid_id', new Date(30), new Date(1479903546808))
        .then(events => {
          expect(events.length).toBe(0);
        });
    });

    it('loads all events', () => {
      return TestFactory.event_service.loadPrecedingEvents(conversationId).then(events => {
        expect(events.length).toBe(10);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[9].time).toBe('2016-11-23T12:19:06.799Z');
      });
    });

    it('loads all events with limit', () => {
      return TestFactory.event_service.loadPrecedingEvents(conversationId, undefined, undefined, 5).then(events => {
        expect(events.length).toBe(5);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[4].time).toBe('2016-11-23T12:19:06.804Z');
      });
    });

    it('loads events with lower bound', () => {
      return TestFactory.event_service.loadPrecedingEvents(conversationId, new Date(1479903546805)).then(events => {
        expect(events.length).toBe(4);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[1].time).toBe('2016-11-23T12:19:06.807Z');
        expect(events[2].time).toBe('2016-11-23T12:19:06.806Z');
        expect(events[3].time).toBe('2016-11-23T12:19:06.805Z');
      });
    });

    it('loads events with upper bound', () => {
      return TestFactory.event_service
        .loadPrecedingEvents(conversationId, undefined, new Date(1479903546803))
        .then(events => {
          expect(events.length).toBe(4);
          expect(events[0].time).toBe('2016-11-23T12:19:06.802Z');
          expect(events[1].time).toBe('2016-11-23T12:19:06.801Z');
          expect(events[2].time).toBe('2016-11-23T12:19:06.800Z');
          expect(events[3].time).toBe('2016-11-23T12:19:06.799Z');
        });
    });

    it('loads events with upper and lower bound', () => {
      return TestFactory.event_service
        .loadPrecedingEvents(conversationId, new Date(1479903546806), new Date(1479903546807))
        .then(events => {
          expect(events.length).toBe(1);
          expect(events[0].time).toBe('2016-11-23T12:19:06.806Z');
        });
    });

    it('loads events with upper and lower bound and a fetch limit', () => {
      return TestFactory.event_service
        .loadPrecedingEvents(conversationId, new Date(1479903546800), new Date(1479903546807), 2)
        .then(events => {
          expect(events.length).toBe(2);
          expect(events[0].time).toBe('2016-11-23T12:19:06.806Z');
          expect(events[1].time).toBe('2016-11-23T12:19:06.805Z');
        });
    });
  });

  describe('loadEventsWithCategory', () => {
    /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
    const events = [
      {
        conversation: conversationId,
        id: 'b6498d81-92e8-4da7-afd2-054239595da7',
        from: senderId,
        time: '2017-01-09T13:11:15.632Z',
        data: {},
        type: 'conversation.message-add',
        category: 16,
      },
      {
        conversation: conversationId,
        id: 'da7930dd-4c30-4378-846d-b29e1452bdfb',
        from: senderId,
        time: '2017-01-09T13:37:31.941Z',
        data: {},
        type: 'conversation.asset-add',
        category: 128,
      },
      {
        conversation: conversationId,
        id: 'da7930dd-4c30-4378-846d-b29e1452bdfa',
        from: senderId,
        time: '2017-01-09T13:47:31.941Z',
        data: {},
        category: 128,
      },
    ];
    /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

    beforeEach(() => {
      return Promise.all(events.map(event => TestFactory.storage_service.save(eventStoreName, undefined, event)));
    });

    afterEach(() => {
      TestFactory.storage_service.clearStores();
    });

    it('should return no entry matches the given category', () => {
      return TestFactory.event_service
        .loadEventsWithCategory(events[0].conversation, z.message.MessageCategory.VIDEO)
        .then(result => {
          expect(result.length).toBe(0);
        });
    });

    it('should get images in the correct order', () => {
      return TestFactory.event_service
        .loadEventsWithCategory(events[0].conversation, z.message.MessageCategory.IMAGE)
        .then(result => {
          expect(result.length).toBe(2);
          expect(result[0].id).toBe(events[1].id);
          expect(result[1].id).toBe(events[2].id);
        });
    });
  });

  describe('saveEvent', () => {
    /* eslint-disable sort-keys*/
    const newEvent = {
      conversation: conversationId,
      id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
      from: senderId,
      time: '2016-08-04T13:27:58.993Z',
      data: {content: 'Second message', previews: []},
      type: 'conversation.message-add',
    };
    /* eslint-enable sort-keys*/

    it('save event in the database', () => {
      spyOn(TestFactory.storage_service, 'save').and.callFake(event => Promise.resolve(event));

      return TestFactory.event_service.saveEvent(newEvent).then(event => {
        expect(event.category).toBeDefined();
        expect(TestFactory.storage_service.save).toHaveBeenCalled();
      });
    });
  });

  describe('updateEvent', () => {
    /* eslint-disable sort-keys*/
    const updatedEvent = {
      conversation: conversationId,
      id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
      from: senderId,
      time: '2016-08-04T13:27:58.993Z',
      data: {content: 'Second message', previews: []},
      type: 'conversation.message-add',
      primary_key: 12,
    };
    /* eslint-enable sort-keys*/

    it('update event in the database', () => {
      spyOn(TestFactory.storage_service, 'update').and.callFake(event => Promise.resolve(event));

      return TestFactory.event_service.updateEvent(updatedEvent).then(event => {
        expect(TestFactory.storage_service.update).toHaveBeenCalledWith(eventStoreName, 12, event);
      });
    });
  });

  describe('updateMessageSequentially', () => {
    it('fails if changes do not contain version property', () => {
      const messageEntity = {id: 'twelve', primary_key: 12};
      const updates = {reactions: ['user-id']};
      return TestFactory.event_service
        .updateMessageSequentially(messageEntity, updates, conversationId)
        .then(fail)
        .catch(error => {
          expect(error.type).toBe(z.conversation.ConversationError.TYPE.WRONG_CHANGE);
        });
    });

    it('fails if version is not sequential', () => {
      const messageEntity = {id: 'twelve', primary_key: 12};
      const updates = {reactions: ['user-id'], version: 1};

      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve({version: 2}));

      return TestFactory.event_service
        .updateMessageSequentially(messageEntity, updates, conversationId)
        .then(fail)
        .catch(error => {
          expect(error.type).toBe(z.storage.StorageError.TYPE.NON_SEQUENTIAL_UPDATE);
        });
    });

    it('fails if record is not found', () => {
      const messageEntity = {id: 'twelve', primary_key: 12};
      const updates = {reactions: ['user-id'], version: 2};

      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve(undefined));
      spyOn(TestFactory.storage_service, 'update').and.returnValue(Promise.resolve('ok'));

      return TestFactory.event_service
        .updateMessageSequentially(messageEntity, updates, conversationId)
        .then(fail)
        .catch(error => {
          expect(error.type).toBe(z.storage.StorageError.TYPE.NOT_FOUND);
        });
    });

    it('updates message in DB', () => {
      const messageEntity = {id: 'twelve', primary_key: 12};
      const updates = {reactions: ['user-id'], version: 2};

      spyOn(TestFactory.event_service, 'loadEvent').and.returnValue(Promise.resolve({version: 1}));
      spyOn(TestFactory.storage_service, 'update').and.returnValue(Promise.resolve('ok'));

      return TestFactory.event_service
        .updateMessageSequentially(messageEntity, updates, conversationId)
        .then(result => {
          expect(TestFactory.storage_service.update).toHaveBeenCalledWith(
            eventStoreName,
            messageEntity.primary_key,
            updates
          );
        });
    });
  });

  describe('updateMessage', () => {
    /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
    const MessageEntity = {
      conversation: conversationId,
      id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
      from: senderId,
      time: '2016-08-04T13:27:58.993Z',
      data: {content: 'Second message', previews: []},
      type: 'conversation.message-add',
    };
    /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

    it('updated event in the database', () => {
      spyOn(TestFactory.event_service, 'updateEvent').and.returnValue(Promise.resolve());

      MessageEntity.time = new Date().toISOString();
      MessageEntity.primary_key = 1337;
      return TestFactory.event_service.updateMessage(MessageEntity, {time: MessageEntity.time}).then(() => {
        expect(TestFactory.event_service.updateEvent).toHaveBeenCalled();
      });
    });

    it('fails if changes are not specified', () => {
      return TestFactory.event_service
        .updateMessage(event, undefined)
        .then(() => fail('should have thrown'))
        .catch(error => {
          expect(error).toEqual(jasmine.any(z.conversation.ConversationError));
          expect(error.type).toBe(z.conversation.ConversationError.TYPE.NO_CHANGES);
        });
    });
  });
});
