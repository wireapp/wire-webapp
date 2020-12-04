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

import {act} from 'react-dom/test-utils';

import Duration, {DurationProps} from './Duration';
import TestPage from 'Util/test/TestPage';

class DurationPage extends TestPage<DurationProps> {
  constructor(props?: DurationProps) {
    super(Duration, props);
  }

  getRenderedTime = () => this.getText();
}

describe('Duration', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
  });

  afterEach(() => jest.useRealTimers());

  it('shows correct timer', async () => {
    const props = {
      startedAt: 0,
    } as DurationProps;

    const Duration = new DurationPage(props);

    const now = Date.now();
    jest.setSystemTime(now);
    props.startedAt = Date.now();
    Duration.setProps(props);

    expect(Duration.getText()).toEqual('00:00');

    act(() => {
      jest.advanceTimersByTime(1001);
      Duration.update();
    });

    expect(Duration.getText()).toEqual('00:01');
  });
});
