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

import {FIFTEEN_MINUTES, FOUR_HOURS, ONE_HOUR, ONE_MINUTE} from './delay';
import {DelayTimerService} from './DelayTimer'; // Update this with your module's actual path

describe('createGracePeriodTimer', () => {
  let timer: DelayTimerService | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    global.localStorage.clear();
    timer = DelayTimerService?.getInstance({
      gracePeriodInMS: 0,
      gracePeriodExpiredCallback: jest.fn(),
      delayPeriodExpiredCallback: jest.fn(),
    });
  });

  afterEach(() => {
    timer?.resetInstance();
    timer = undefined;
    jest.useRealTimers();
  });

  it('should call the gracePeriodExpiredCallback when the grace period is over', () => {
    const gracePeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 1000,
      gracePeriodExpiredCallback,
      delayPeriodExpiredCallback: jest.fn(),
    });

    jest.advanceTimersByTime(1000);
    expect(gracePeriodExpiredCallback).toHaveBeenCalled();
  });

  it('should call the gracePeriodExpiredCallback only after the delay time is over', () => {
    const gracePeriodExpiredCallback = jest.fn();

    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      gracePeriodExpiredCallback,
      delayPeriodExpiredCallback: jest.fn(),
    });

    timer?.delayPrompt();

    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(gracePeriodExpiredCallback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(ONE_HOUR);
    expect(gracePeriodExpiredCallback).toHaveBeenCalled();
  });

  it('should not allow delaying the prompt if the grace period is already over', () => {
    const gracePeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 0,
      gracePeriodExpiredCallback,
      delayPeriodExpiredCallback: jest.fn(),
    });
    timer?.delayPrompt();

    jest.advanceTimersByTime(500);
    expect(gracePeriodExpiredCallback).toHaveBeenCalled();
  });

  it('should allow delaying the prompt multiple times within the grace period', () => {
    const gracePeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 7200000,
      gracePeriodExpiredCallback,
      delayPeriodExpiredCallback: jest.fn(),
    });
    timer?.delayPrompt();
    jest.advanceTimersByTime(3600000);
    timer?.delayPrompt();
    jest.advanceTimersByTime(3600000);

    expect(gracePeriodExpiredCallback).toHaveBeenCalled();
  });

  it('should call the delayPeriodExpiredCallback after a delay based on the grace period', () => {
    const delayPeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      gracePeriodExpiredCallback: jest.fn(),
      delayPeriodExpiredCallback,
    });

    timer?.delayPrompt();

    // getDelayTime(ONE_HOUR) will return FIFTEEN_MINUTES according to the function provided.
    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(delayPeriodExpiredCallback).toHaveBeenCalled();
  });

  it('should not call delayPeriodExpiredCallback if grace period is over', () => {
    const delayPeriodExpiredCallback = jest.fn();
    const gracePeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      delayPeriodExpiredCallback,
      gracePeriodExpiredCallback,
    });

    timer?.delayPrompt();

    // Here, instead of advancing time by "ONE_HOUR + FIFTEEN_MINUTES", we advance by "ONE_HOUR", which is the end of the grace period.
    jest.advanceTimersByTime(ONE_HOUR + FIFTEEN_MINUTES);
    expect(delayPeriodExpiredCallback).toHaveBeenCalled(); // The delayPeriodExpiredCallback should be called after ONE_HOUR.
    expect(gracePeriodExpiredCallback).toHaveBeenCalled(); // The gracePeriodExpiredCallback should be called when the grace period ends, which is after ONE_HOUR.

    timer?.delayPrompt(); // We try to delay after the grace period has ended.
    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(delayPeriodExpiredCallback).toHaveBeenCalledTimes(1); // The delayPeriodExpiredCallback should not be called again since we're now past the grace period.
  });

  it('should call delayPeriodExpiredCallback multiple times if delayPrompt is called multiple times within the grace period', () => {
    const delayPeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: FOUR_HOURS,
      gracePeriodExpiredCallback: jest.fn(),
      delayPeriodExpiredCallback,
    });

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR); // gracePeriod > delay, so delay = ONE_HOUR

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR);

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR);

    expect(delayPeriodExpiredCallback).toHaveBeenCalledTimes(3);
  });

  it('should not execute the delayPrompt() if the grace period is over', () => {
    const delayPeriodExpiredCallback = jest.fn();
    const gracePeriodExpiredCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_MINUTE,
      gracePeriodExpiredCallback,
      delayPeriodExpiredCallback,
    });

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_MINUTE);

    expect(delayPeriodExpiredCallback).not.toHaveBeenCalled();
    expect(gracePeriodExpiredCallback).toHaveBeenCalled();
  });
});
