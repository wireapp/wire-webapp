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

export const appendSpec = {
  'appends text to an existing record.': async (engine: CRUDEngine) => {
    const PRIMARY_KEY = 'primary-key';

    const text = 'Hello';
    const textExtension = '\r\nWorld';
    const primaryKey = await engine.create(TABLE_NAME, PRIMARY_KEY, text);
    await engine.append(TABLE_NAME, primaryKey, textExtension);
    const record = await engine.read(TABLE_NAME, primaryKey);
    expect(record).toBe(`${text}${textExtension}`);
  },
};
