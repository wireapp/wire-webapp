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

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {ConversationError} from 'src/script/error/ConversationError';
import {StorageError} from 'src/script/error/StorageError';
import {MessageCategory} from 'src/script/message/MessageCategory';
import {createUuid} from 'Util/uuid';

import {TestFactory} from '../../helper/TestFactory';

const testEventServiceClass = (testedServiceName, className) => {
  // eslint-disable-next-line jest/valid-title
  describe(className, () => {
    const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
    const senderId = '8b497692-7a38-4a5d-8287-e3d1006577d6';

    const testFactory = new TestFactory();
    const eventStoreName = StorageSchemata.OBJECT_STORE.EVENTS;

    beforeEach(() => testFactory.exposeEventActors());

    describe('loadEvent', () => {
      /* eslint-disable  quotes */
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
      /* eslint-enable comma-spacing, key-spacing, quotes */

      beforeEach(() => {
        // feed database before each test
        return Promise.all(events.map(message => testFactory.storage_service.save(eventStoreName, undefined, message)));
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('throws an error if parameters are missing', () => {
        const eventService = testFactory[testedServiceName];
        const params = [
          [undefined, undefined],
          ['conv-id', undefined],
          [undefined, 'event-id'],
        ];
        const promises = params.map(args => {
          return eventService
            .loadEvent(...args)
            .then(() => fail('should have thrown'))
            .catch(() => {});
        });
        return Promise.all(promises);
      });

      it('returns mapped message entity if event with id is found', () => {
        return testFactory[testedServiceName].loadEvent(conversationId, events[1].id).then(messageEntity => {
          expect(messageEntity).toEqual(events[1]);
        });
      });

      it('returns undefined if no event with id is found', () => {
        return testFactory[testedServiceName].loadEvent(conversationId, createUuid()).then(messageEntity => {
          expect(messageEntity).not.toBeDefined();
        });
      });
    });

    describe('loadPrecedingEvents', () => {
      let messages = undefined;

      beforeEach(() => {
        const timestamp = 1479903546799;
        messages = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => ({
          conversation: conversationId,
          time: new Date(timestamp + index).toISOString(),
        }));

        return Promise.all(
          messages.map(message => testFactory.storage_service.save(eventStoreName, undefined, message)),
        );
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it("doesn't load events for invalid conversation id", () => {
        return testFactory[testedServiceName]
          .loadPrecedingEvents('invalid_id', new Date(30), new Date(1479903546808))
          .then(events => {
            expect(events.length).toBe(0);
          });
      });

      it('loads all events', () => {
        return testFactory[testedServiceName].loadPrecedingEvents(conversationId).then(events => {
          expect(events.length).toBe(10);
          expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
          expect(events[9].time).toBe('2016-11-23T12:19:06.799Z');
        });
      });

      it('loads all events with limit', () => {
        return testFactory[testedServiceName]
          .loadPrecedingEvents(conversationId, undefined, undefined, 5)
          .then(events => {
            expect(events.length).toBe(5);
            expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
            expect(events[4].time).toBe('2016-11-23T12:19:06.804Z');
          });
      });

      it('loads events with lower bound', () => {
        return testFactory[testedServiceName]
          .loadPrecedingEvents(conversationId, new Date(1479903546805))
          .then(events => {
            expect(events.length).toBe(4);
            expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
            expect(events[1].time).toBe('2016-11-23T12:19:06.807Z');
            expect(events[2].time).toBe('2016-11-23T12:19:06.806Z');
            expect(events[3].time).toBe('2016-11-23T12:19:06.805Z');
          });
      });

      it('loads events with upper bound', () => {
        return testFactory[testedServiceName]
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
        return testFactory[testedServiceName]
          .loadPrecedingEvents(conversationId, new Date(1479903546806), new Date(1479903546807))
          .then(events => {
            expect(events.length).toBe(1);
            expect(events[0].time).toBe('2016-11-23T12:19:06.806Z');
          });
      });

      it('loads events with upper and lower bound and a fetch limit', () => {
        return testFactory[testedServiceName]
          .loadPrecedingEvents(conversationId, new Date(1479903546800), new Date(1479903546807), 2)
          .then(events => {
            expect(events.length).toBe(2);
            expect(events[0].time).toBe('2016-11-23T12:19:06.806Z');
            expect(events[1].time).toBe('2016-11-23T12:19:06.805Z');
          });
      });
    });

    describe('loadFollowingEvents', () => {
      let events = undefined;

      beforeEach(() => {
        const timestamp = new Date('2016-11-23T12:19:06.808Z').getTime();
        events = [0, 1, 2, 3, 4, 5, 7, 6, 8, 9].map(index => ({
          conversation: conversationId,
          from: '123',
          time: new Date(timestamp + index).toISOString(),
        }));

        return Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('fails if the upperbound is not a Date', async () => {
        await expect(
          testFactory[testedServiceName].loadFollowingEvents(conversationId, 'not a date', 2, false),
        ).rejects.toThrow("must be of type 'Date'");
      });

      it('accepts timestamps in the future', () => {
        const futureTimestamp = Date.now() + 1000;
        return testFactory[testedServiceName].loadFollowingEvents(conversationId, new Date(futureTimestamp), 1);
      });

      it('loads all events matching parameters', () => {
        const tests = [
          {args: [new Date('2016-11-23T12:19:06.808Z'), 1], expectedEvents: events.slice(0, 1)},
          {args: [new Date('2016-11-23T12:19:06.808Z'), 2, false], expectedEvents: events.slice(1, 3)},
          {args: [new Date('2016-11-23T12:19:06.808Z'), 3], expectedEvents: events.slice(0, 3)},
          {args: [new Date('2016-11-23T12:19:06.816Z'), 1000], expectedEvents: events.slice(8, 10)},
          {
            args: [new Date('2016-11-23T12:19:06.808Z'), 1000],
            expectedEvents: events.slice(0, 6).concat([events[7], events[6]]).concat(events.slice(8)),
          },
        ];

        const testPromises = tests.map(({args, expectedEvents}) => {
          return testFactory[testedServiceName].loadFollowingEvents(...[conversationId].concat(args)).then(_events => {
            expect(_events).toEqual(expectedEvents);
          });
        });

        return Promise.all(testPromises);
      });
    });

    describe('loadEventsWithCategory', () => {
      /* eslint-disable comma-spacing, key-spacing,  quotes */
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
      /* eslint-enable comma-spacing, key-spacing,  quotes */

      beforeEach(() => {
        return Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('should return no entry matches the given category', () => {
        return testFactory[testedServiceName]
          .loadEventsWithCategory(events[0].conversation, MessageCategory.VIDEO)
          .then(result => {
            expect(result.length).toBe(0);
          });
      });

      it('should get images in the correct order', () => {
        return testFactory[testedServiceName]
          .loadEventsWithCategory(events[0].conversation, MessageCategory.IMAGE)
          .then(result => {
            expect(result.length).toBe(2);
            expect(result[0].id).toBe(events[1].id);
            expect(result[1].id).toBe(events[2].id);
          });
      });
    });

    describe('saveEvent', () => {
      const newEvent = {
        conversation: conversationId,
        id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
        data: {},
        from: senderId,
        time: '2016-08-04T13:27:58.993Z',
        type: 'conversation.message-add',
      };
      const categorizedEvent = {...newEvent, category: MessageCategory.TEXT};

      it('save event in the database', () => {
        spyOn(testFactory.storage_service, 'save').and.callFake(event => Promise.resolve(event));

        return testFactory[testedServiceName].saveEvent(newEvent).then(event => {
          expect(event.category).toBeDefined();
          expect(testFactory.storage_service.save).toHaveBeenCalledWith(eventStoreName, undefined, categorizedEvent);
        });
      });
    });

    describe('replaceEvent', () => {
      const updatedEvent = {
        conversation: conversationId,
        id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
        from: senderId,
        time: '2016-08-04T13:27:58.993Z',
        data: {content: 'Second message', previews: []},
        type: 'conversation.message-add',
        primary_key: 12,
      };

      it('updates an event in the database', () => {
        spyOn(testFactory.storage_service, 'update').and.callFake(event => Promise.resolve(event));

        return testFactory[testedServiceName].replaceEvent(updatedEvent).then(event => {
          expect(testFactory.storage_service.update).toHaveBeenCalledWith(eventStoreName, 12, event);
        });
      });
    });

    describe('updateEventAsUploadFailed', () => {
      it("doesn't do anything if initial event is not found", () => {
        spyOn(testFactory.storage_service, 'load').and.returnValue(Promise.resolve(undefined));
        const updateSpy = spyOn(testFactory.storage_service, 'update');
        return testFactory.event_service.updateEventAsUploadFailed(12, {}).then(() => {
          expect(updateSpy).not.toHaveBeenCalled();
        });
      });

      it('sets asset data and update event', () => {
        const initialEvent = {
          id: 'event-id',
          data: {content: ''},
          type: 'conversation.asset-add',
        };
        const reason = AssetTransferState.UPLOAD_FAILED;
        spyOn(testFactory.storage_service, 'load').and.returnValue(Promise.resolve(initialEvent));
        const updateSpy = spyOn(testFactory.storage_service, 'update').and.callFake(
          (storeName, primaryKey, updates) => {
            expect(updates.data.reason).toEqual(reason);
            expect(updates.data.status).toEqual(AssetTransferState.UPLOAD_FAILED);
            expect(updates.data.content).toEqual(initialEvent.data.content);
            return Promise.resolve(undefined);
          },
        );
        return testFactory.event_service.updateEventAsUploadFailed(12, reason).then(() => {
          expect(updateSpy).toHaveBeenCalled();
        });
      });
    });

    describe('updateEventSequentially', () => {
      it('fails if changes do not contain version property', () => {
        const updates = {reactions: ['user-id']};
        return testFactory[testedServiceName]
          .updateEventSequentially({primary_key: 12, ...updates})
          .then(fail)
          .catch(error => {
            expect(error.type).toBe(ConversationError.TYPE.WRONG_CHANGE);
          });
      });

      it('fails if version is not sequential', () => {
        const updates = {reactions: ['user-id'], version: 1};

        spyOn(testFactory.storage_service, 'load').and.returnValue(Promise.resolve({version: 2}));

        return testFactory[testedServiceName]
          .updateEventSequentially({primary_key: 12, ...updates})
          .then(fail)
          .catch(error => {
            expect(error.type).toBe(StorageError.TYPE.NON_SEQUENTIAL_UPDATE);
          });
      });

      it('fails if record is not found', () => {
        const updates = {reactions: ['user-id'], version: 2};

        spyOn(testFactory.storage_service, 'load').and.returnValue(Promise.resolve(undefined));
        spyOn(testFactory.storage_service, 'update').and.returnValue(Promise.resolve('ok'));

        return testFactory[testedServiceName]
          .updateEventSequentially({primary_key: 12, ...updates})
          .then(fail)
          .catch(error => {
            expect(error.type).toBe(StorageError.TYPE.NOT_FOUND);
          });
      });

      it('updates message in DB', () => {
        const updates = {reactions: ['user-id'], version: 2};

        spyOn(testFactory.storage_service, 'load').and.returnValue(Promise.resolve({version: 1}));
        spyOn(testFactory.storage_service, 'update').and.returnValue(Promise.resolve('ok'));
        spyOn(testFactory.storage_service.db, 'transaction').and.callThrough();

        return testFactory[testedServiceName].updateEventSequentially({primary_key: 12, ...updates}).then(() => {
          expect(testFactory.storage_service.update).toHaveBeenCalledWith(eventStoreName, 12, updates);
          expect(testFactory.storage_service.db.transaction).toHaveBeenCalled();
        });
      });
    });

    describe('deleteEvent', () => {
      const otherConversationId = 'other-conversation-id';

      const mainConversationEvents = [
        {conversation: conversationId, id: 'first', time: '2016-08-04T13:27:55.182Z'},
        {conversation: conversationId, id: 'second', time: '2016-08-04T13:27:55.182Z'},
        {conversation: conversationId, id: 'third', time: '2016-08-04T13:27:55.182Z'},
      ];
      const otherConversationEvents = [
        {conversation: otherConversationId, id: 'first', time: '2016-08-04T13:27:55.182Z'},
        {conversation: otherConversationId, id: 'second', time: '2016-08-04T13:27:55.182Z'},
      ];
      const events = mainConversationEvents.concat(otherConversationEvents);

      beforeEach(() => {
        return Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('deletes event with the given id in the given conversation', () => {
        const eventService = testFactory[testedServiceName];

        return eventService
          .deleteEvent(conversationId, events[0].id)
          .then(() => eventService.loadPrecedingEvents(conversationId))
          .then(newEvents => {
            expect(newEvents.length).toBe(mainConversationEvents.length - 1);
          });
      });

      it("doesn't delete event with the same id in different conversations", () => {
        const eventService = testFactory[testedServiceName];

        return eventService
          .deleteEvent(conversationId, events[0].id)
          .then(() => eventService.loadPrecedingEvents(conversationId))
          .then(newEvents => {
            expect(newEvents.length).toBe(mainConversationEvents.length - 1);
          })
          .then(() => eventService.loadPrecedingEvents('other-conversation-id'))
          .then(otherEvents => {
            expect(otherEvents.length).toBe(otherConversationEvents.length);
          });
      });
    });

    describe('deleteEvents', () => {
      const events = [
        {conversation: conversationId, id: 'first', time: '2016-08-04T13:27:55.182Z'},
        {conversation: conversationId, id: 'second', time: '2016-08-04T13:27:56.182Z'},
        {conversation: conversationId, id: 'third', time: '2016-08-04T13:27:57.182Z'},
        {conversation: 'other-conversation-id', id: 'first', time: '2016-08-04T13:27:55.182Z'},
      ];

      beforeEach(() => {
        return Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('deletes all events from a conversation if no timestamp is given', () => {
        const eventService = testFactory[testedServiceName];

        return eventService
          .deleteEvents(conversationId)
          .then(() => eventService.loadPrecedingEvents(conversationId))
          .then(newEvents => {
            expect(newEvents.length).toBe(0);
          });
      });

      it('deletes events according to the given timestamp', () => {
        const eventService = testFactory[testedServiceName];

        return eventService
          .deleteEvents(conversationId, '2016-08-04T13:27:56.182Z')
          .then(() => eventService.loadPrecedingEvents(conversationId))
          .then(newEvents => {
            expect(newEvents.length).toBe(1);
          });
      });
    });

    describe('loadAllConversationEvents', () => {
      const conversationId = {id: 'conversation-id', domain: 'conversation-domain'};
      const otherConversationId = {id: 'other-conversation-id', domain: 'other-conversation-domain'};

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('Loads all the events by conversation id', async () => {
        const numberOfConversationEvents = 3;
        const numberOfOtherConversationEvents = 1;

        const conversationEvents = Array.from({length: numberOfConversationEvents}, () => ({
          conversation: conversationId.id,
          qualified_conversation: conversationId,
          id: createUuid(),
          time: '2016-08-04T13:27:55.182Z',
        }));

        const otherConversationEvents = Array.from({length: numberOfOtherConversationEvents}, () => ({
          conversation: otherConversationId.id,
          qualified_conversation: otherConversationId,
          id: createUuid(),
          time: '2016-08-04T13:27:55.182Z',
        }));

        const events = [...conversationEvents, ...otherConversationEvents];

        Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));

        const eventService = testFactory[testedServiceName];

        const foundConversationEvents = await eventService.loadAllConversationEvents(conversationId.id);

        expect(foundConversationEvents.length).toBe(numberOfConversationEvents);
      });

      it('Skips types of events included in the skip array', async () => {
        const numberOfConversationEvents = 3;
        const skipTypes = ['conversation.message-add'];
        const numberOfEventsToSkip = 2;

        const conversationEvents = Array.from({length: numberOfConversationEvents}, () => ({
          conversation: conversationId.id,
          qualified_conversation: conversationId,
          id: createUuid(),
          time: '2016-08-04T13:27:55.182Z',
        }));

        const conversationEventsToSkip = Array.from({length: numberOfEventsToSkip}, () => ({
          conversation: conversationId.id,
          qualified_conversation: conversationId,
          id: createUuid(),
          time: '2016-08-04T13:27:55.182Z',
          type: skipTypes[0],
        }));

        const events = [...conversationEvents, ...conversationEventsToSkip];

        Promise.all(events.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)));

        const eventService = testFactory[testedServiceName];

        const foundConversationEvents = await eventService.loadAllConversationEvents(conversationId.id, skipTypes);

        expect(foundConversationEvents.length).toBe(numberOfConversationEvents);
      });
    });

    describe('moveEventsToConversation', () => {
      const oldConversationId = {id: 'old-conversation-id', domain: 'old-conversation-domain'};
      const newConversationId = {id: 'new-conversation-id', domain: 'new-conversation-domain'};

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });

      it('Loads all the events by conversation id', async () => {
        const numberOfConversationEvents = 3;

        const conversationEvents = Array.from({length: numberOfConversationEvents}, () => ({
          conversation: oldConversationId.id,
          qualified_conversation: oldConversationId,
          id: createUuid(),
          time: '2016-08-04T13:27:55.182Z',
        }));

        Promise.all(
          conversationEvents.map(event => testFactory.storage_service.save(eventStoreName, undefined, event)),
        );

        const eventService = testFactory[testedServiceName];

        const loadedOldConversationEvents = await eventService.loadAllConversationEvents(oldConversationId.id);
        const loadedNewConversationEvents = await eventService.loadAllConversationEvents(newConversationId.id);
        expect(loadedOldConversationEvents.length).toBe(numberOfConversationEvents);
        expect(loadedNewConversationEvents.length).toBe(0);

        await eventService.moveEventsToConversation(oldConversationId, newConversationId);

        const loadedOldConversationEventsAfterMove = await eventService.loadAllConversationEvents(oldConversationId.id);
        const loadedNewConversationEventsAfterMove = await eventService.loadAllConversationEvents(newConversationId.id);
        expect(loadedOldConversationEventsAfterMove.length).toBe(0);
        expect(loadedNewConversationEventsAfterMove.length).toBe(numberOfConversationEvents);
      });
    });

    describe('deleteEventByKey', () => {
      let primary_keys = undefined;

      const messages = [
        {
          conversation: conversationId,
          id: '68a28ab1-d7f8-4014-8b52-5e99a05ea3b1',
          from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
          time: '2016-08-04T13:27:55.182Z',
          data: {content: 'First message', nonce: '68a28ab1-d7f8-4014-8b52-5e99a05ea3b1', previews: []},
          type: 'conversation.message-add',
        },
        {
          conversation: conversationId,
          id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
          from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
          time: '2016-08-04T13:27:58.993Z',
          data: {content: 'Second message', nonce: '4af67f76-09f9-4831-b3a4-9df877b8c29a', previews: []},
          type: 'conversation.message-add',
        },
        {
          conversation: conversationId,
          id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
          from: '8b497692-7a38-4a5d-8287-e3d1006577d6',
          time: '2016-08-04T13:27:58.993Z',
          data: {content: 'Second message (Duplicate)', nonce: '4af67f76-09f9-4831-b3a4-9df877b8c29a', previews: []},
          type: 'conversation.message-add',
        },
      ];

      beforeEach(async () => {
        const ids = await Promise.all(
          messages.map(message => testFactory.storage_service.save(eventStoreName, undefined, message)),
        );
        primary_keys = ids;
      });

      afterEach(() => {
        testFactory.storage_service.clearStores();
      });
    });

    describe('updateEvent', () => {
      /* eslint-disable comma-spacing, key-spacing,  quotes */
      const messageEntity = {
        conversation: conversationId,
        id: '4af67f76-09f9-4831-b3a4-9df877b8c29a',
        from: senderId,
        time: '2016-08-04T13:27:58.993Z',
        data: {content: 'Second message', previews: []},
        type: 'conversation.message-add',
      };
      /* eslint-enable comma-spacing, key-spacing,  quotes */

      it('updated event in the database', () => {
        spyOn(testFactory[testedServiceName], 'replaceEvent').and.returnValue(Promise.resolve());

        messageEntity.time = new Date().toISOString();
        messageEntity.primary_key = 1337;
        return testFactory[testedServiceName]
          .updateEvent(messageEntity.primary_key, {time: messageEntity.time})
          .then(() => {
            expect(testFactory[testedServiceName].replaceEvent).toHaveBeenCalled();
          });
      });

      it('fails if changes are not specified', () => {
        return testFactory[testedServiceName]
          .updateEvent(12, undefined)
          .then(() => fail('should have thrown'))
          .catch(error => {
            expect(error).toEqual(jasmine.any(ConversationError));
            expect(error.type).toBe(ConversationError.TYPE.NO_CHANGES);
          });
      });
    });
  });
};

// eslint-disable-next-line jest/no-export
export {testEventServiceClass};
