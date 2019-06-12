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

interface DomainEntity {
  name: string;
}

export const updateOrCreateSpec = {
  'creates a record if it does not exist in the database.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      name: 'Old monitor',
    };

    const expectedAmountOfProperties = 1;

    const primaryKey = await engine.updateOrCreate(TABLE_NAME, PRIMARY_KEY, entity);
    const updatedRecord = await engine.read<DomainEntity>(TABLE_NAME, primaryKey);
    expect(updatedRecord.name).toBe(entity.name);
    expect(Object.keys(updatedRecord).length).toBe(expectedAmountOfProperties);
  },
  'updates an existing database record.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      name: 'Old monitor',
    };

    const update = {
      name: 'Old monitor2',
    };

    await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
    const primaryKey = await engine.updateOrCreate(TABLE_NAME, PRIMARY_KEY, update);
    const updatedRecord = await engine.read<DomainEntity>(TABLE_NAME, primaryKey);
    expect(updatedRecord.name).toBe(update.name);
  },
};
