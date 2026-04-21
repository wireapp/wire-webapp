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
  it('marks only the latest request as current', () => {
    const requestVersionGate = createRequestVersionGate();

    const firstRequest = requestVersionGate.next();
    expect(requestVersionGate.isStale(firstRequest)).toBe(false);

    const secondRequest = requestVersionGate.next();
    expect(requestVersionGate.isStale(firstRequest)).toBe(true);
    expect(requestVersionGate.isStale(secondRequest)).toBe(false);
  });

  it('invalidates in-flight requests when cleared', () => {
    const requestVersionGate = createRequestVersionGate();

    const searchRequest = requestVersionGate.next();
    requestVersionGate.invalidate();

    expect(requestVersionGate.isStale(searchRequest)).toBe(true);

    const freshRequest = requestVersionGate.next();
    expect(requestVersionGate.isStale(freshRequest)).toBe(false);
  });
});
