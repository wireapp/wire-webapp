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

import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {StorageSchemata} from 'src/script/storage/StorageSchemata';
import {TestFactory} from '../../helper/TestFactory';

describe('ConversationService', () => {
  let conversation_mapper = null;
  let conversation_service = null;
  let server = null;
  let storage_service = null;
  const testFactory = new TestFactory();
  const eventStoreName = StorageSchemata.OBJECT_STORE.EVENTS;

  beforeAll(() => {
    return testFactory.exposeConversationActors().then(() => {
      conversation_service = testFactory.conversation_service;
      conversation_mapper = new ConversationMapper();
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
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const conversation_payload = {"access":["private"],"creator":"0410795a-58dc-40d8-b216-cbc2360be21a","members":{"self":{"hidden_ref":null,"status":0,"last_read":"24fe.800122000b16c279","muted_time":null,"otr_muted_ref":null,"muted":false,"status_time":"2014-12-03T18:39:12.319Z","hidden":false,"status_ref":"0.0","id":"532af01e-1e24-4366-aacf-33b67d4ee376","otr_archived":false,"cleared":null,"otr_muted":false,"otr_archived_ref":"2016-07-25T11:30:07.883Z","archived":null},"others":[{"status":0,"id":"0410795a-58dc-40d8-b216-cbc2360be21a"}]},"name":"Michael","id":"573b6978-7700-443e-9ce5-ff78b35ac590","type":2,"last_event_time":"2016-06-21T22:53:41.778Z","last_event":"24fe.800122000b16c279"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const [conversation_et] = conversation_mapper.mapConversations([conversation_payload]);

      return conversation_service.save_conversation_state_in_db(conversation_et).then(conversation_record => {
        expect(conversation_record.name()).toBe(conversation_payload.name);
      });
    });
  });

  describe('search_in_conversation', () => {
    let events = undefined;

    beforeEach(() => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"2017-01-09T13:11:15.051Z","data":{"content":"https://wire.com","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category": 16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2276","from":"5598f954-674f-4a34-ad47-9e5ee8f00bce","time":"2017-01-09T13:11:15.052Z","data":{"content":"https://wire.com","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2276","previews":["CjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgQABpWCjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgSHFdpcmUgwrcgTW9kZXJuIGNvbW11bmljYXRpb24="]},"type":"conversation.message-add","category": 112},
      ];
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
    });

    it('should find query in text message', () => {
      return Promise.all(events.slice(0, 1).map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.search_in_conversation(events[0].conversation, 'https://wire.com'))
        .then(result => {
          expect(result.length).toBe(1);
          expect(result[0].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2275');
        });
    });

    it('should find query in text message with link preview', () => {
      return Promise.all(events.map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.search_in_conversation(events[0].conversation, 'https://wire.com'))
        .then(result => {
          expect(result.length).toBe(2);
          expect(result[0].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2275');
          expect(result[1].id).toBe('f7adaa16-38f5-483e-b621-72ff1dbd2276');
        });
    });
  });

  describe('get_active_conversations_from_db', () => {
    let events = undefined;

    beforeEach(() => {
      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      events = [
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date().toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c0","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date(Date.now() - 1).toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date(Date.now() - 2).toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date(Date.now() - 3).toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c1","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date(Date.now() - 4).toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c2","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":`${new Date(Date.now() - 5).toISOString()}`,"data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
        {"conversation":"34e7f58e-b834-4d84-b628-b89b295d46c3","id":"f7adaa16-38f5-483e-b621-72ff1dbd2275","from":"5598f954-674f-4a34-ad47-9e5ee8f00bcd","time":"2016-01-09T13:11:15.051Z","data":{"content":"hello","nonce":"f7adaa16-38f5-483e-b621-72ff1dbd2275","previews":[]},"type":"conversation.message-add","category":16},
      ];
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
    });

    it('should return conversation ids sorted by number of messages', () => {
      return Promise.all(events.map(event => storage_service.save(eventStoreName, undefined, event)))
        .then(() => conversation_service.get_active_conversations_from_db())
        .then(result => {
          expect(result.length).toBe(3);
          expect(result[0]).toBe('34e7f58e-b834-4d84-b628-b89b295d46c1');
          expect(result[1]).toBe('34e7f58e-b834-4d84-b628-b89b295d46c0');
          expect(result[2]).toBe('34e7f58e-b834-4d84-b628-b89b295d46c2');
        });
    });
  });
});
