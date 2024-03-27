/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import * as TimeUtil from './TimeUtil';

describe('TimeUtil', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('formats the time correctly', () => {
    jest.setSystemTime(new Date('1999-12-31T23:59:59.999Z'));
    expect(TimeUtil.formatDate()).toEqual('1999-12-31 23:59:59');

    jest.setSystemTime(new Date('2000-01-01T00:00:00.000Z'));
    expect(TimeUtil.formatDate()).toEqual('2000-01-01 00:00:00');
  });
});
