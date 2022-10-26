/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export const clearTablesSpec = {
  'clears all tables': async (engine: CRUDEngine) => {
    await engine.create(TABLE_NAME, 'one', {name: 'Alpha'});

    let keys = await engine.readAll(TABLE_NAME);
    expect(keys.length).toBe(1);

    await engine.clearTables();

    keys = await engine.readAll(TABLE_NAME);
    expect(keys.length).toBe(0);

    await engine.create(TABLE_NAME, 'two', {name: 'Beta'});
    const {name} = await engine.read<{name: string}>(TABLE_NAME, 'two');
    expect(name).toBe('Beta');
  },
};
