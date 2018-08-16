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

// grunt test_init && grunt test_run:conversation/ConversationServiceNoCompound

'use strict';

describe('ConversationServiceNoCompound', () => {
  let eventService = null;
  let storage_service = null;
  const conversationId = '35a9a89d-70dc-4d9e-88a2-4d8758458a6a';
  const test_factory = new TestFactory();
  const eventStoreName = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;

  beforeAll(() => {
    return test_factory.exposeStorageActors().then(() => {
      storage_service = TestFactory.storage_service;
      eventService = new z.event.EventServiceNoCompound(storage_service);
    });
  });

  afterEach(() => {
    return storage_service.clearStores();
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

      return Promise.all(messages.map(message => storage_service.save(eventStoreName, undefined, message)));
    });

    it("doesn't load events for invalid conversation id", () => {
      return eventService.loadPrecedingEvents('invalid_id', new Date(30), new Date(1479903546808)).then(events => {
        expect(events.length).toBe(0);
      });
    });

    it('loads all events', () => {
      return eventService.loadPrecedingEvents(conversationId).then(events => {
        expect(events.length).toBe(10);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[9].time).toBe('2016-11-23T12:19:06.799Z');
      });
    });

    it('loads all events with limit', () => {
      return eventService.loadPrecedingEvents(conversationId, undefined, undefined, 5).then(events => {
        expect(events.length).toBe(5);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[4].time).toBe('2016-11-23T12:19:06.804Z');
      });
    });

    it('loads events with lower bound', () => {
      return eventService.loadPrecedingEvents(conversationId, new Date(1479903546805)).then(events => {
        expect(events.length).toBe(4);
        expect(events[0].time).toBe('2016-11-23T12:19:06.808Z');
        expect(events[1].time).toBe('2016-11-23T12:19:06.807Z');
        expect(events[2].time).toBe('2016-11-23T12:19:06.806Z');
        expect(events[3].time).toBe('2016-11-23T12:19:06.805Z');
      });
    });

    it('loads events with upper bound', () => {
      return eventService.loadPrecedingEvents(conversationId, undefined, new Date(1479903546803)).then(events => {
        expect(events.length).toBe(4);
        expect(events[0].time).toBe('2016-11-23T12:19:06.802Z');
        expect(events[1].time).toBe('2016-11-23T12:19:06.801Z');
        expect(events[2].time).toBe('2016-11-23T12:19:06.800Z');
        expect(events[3].time).toBe('2016-11-23T12:19:06.799Z');
      });
    });

    it('loads events with upper and lower bound', () => {
      return eventService
        .loadPrecedingEvents(conversationId, new Date(1479903546806), new Date(1479903546807))
        .then(events => {
          expect(events.length).toBe(1);
          expect(events[0].time).toBe('2016-11-23T12:19:06.806Z');
        });
    });

    it('loads events with upper and lower bound and a fetch limit', () => {
      return eventService
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
      events = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(index => {
        return {
          conversation: conversationId,
          from: '123',
          time: new Date(timestamp + index).toISOString(),
        };
      });

      return Promise.all(events.map(event => TestFactory.storage_service.save(eventStoreName, undefined, event)));
    });

    afterEach(() => {
      TestFactory.storage_service.clearStores();
    });

    it('fails if the upperbound is not a Date', () => {
      try {
        eventService.loadFollowingEvents(conversationId, 'not a date', 2, false);
        fail('should have thrown');
      } catch (error) {
        expect(error.message).toContain("must be of type 'Date'");
      }
    });

    it('loads all events matching parameters', () => {
      const tests = [
        {args: [new Date('2016-11-23T12:19:06.808Z'), 1], expectedEvents: [events[0]]},
        {args: [new Date('2016-11-23T12:19:06.808Z'), 2, false], expectedEvents: [events[1], events[2]]},
        {args: [new Date('2016-11-23T12:19:06.808Z'), 3], expectedEvents: [events[0], events[1], events[2]]},
        {args: [new Date('2016-11-23T12:19:06.808Z'), 1000], expectedEvents: events},
        {args: [new Date('2016-11-23T12:19:06.816Z'), 1000], expectedEvents: [events[8], events[9]]},
      ];

      const testPromises = tests.map(({args, expectedEvents}) => {
        return eventService.loadFollowingEvents(...[conversationId].concat(args)).then(_events => {
          expect(_events).toEqual(expectedEvents);
        });
      });

      return Promise.all(testPromises);
    });
  });

  describe('loadEventsWithCategory', () => {
    let events = undefined;

    beforeEach(() => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"b6498d81-92e8-4da7-afd2-054239595da7","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:11:15.632Z","status":2,"data":{"content":"test","nonce":"b6498d81-92e8-4da7-afd2-054239595da7","previews":[]},"type":"conversation.message-add","category": 16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"da7930dd-4c30-4378-846d-b29e1452bdfb","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:37:31.941Z","status":1,"data":{"content_length":47527,"content_type":"image/jpeg","id":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d","info":{"tag":"medium","width":1448,"height":905,"nonce":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d"},"otr_key":{},"sha256":{}},"type":"conversation.asset-add","category": 128},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"da7930dd-4c30-4378-846d-b29e1452bdfa","from":"9b47476f-974d-481c-af64-13f82ed98a5f","time":"2017-01-09T13:47:31.941Z","status":1,"data":{"content_length":47527,"content_type":"image/jpeg","id":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d","info":{"tag":"medium","width":1448,"height":905,"nonce":"b77e8639-a32d-4ba7-88b9-7a0ae461e90d"},"otr_key":{},"sha256":{}},"type":"conversation.asset-add","category": 128},
      ];
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
    });

    it('should return no entry matches the given category', () => {
      return Promise.all(events.slice(0, 1).map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => eventService.loadEventsWithCategory(events[0].conversation, z.message.MessageCategory.IMAGE))
        .then(result => {
          expect(result.length).toBe(0);
        });
    });

    it('should get images in the correct order', () => {
      return Promise.all(events.map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => eventService.loadEventsWithCategory(events[0].conversation, z.message.MessageCategory.IMAGE))
        .then(result => {
          expect(result.length).toBe(2);
          expect(result[0].id).toBe(events[1].id);
          expect(result[1].id).toBe(events[2].id);
        });
    });
  });
});
