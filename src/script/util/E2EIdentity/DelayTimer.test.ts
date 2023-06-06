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

import {GracePeriodTimer} from './DelayTimer'; // Update this with your module's actual path
import {ONE_HOUR, FIFTEEN_MINUTES, FOUR_HOURS, ONE_MINUTE} from './helper/delay';

jest.mock('Util/Logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    // eslint-disable-next-line no-console
    log: console.log,
  }),
}));

describe('createGracePeriodTimer', () => {
  let timer: GracePeriodTimer | undefined;
  beforeEach(() => {
    // Mock the localStorage
    const localStorageMock = (function () {
      let store: {[key: string]: string} = {};
      return {
        getItem: function (key: string) {
          return store[key];
        },
        setItem: function (key: string, value: string) {
          store[key] = value.toString();
        },
        clear: function () {
          store = {};
        },
        removeItem: function (key: string) {
          delete store[key];
        },
      };
    })();
    Object.defineProperty(window, 'localStorage', {value: localStorageMock});
  });

  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    timer = GracePeriodTimer?.getInstance({
      gracePeriodInMS: 0,
      gpCallback: jest.fn(),
      delayCallback: jest.fn(),
    });
  });

  afterEach(() => {
    timer?.resetInstance();
    timer = undefined;
    jest.useRealTimers();
  });

  it('should call the gpCallback when the grace period is over', () => {
    const gpCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 1000,
      gpCallback,
      delayCallback: jest.fn(),
    });

    jest.advanceTimersByTime(1000);
    expect(gpCallback).toHaveBeenCalled();
  });

  it('should call the gpCallback only after the delay time is over', () => {
    const gpCallback = jest.fn();

    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      gpCallback,
      delayCallback: jest.fn(),
    });

    timer?.delayPrompt();

    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(gpCallback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(ONE_HOUR);
    expect(gpCallback).toHaveBeenCalled();
  });

  it('should not allow delaying the prompt if the grace period is already over', () => {
    const gpCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 0,
      gpCallback,
      delayCallback: jest.fn(),
    });
    timer?.delayPrompt();

    jest.advanceTimersByTime(500);
    expect(gpCallback).toHaveBeenCalled();
  });

  it('should allow delaying the prompt multiple times within the grace period', () => {
    const gpCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: 7200000,
      gpCallback,
      delayCallback: jest.fn(),
    });
    timer?.delayPrompt();
    jest.advanceTimersByTime(3600000);
    timer?.delayPrompt();
    jest.advanceTimersByTime(3600000);

    expect(gpCallback).toHaveBeenCalled();
  });

  it('should call the delayCallback after a delay based on the grace period', () => {
    const delayCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      gpCallback: jest.fn(),
      delayCallback,
    });

    timer?.delayPrompt();

    // getDelayTime(ONE_HOUR) will return FIFTEEN_MINUTES according to the function provided.
    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(delayCallback).toHaveBeenCalled();
  });

  it('should not call delayCallback if grace period is over', () => {
    const delayCallback = jest.fn();
    const gpCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_HOUR,
      delayCallback,
      gpCallback,
    });

    timer?.delayPrompt();

    // Here, instead of advancing time by "ONE_HOUR + FIFTEEN_MINUTES", we advance by "ONE_HOUR", which is the end of the grace period.
    jest.advanceTimersByTime(ONE_HOUR + FIFTEEN_MINUTES);
    expect(delayCallback).toHaveBeenCalled(); // The delayCallback should be called after ONE_HOUR.
    expect(gpCallback).toHaveBeenCalled(); // The gpCallback should be called when the grace period ends, which is after ONE_HOUR.

    timer?.delayPrompt(); // We try to delay after the grace period has ended.
    jest.advanceTimersByTime(FIFTEEN_MINUTES);
    expect(delayCallback).toHaveBeenCalledTimes(1); // The delayCallback should not be called again since we're now past the grace period.
  });

  it('should call delayCallback multiple times if delayPrompt is called multiple times within the grace period', () => {
    const delayCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: FOUR_HOURS,
      gpCallback: jest.fn(),
      delayCallback,
    });

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR); // gracePeriod > delay, so delay = ONE_HOUR

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR);

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_HOUR);

    expect(delayCallback).toHaveBeenCalledTimes(3);
  });

  it('should not execute the delayPrompt() if the grace period is over', () => {
    const delayCallback = jest.fn();
    const gpCallback = jest.fn();
    timer?.updateParams({
      gracePeriodInMS: ONE_MINUTE,
      gpCallback,
      delayCallback,
    });

    timer?.delayPrompt();
    jest.advanceTimersByTime(ONE_MINUTE);

    expect(delayCallback).not.toHaveBeenCalled();
    expect(gpCallback).toHaveBeenCalled();
  });
});
