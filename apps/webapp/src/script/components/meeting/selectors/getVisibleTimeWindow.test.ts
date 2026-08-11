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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {getVisibleTimeWindow} from './getVisibleTimeWindow';

describe('getVisibleTimeWindow', () => {
  const wallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
  });

  it('returns start of today through start of today plus dayCount', () => {
    const now = wallClock.currentDate;
    const {from, to} = getVisibleTimeWindow(now, {dayCount: 14});

    expect(from).toEqual(new Date('2026-06-15T00:00:00.000Z'));
    expect(to).toEqual(new Date('2026-06-29T00:00:00.000Z'));
  });

  it('uses the calendar day of now even when now is not midnight', () => {
    const afternoon = new Date('2026-06-15T18:30:00.000Z');
    const {from, to} = getVisibleTimeWindow(afternoon, {dayCount: 2});

    expect(from).toEqual(new Date('2026-06-15T00:00:00.000Z'));
    expect(to).toEqual(new Date('2026-06-17T00:00:00.000Z'));
  });
});
