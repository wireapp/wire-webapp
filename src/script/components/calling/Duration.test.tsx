/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';

import {Duration} from './Duration';

describe('Duration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => jest.useRealTimers());

  it('shows correct timer', async () => {
    const now = Date.now();
    const {getByText, queryByText} = render(<Duration startedAt={now} />);

    jest.setSystemTime(now);

    expect(getByText('00:00')).not.toBe(null);

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    expect(getByText('00:01')).not.toBe(null);
    expect(queryByText('00:00')).toBe(null);
  });
});
