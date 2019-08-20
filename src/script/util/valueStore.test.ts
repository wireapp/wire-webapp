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

import {get, save} from './valueStore';

describe('valueStore', () => {
  it('is initialized with an empty value', async () => {
    const storedValue = await get();
    expect(storedValue).not.toBeDefined();
  });

  it('allows storing a single value', async () => {
    const value1 = 'first value';
    const value2 = 'second value';

    await save(value1);
    const storedValue1 = await get();
    expect(storedValue1).toBe(value1);

    await save(value2);
    const storedValue2 = await get();
    expect(storedValue2).toBe(value2);
  });
});
