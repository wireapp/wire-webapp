/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {Cookie} from './cookie';

describe('Cookie.isExpired', () => {
  it('does not expire a session cookie', () => {
    const cookie = new Cookie('session-value', 'Infinity');

    expect(cookie.isExpired).toBe(false);
  });

  it('expires a cookie with an expiration date in the past', () => {
    const earliestRepresentableDate = new Date(-8_640_000_000_000_000).toISOString();
    const cookie = new Cookie('expired-value', earliestRepresentableDate);

    expect(cookie.isExpired).toBe(true);
  });

  it('does not expire a cookie with an expiration date in the future', () => {
    const latestRepresentableDate = new Date(8_640_000_000_000_000).toISOString();
    const cookie = new Cookie('unexpired-value', latestRepresentableDate);

    expect(cookie.isExpired).toBe(false);
  });
});
