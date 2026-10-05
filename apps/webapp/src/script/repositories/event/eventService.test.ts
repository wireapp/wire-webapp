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

import {MemoryEngine} from '@wireapp/store-engine';

import {StorageService} from 'Repositories/storage';
import {StorageSchemata} from 'Repositories/storage/storageSchemata';
import {createMessageAddEvent, toSavedEvent} from 'test/helper/EventGenerator';

import {EventService} from './eventService';

describe('EventService persisted event truthiness', () => {
  it.each([
    {expires: undefined, expectedEventIds: []},
    {expires: null, expectedEventIds: []},
    {expires: false, expectedEventIds: []},
    {expires: 0, expectedEventIds: []},
    {expires: NaN, expectedEventIds: []},
    {expires: '', expectedEventIds: []},
    {expires: -1, expectedEventIds: ['event-id']},
    {expires: 1, expectedEventIds: ['event-id']},
    {expires: '0', expectedEventIds: ['event-id']},
  ])('preserves legacy ephemeral expiry selection for $expires', async options => {
    const {expires, expectedEventIds} = options;
    const engine = new MemoryEngine();
    await engine.init('ephemeral-event-test');
    const record = toSavedEvent(
      createMessageAddEvent({
        overrides: {id: 'event-id', conversation: 'conversation-id', time: '2026-09-30T10:00:00.000Z'},
      }),
    );
    await engine.create(StorageSchemata.OBJECT_STORE.EVENTS, 'event-key', {...record, ephemeral_expires: expires});
    const storageService = new StorageService();
    storageService.init(engine);
    const service = new EventService(storageService);

    const actualEvents = await service.loadEphemeralEvents('conversation-id');

    expect(
      actualEvents.map(event => {
        return event.id;
      }),
    ).toEqual(expectedEventIds);
  });

  it.each([0, NaN, undefined])('rejects a falsy sequential update version %p', async version => {
    const storageService = new StorageService();
    const service = new EventService(storageService);

    await expect(service.updateEventSequentially({primary_key: 'event-key', version})).rejects.toThrow();
  });

  it.each([-1, 1])('accepts a truthy version %p on the non-Dexie storage path', async version => {
    const engine = new MemoryEngine();
    await engine.init('event-version-test');
    const record = toSavedEvent(
      createMessageAddEvent({
        overrides: {id: 'event-id', conversation: 'conversation-id', time: '2026-09-30T10:00:00.000Z'},
      }),
    );
    await engine.create(StorageSchemata.OBJECT_STORE.EVENTS, 'event-key', record);
    const storageService = new StorageService();
    storageService.init(engine);
    const service = new EventService(storageService);

    await service.updateEventSequentially({primary_key: 'event-key', version});

    const storedRecord = await storageService.load<{version: number}>(StorageSchemata.OBJECT_STORE.EVENTS, 'event-key');
    expect(storedRecord?.version).toBe(version);
  });

  it('accepts an empty ID array without treating it as missing', async () => {
    const engine = new MemoryEngine();
    await engine.init('event-empty-id-test');
    const storageService = new StorageService();
    storageService.init(engine);
    const service = new EventService(storageService);

    await expect(service.loadEvents('conversation-id', [])).resolves.toEqual([]);
    await expect(service.loadEvents('', [])).rejects.toThrow();
  });
});
