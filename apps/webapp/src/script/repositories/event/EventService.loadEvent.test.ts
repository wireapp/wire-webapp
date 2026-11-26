/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

/** @jest-environment node */

import 'core-js/stable/structured-clone';
import 'fake-indexeddb/auto';

import {Dexie} from 'dexie';
import {v4 as uuidv4} from 'uuid';

import {StorageService} from '../storage';
import {StorageSchemata} from '../storage/storageSchemata';

import {EventService} from './EventService';

describe('EventService.loadEvent', () => {
  const conversationId = 'conversation-id';
  let db: Dexie;
  let service: EventService;

  beforeEach(async () => {
    db = new Dexie(`event-service-${uuidv4()}`);
    db.version(1).stores({[StorageSchemata.OBJECT_STORE.EVENTS]: '++primary_key, id, conversation'});
    await db.open();
    const storageService = new StorageService();
    storageService.db = db as unknown as StorageService['db'];
    service = new EventService(storageService);
  });

  afterEach(() => {
    db.close();
  });

  it('returns the record with the id when it exists', async () => {
    await db.table(StorageSchemata.OBJECT_STORE.EVENTS).bulkAdd([
      {conversation: conversationId, data: {content: 'original'}, id: 'original-id'},
      {conversation: conversationId, data: {replacing_message_id: 'original-id'}, id: 'edit-id'},
    ]);

    const record = await service.loadEvent(conversationId, 'edit-id');

    expect(record?.id).toBe('edit-id');
  });

  it('returns the record of the edit when the original was replaced', async () => {
    await db
      .table(StorageSchemata.OBJECT_STORE.EVENTS)
      .add({conversation: conversationId, data: {replacing_message_id: 'original-id'}, id: 'edit-id'});

    const record = await service.loadEvent(conversationId, 'original-id');

    expect(record?.id).toBe('edit-id');
  });

  it('returns nothing when no record has or replaced the id', async () => {
    await db.table(StorageSchemata.OBJECT_STORE.EVENTS).add({conversation: conversationId, id: 'other-id'});

    await expect(service.loadEvent(conversationId, 'original-id')).resolves.toBeUndefined();
  });
});
