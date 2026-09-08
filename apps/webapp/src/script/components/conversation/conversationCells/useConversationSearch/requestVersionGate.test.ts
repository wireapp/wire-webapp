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

import {createRequestVersionGate} from './requestVersionGate';

describe('createRequestVersionGate', () => {
  it('marks older requests as stale when a newer request starts', () => {
    const requestVersionGate = createRequestVersionGate();

    const firstRequest = requestVersionGate.next();
    const secondRequest = requestVersionGate.next();

    expect(requestVersionGate.isStale(firstRequest)).toBe(true);
    expect(requestVersionGate.isStale(secondRequest)).toBe(false);
  });

  it('invalidates in-flight requests without starting a replacement request', () => {
    const requestVersionGate = createRequestVersionGate();

    const request = requestVersionGate.next();
    requestVersionGate.invalidate();

    expect(requestVersionGate.isStale(request)).toBe(true);
  });

  it('returns a frozen gate to protect request state operations', () => {
    const requestVersionGate = createRequestVersionGate();

    expect(Object.isFrozen(requestVersionGate)).toBe(true);
  });
});
