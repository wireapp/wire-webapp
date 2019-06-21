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

import {CRUDEngine} from '../engine';

const TABLE_NAME = 'the-simpsons';

export const purgeSpec = {
  'database can be reinitialized after purge': async (
    engine: CRUDEngine,
    initEngine: (shouldCreateNewEngine?: boolean) => Promise<CRUDEngine>,
  ) => {
    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});
    const SAVED_RECORDS = 1;
    let keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);

    await engine.purge();

    engine = await initEngine(false);
    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(0);

    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});

    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);
  },
  'deletes the database and all of its records.': async (
    engine: CRUDEngine,
    initEngine: (shouldCreateNewEngine?: boolean) => Promise<CRUDEngine>,
  ) => {
    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});
    await engine.create(TABLE_NAME, 'two', {name: 'Bravo'});
    await engine.create(TABLE_NAME, 'three', {name: 'Charlie'});
    await engine.create(TABLE_NAME, 'four', {name: 'Delta'});
    const SAVED_RECORDS = 4;
    let keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(SAVED_RECORDS);

    await engine.purge();

    engine = await initEngine();
    keys = await engine.readAllPrimaryKeys(TABLE_NAME);
    expect(keys.length).toBe(0);
  },
};
