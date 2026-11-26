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

import {createApplicationOutbox} from './createApplicationOutbox';

function createDatabaseDouble(): {table: {toArray: jest.Mock}; db: {outbox: Table<OperationSnapshot, number>}} {
  const table = {
    toArray: jest.fn().mockResolvedValue([]),
  };
  return {table, db: {outbox: table as unknown as Table<OperationSnapshot, number>}};
}

describe('createApplicationOutbox', () => {
  const serverTimeHandler = {toServerTimestamp: jest.fn().mockReturnValue(5000)};

  it('starts the outbox over the database table', async () => {
    const {table, db} = createDatabaseDouble();
    const outbox = createApplicationOutbox({storageService: {db}, serverTimeHandler});

    expect(outbox.isStarted()).toBe(false);

    expect(await outbox.start()).toEqual({type: 'outbox-started'});

    expect(table.toArray).toHaveBeenCalled();
    expect(outbox.isStarted()).toBe(true);
  });

  it('stops the outbox', async () => {
    const {db} = createDatabaseDouble();
    const outbox = createApplicationOutbox({storageService: {db}, serverTimeHandler});
    await outbox.start();

    await outbox.stop();

    expect(outbox.isStarted()).toBe(false);
  });

  it('answers storage-failed and stays unstarted while the database is not open', async () => {
    const outbox = createApplicationOutbox({storageService: {db: undefined}, serverTimeHandler});

    expect(await outbox.start()).toEqual({type: 'storage-failed', errorName: 'Error'});
    expect(outbox.isStarted()).toBe(false);
  });
});
