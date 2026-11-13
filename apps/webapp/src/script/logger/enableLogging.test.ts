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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createPinoLogging} from './createPinoLogging';
import {enableLogging} from './enableLogging';

describe('logging startup', () => {
  it.each([
    {search: '', debugEnabled: false, expected: Maybe.nothing<string>(), calls: 0},
    {search: '', debugEnabled: true, expected: Maybe.just('*'), calls: 1},
    {search: '?enableLogging=', debugEnabled: false, expected: Maybe.nothing<string>(), calls: 0},
    {search: '?enableLogging=', debugEnabled: true, expected: Maybe.just('*'), calls: 1},
    {
      search: '?enableLogging=@wireapp/*,-@wireapp/core/*',
      debugEnabled: true,
      expected: Maybe.just('@wireapp/*,-@wireapp/core/*'),
      calls: 1,
    },
    {search: '?enableLogging=-*', debugEnabled: true, expected: Maybe.just('-*'), calls: 0},
  ])('restores main enablement: $search with ENABLE_DEBUG=$debugEnabled', testCase => {
    const {search, debugEnabled, expected, calls} = testCase;
    const storedValues = new Map<string, string>([['debug', 'old namespace']]);
    const storage = {
      setItem(key: string, value: string): void {
        storedValues.set(key, value);
      },
      removeItem(key: string): void {
        storedValues.delete(key);
      },
    };
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const logging = createPinoLogging(Maybe.nothing());
    const logger = logging.getLogger('@wireapp/webapp/Startup');

    enableLogging({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
      consoleOutput: output,
      locationSearch: search,
      debugEnabled,
      storage: Maybe.just(storage),
      configureLogging: logging.configure,
    });
    logger.debug('Startup');
    logging.getLogger('@wireapp/core/Account').info('Excluded core');

    expect(Maybe.of(storedValues.get('debug'))).toEqual(expected);
    expect(output.debug).toHaveBeenCalledTimes(calls);
    if (search.includes('-@wireapp/core')) {
      expect(output.info).not.toHaveBeenCalled();
    }
  });

  it('applies URL enablement when debug mode is off and storage is unavailable', () => {
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const logging = createPinoLogging(Maybe.nothing());
    enableLogging({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
      consoleOutput: output,
      locationSearch: '?enableLogging=*',
      debugEnabled: false,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });

    logging.getLogger('component').debug('Enabled');

    expect(output.debug).toHaveBeenCalledTimes(1);
  });

  it('does not let storage failures interrupt startup or disable configured logging', () => {
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const logging = createPinoLogging(Maybe.nothing());
    const storage = {
      setItem(): never {
        throw new Error('Storage unavailable');
      },
      removeItem(): never {
        throw new Error('Storage unavailable');
      },
    };

    expect(() => {
      enableLogging({
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
        consoleOutput: output,
        locationSearch: '',
        debugEnabled: true,
        storage: Maybe.just(storage),
        configureLogging: logging.configure,
      });
    }).not.toThrow();
    logging.getLogger('component').debug('Enabled');
    expect(output.debug).toHaveBeenCalledTimes(1);
  });
});
