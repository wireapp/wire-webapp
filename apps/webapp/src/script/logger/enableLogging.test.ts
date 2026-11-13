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

import {enableLogging} from './enableLogging';

import type {Logger} from './logger';
import {createLogging} from './structuredLogger';

type LoggingTestEnvironment = {
  readonly logging: ReturnType<typeof createLogging>;
  readonly output: Record<keyof Logger, jest.Mock<void, unknown[]>>;
  readonly enableLoggingForSearch: (locationSearch: string) => void;
};

function withLoggingTest(testBody: (environment: LoggingTestEnvironment) => void): () => void {
  function runLoggingTest(): void {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1234000n});
    const logging = createLogging(Maybe.nothing());
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};

    function enableLoggingForSearch(locationSearch: string): void {
      enableLogging({
        clock,
        consoleOutput: output,
        locationSearch,
        configureLogging: logging.configure,
      });
    }

    try {
      testBody({logging, output, enableLoggingForSearch});
    } finally {
      logging.configure(Maybe.nothing());
    }
  }

  return runLoggingTest;
}

describe('enableLogging', () => {
  it(
    'enables all namespaces by default using only injected dependencies',
    withLoggingTest(environment => {
      const {logging, output, enableLoggingForSearch} = environment;
      enableLoggingForSearch('');

      logging.getLogger('@wireapp/webapp/Startup').info('Application enabled');
      logging.getLogger('@wireapp/core/Account').debug('Core enabled');

      expect(JSON.parse(String(output.info.mock.calls[0]?.[0]))).toEqual({
        level: 30,
        time: 1234,
        component: '@wireapp/webapp/Startup',
        msg: 'Application enabled',
      });
      expect(JSON.parse(String(output.debug.mock.calls[0]?.[0]))).toEqual({
        level: 20,
        time: 1234,
        component: '@wireapp/core/Account',
        msg: 'Core enabled',
      });
    }),
  );

  it(
    'applies URL namespace filters and exclusions to previously created loggers',
    withLoggingTest(environment => {
      const {logging, output, enableLoggingForSearch} = environment;
      const logger = logging.getLogger('@wireapp/webapp/Startup');
      const excludedLogger = logging.getLogger('@wireapp/core/Account');

      enableLoggingForSearch('?enableLogging=@wireapp/*,-@wireapp/core/*');
      logger.info('Startup enabled');
      excludedLogger.info('Excluded');

      expect(output.info).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(output.info.mock.calls[0]?.[0]))).toEqual(
        expect.objectContaining({
          component: '@wireapp/webapp/Startup',
          msg: 'Startup enabled',
        }),
      );

      enableLoggingForSearch('?enableLogging=-*');
      logger.info('Disabled');
      expect(output.info).toHaveBeenCalledTimes(1);
    }),
  );

  it(
    'keeps logging enabled for an empty URL filter',
    withLoggingTest(environment => {
      const {logging, output, enableLoggingForSearch} = environment;
      enableLoggingForSearch('?enableLogging=');

      logging.getLogger('component').error('Default output');

      expect(output.error).toHaveBeenCalledTimes(1);
    }),
  );

  it(
    'can restore default logging after a namespace exclusion',
    withLoggingTest(environment => {
      const {logging, output, enableLoggingForSearch} = environment;
      const logger = logging.getLogger('component');
      enableLoggingForSearch('?enableLogging=-*');
      logger.info('Excluded');
      enableLoggingForSearch('');
      logger.info('Enabled');

      expect(output.info).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(output.info.mock.calls[0]?.[0]))).toEqual(expect.objectContaining({msg: 'Enabled'}));
    }),
  );
});
