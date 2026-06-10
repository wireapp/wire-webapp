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
import {RecordNotFoundError} from '../engine/error/RecordNotFoundError';

const TABLE_NAME = 'the-simpsons';

interface DomainEntity {
  some: string;
}

export const readSpec = {
  'returns a database record.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
    const record = await engine.read<DomainEntity>(TABLE_NAME, primaryKey);
    expect(record.some).toBe(entity.some);
  },
  'throws an error if a record cannot be found.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    try {
      await engine.read(TABLE_NAME, PRIMARY_KEY);
      throw new Error('Method is supposed to throw an error.');
    } catch (error) {
      expect(error).toEqual(expect.any(RecordNotFoundError));
    }
  },
};
