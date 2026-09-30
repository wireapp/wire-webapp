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

import {NotificationService} from './NotificationService';

describe('NotificationService persisted cursor', () => {
  it.each([
    {value: undefined, expectedCursor: undefined},
    {value: null, expectedCursor: undefined},
    {value: false, expectedCursor: undefined},
    {value: 0, expectedCursor: undefined},
    {value: NaN, expectedCursor: undefined},
    {value: '', expectedCursor: undefined},
    {value: 'cursor-id', expectedCursor: 'cursor-id'},
  ])('preserves legacy cursor truthiness for $value', async options => {
    const {value, expectedCursor} = options;
    const engine = new MemoryEngine();
    await engine.init('notification-cursor-test');
    const storageService = new StorageService();
    storageService.init(engine);
    await engine.create(StorageSchemata.OBJECT_STORE.AMPLIFY, NotificationService.CONFIG.PRIMARY_KEY_MISSED, {value});
    const service = new NotificationService(storageService);

    const actualCursor = await service.getMissedIdFromDb();

    expect(actualCursor).toBe(expectedCursor);
  });

  it('returns undefined when the cursor record is missing', async () => {
    const engine = new MemoryEngine();
    await engine.init('notification-cursor-test');
    const storageService = new StorageService();
    storageService.init(engine);
    const service = new NotificationService(storageService);

    const actualCursor = await service.getMissedIdFromDb();

    expect(actualCursor).toBeUndefined();
  });
});
