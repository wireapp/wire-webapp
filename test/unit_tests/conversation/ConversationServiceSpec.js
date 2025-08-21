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

import {ConversationMapper} from 'Repositories/conversation/ConversationMapper';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';

import {TestFactory} from '../../helper/TestFactory';
import sinon from 'sinon';

describe('ConversationService', () => {
  let conversation_service = null;
  let server = null;
  let storage_service = null;
  const testFactory = new TestFactory();
  const eventStoreName = StorageSchemata.OBJECT_STORE.EVENTS;

  beforeAll(() => {
    return testFactory.exposeConversationActors().then(() => {
      conversation_service = testFactory.conversation_service;
      storage_service = testFactory.storage_service;
      server = sinon.fakeServer.create();
    });
  });

  afterEach(() => {
    storage_service.clearStores();
    server.restore();
  });

  describe('save_conversation_in_db', () => {
    it('saves a conversation', () => {
      const conversation_payload = {
        access: ['private'],
        creator: '0410795a-58dc-40d8-b216-cbc2360be21a',
        id: '573b6978-7700-443e-9ce5-ff78b35ac590',
        last_event: '24fe.800122000b16c279',
        last_event_time: '2016-06-21T22:53:41.778Z',
        members: {
          others: [{id: '0410795a-58dc-40d8-b216-cbc2360be21a', status: 0}],
          self: {
            archived: null,
            cleared: null,
            hidden: false,
            hidden_ref: null,
            id: '532af01e-1e24-4366-aacf-33b67d4ee376',
            last_read: '24fe.800122000b16c279',
            muted: false,
            muted_time: null,
            otr_archived: false,
            otr_archived_ref: '2016-07-25T11:30:07.883Z',
            otr_muted: false,
            otr_muted_ref: null,
            status: 0,
            status_ref: '0.0',
            status_time: '2014-12-03T18:39:12.319Z',
          },
        },
        name: 'Michael',
        type: 2,
      };
      const [conversation_et] = ConversationMapper.mapConversations([conversation_payload]);

      return conversation_service.saveConversationStateInDb(conversation_et).then(conversation_record => {
        expect(conversation_record.name()).toBe(conversation_payload.name);
      });
    });
  });

  describe('searchInConversation', () => {
    let events = undefined;

    beforeEach(() => {
      events = [
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
          data: {content: 'https://wire.com', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: '2017-01-09T13:11:15.051Z',
          type: 'conversation.message-add',
        },
        {
          category: 112,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
          data: {
            content: 'https://wire.com',
            nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2276',
            previews: [
              'CjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgQABpWCjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgSHFdpcmUgwrcgTW9kZXJuIGNvbW11bmljYXRpb24=',
            ],
          },
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bce',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2276',
          time: '2017-01-09T13:11:15.052Z',
          type: 'conversation.message-add',
        },
      ];
    });

    it('should find query in text message', () => {
      return Promise.all(events.slice(0, 1).map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.searchInConversation(events[0].conversation, 'https://wire.com'))
        .then(result => {
          expect(result.length).toBe(1);
          expect(result[0].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2275');
        });
    });

    it('should find query in text message with link preview', () => {
      return Promise.all(events.map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.searchInConversation(events[0].conversation, 'https://wire.com'))
        .then(result => {
          expect(result.length).toBe(2);
          expect(result[0].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2275');
          expect(result[1].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2276');
        });
    });
  });

  describe('getActiveConversationsFromDb', () => {
    let events = undefined;

    beforeEach(() => {
      events = [
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date().toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date(Date.now() - 1).toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c1',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date(Date.now() - 2).toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c1',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date(Date.now() - 3).toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c1',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date(Date.now() - 4).toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c2',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: `${new Date(Date.now() - 5).toISOString()}`,
          type: 'conversation.message-add',
        },
        {
          category: 16,
          conversation: '34e7f58e-b834-4d84-b628-b89b295d46c3',
          data: {content: 'hello', nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2275', previews: []},
          from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
          id: 'f7adaa16-38f5-483e-b621-72ff1dbd2275',
          time: '2016-01-09T13:11:15.051Z',
          type: 'conversation.message-add',
        },
      ];
    });

    it('should return conversation ids sorted by number of messages', () => {
      return Promise.all(events.map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.getActiveConversationsFromDb())
        .then(result => {
          expect(result.length).toBe(3);
          expect(result[0].id).toBe('34e7f58e-b834-4d84-b628-b89b295d46c1');
          expect(result[1].id).toBe('34e7f58e-b834-4d84-b628-b89b295d46c0');
          expect(result[2].id).toBe('34e7f58e-b834-4d84-b628-b89b295d46c2');
        });
    });
  });
});
