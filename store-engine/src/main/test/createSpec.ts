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
import {RecordAlreadyExistsError, RecordTypeError} from '../engine/error';

const TABLE_NAME = 'the-simpsons';

export const createSpec = {
  'creates a serialized database record.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
    expect(primaryKey).toEqual(PRIMARY_KEY);
  },
  "doesn't save empty values.": async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    try {
      await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
      fail(new Error('Method is supposed to throw an error.'));
    } catch (error) {
      expect(error).toEqual(jasmine.any(RecordTypeError));
    }
  },
  "doesn't save null values.": async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    try {
      await engine.create(TABLE_NAME, PRIMARY_KEY, entity);
      fail(new Error('Method is supposed to throw an error.'));
    } catch (error) {
      expect(error).toEqual(jasmine.any(RecordTypeError));
    }
  },
  'throws an error when attempting to overwrite a record.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const firstEntity = {
      some: 'value',
    };

    const secondEntity = {
      some: 'newer-value',
    };

    try {
      await engine.create(TABLE_NAME, PRIMARY_KEY, firstEntity);
      await engine.create(TABLE_NAME, PRIMARY_KEY, secondEntity);
      fail();
    } catch (error) {
      expect(error).toEqual(jasmine.any(RecordAlreadyExistsError));
    }
  },
};
