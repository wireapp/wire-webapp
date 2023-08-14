/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {RegisteredClient} from '@wireapp/api-client/lib/client';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {wasClientActiveWithinLast4Weeks} from './ClientUtils';

const createClientWithLastActive = (date: Date): RegisteredClient => {
  return {last_active: date.toISOString()} as RegisteredClient;
};

describe('wasClientActiveWithinLast4Weeks', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01'));
  });

  it('should return false if client was last active 29 days ago', () => {
    const client = createClientWithLastActive(new Date(Date.now() - 29 * TIME_IN_MILLIS.DAY));
    expect(wasClientActiveWithinLast4Weeks(client)).toBe(false);
  });

  it('should return true if client was last active exactly 28 days ago', () => {
    const client = createClientWithLastActive(new Date(Date.now() - 28 * TIME_IN_MILLIS.DAY));
    expect(wasClientActiveWithinLast4Weeks(client)).toBe(true);
  });

  it('should return true if client was last active less than 28 days ago', () => {
    const client = createClientWithLastActive(new Date(Date.now() - 20 * TIME_IN_MILLIS.DAY));
    expect(wasClientActiveWithinLast4Weeks(client)).toBe(true);
  });
});
