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

export default {
  'creates a serialized database record.': (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = {
      some: 'value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(primaryKey => {
        expect(primaryKey).toEqual(PRIMARY_KEY);
        done();
      })
      .catch(done.fail);
  },
  "doesn't save empty values.": (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => done.fail(new Error('Method is supposed to throw an error.')))
      .catch(error => {
        expect(error).toEqual(jasmine.any(RecordTypeError));
        done();
      });
  },
  "doesn't save null values.": (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const entity = undefined;

    engine
      .create(TABLE_NAME, PRIMARY_KEY, entity)
      .then(() => done.fail(new Error('Method is supposed to throw an error.')))
      .catch(error => {
        expect(error).toEqual(jasmine.any(RecordTypeError));
        done();
      });
  },
  'throws an error when attempting to overwrite a record.': (done: DoneFn, engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const firstEntity = {
      some: 'value',
    };

    const secondEntity = {
      some: 'newer-value',
    };

    engine
      .create(TABLE_NAME, PRIMARY_KEY, firstEntity)
      .then(() => engine.create(TABLE_NAME, PRIMARY_KEY, secondEntity))
      .catch(error => {
        expect(error).toEqual(jasmine.any(RecordAlreadyExistsError));
        done();
      });
  },
};
