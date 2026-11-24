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

import type {Table} from 'dexie';

import type {OperationSnapshot} from '../../outbox';

import {createOutboxService} from './createOutboxService';

function createDatabaseDouble(): {table: {toArray: jest.Mock}; db: {outbox: Table<OperationSnapshot, number>}} {
  const table = {
    toArray: jest.fn().mockResolvedValue([]),
  };
  return {table, db: {outbox: table as unknown as Table<OperationSnapshot, number>}};
}

describe('createOutboxService', () => {
  const serverTimeHandler = {toServerTimestamp: jest.fn().mockReturnValue(5000)};

  it('starts the outbox over the database table', async () => {
    const {table, db} = createDatabaseDouble();
    const service = createOutboxService({storageService: {db}, serverTimeHandler});

    expect(service.outbox.isStarted()).toBe(false);

    expect(await service.start()).toEqual({type: 'outbox-started'});

    expect(table.toArray).toHaveBeenCalled();
    expect(service.outbox.isStarted()).toBe(true);
  });

  it('stops the outbox', async () => {
    const {db} = createDatabaseDouble();
    const service = createOutboxService({storageService: {db}, serverTimeHandler});
    await service.start();

    await service.stop();

    expect(service.outbox.isStarted()).toBe(false);
  });

  it('answers storage-failed and stays unstarted while the database is not open', async () => {
    const service = createOutboxService({storageService: {db: undefined}, serverTimeHandler});

    expect(await service.start()).toEqual({type: 'storage-failed', errorName: 'Error'});
    expect(service.outbox.isStarted()).toBe(false);
  });
});
