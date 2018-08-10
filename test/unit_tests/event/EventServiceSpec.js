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
