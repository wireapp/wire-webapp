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
import {createBufferedLogOutput, type BufferedLogOutput} from './createBufferedLogOutput';
import {logPersistenceConfiguration} from './logPersistenceConfiguration';

import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

const disabledPersistenceOptions = {
  startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(''),
  isElectron: false,
  createPersistenceOutput(): Maybe<BufferedLogOutput> {
    return Maybe.nothing();
  },
};

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
    {search: '?enableLogging=(a%2B)%2B%24', debugEnabled: true, expected: Maybe.just('(a+)+$'), calls: 0},
    {search: '?enableLogging=*,-', debugEnabled: true, expected: Maybe.just('*,-'), calls: 0},
  ])('restores main enablement: $search with ENABLE_DEBUG=$debugEnabled', testCase => {
    const {search, debugEnabled, expected, calls} = testCase;
    const storedValues = new Map<string, string>([['debug', 'old namespace']]);
    const storage = {
      setItem(key: string, value: string) {
        storedValues.set(key, value);
      },
      removeItem(key: string) {
        storedValues.delete(key);
      },
    };
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const logging = createPinoLogging(Maybe.nothing());
    const logger = logging.getLogger('@wireapp/webapp/Startup');

    enableLogging({
      ...disabledPersistenceOptions,
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
      ...disabledPersistenceOptions,
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
        ...disabledPersistenceOptions,
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

  it.each(
    [false, true].flatMap(consoleEnabled => {
      return [false, true].flatMap(persistenceEnabled => {
        return [false, true].map(isElectron => {
          return {consoleEnabled, persistenceEnabled, isElectron};
        });
      });
    }),
  )(
    'separates destinations: console=$consoleEnabled persistence=$persistenceEnabled electron=$isElectron',
    async options => {
      const {consoleEnabled, persistenceEnabled, isElectron} = options;
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1000n});
      const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
      const append = jest.fn<Promise<void>, [readonly string[]]>();
      const createPersistenceOutput = jest.fn(() => {
        return Maybe.just(createBufferedLogOutput({clock, append, configuration: logPersistenceConfiguration}));
      });
      const logging = createPinoLogging(Maybe.nothing());
      const locationSearch = `?enabled-features=mark-as-unread${persistenceEnabled ? ',persistent-browser-logs' : ''}${consoleEnabled ? '&enableLogging=selected' : ''}`;
      const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(locationSearch);
      const persistence = enableLogging({
        clock,
        consoleOutput,
        locationSearch,
        debugEnabled: false,
        storage: Maybe.nothing(),
        configureLogging: logging.configure,
        startupFeatureToggles,
        isElectron,
        createPersistenceOutput,
      });
      let serializationCount = 0;
      logging.getLogger('selected').info('Bearer secret-message', {
        projection: {
          toJSON() {
            serializationCount += 1;

            return 'Bearer secret-attribute';
          },
        },
      });
      logging.getLogger('excluded').warn('Excluded from console');
      if (persistence.isJust) {
        await persistence.value.flush();
      }

      const shouldPersist = persistenceEnabled && !isElectron;
      expect(persistence.isJust).toBe(shouldPersist);
      expect(createPersistenceOutput).toHaveBeenCalledTimes(shouldPersist ? 1 : 0);
      expect(consoleOutput.info).toHaveBeenCalledTimes(consoleEnabled ? 1 : 0);
      expect(consoleOutput.warn).not.toHaveBeenCalled();
      expect(startupFeatureToggles.isFeatureToggleEnabled('mark-as-unread')).toBe(true);
      expect(serializationCount).toBe(consoleEnabled || shouldPersist ? 1 : 0);
      const lines = append.mock.calls.flatMap(call => {
        return call[0];
      });
      expect(lines).toHaveLength(shouldPersist ? 2 : 0);
      expect(lines.join('')).not.toContain('secret-');
      if (shouldPersist && consoleEnabled) {
        expect(lines.at(0)).toBe(`${String(consoleOutput.info.mock.calls.at(0)?.at(0))}\n`);
      }

      if (persistence.isJust) {
        await persistence.value.dispose();
      }
    },
  );

  it('keeps console output working after Origin Private File System failure and counts persistence failures', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const persistence = enableLogging({
      clock,
      consoleOutput,
      locationSearch: '?enableLogging=*',
      debugEnabled: false,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch('?enabled-features=persistent-browser-logs'),
      isElectron: false,
      createPersistenceOutput() {
        return Maybe.just(
          createBufferedLogOutput({
            clock,
            configuration: logPersistenceConfiguration,
            async append() {
              throw Object.assign(new Error('Quota exceeded'), {name: 'QuotaExceededError'});
            },
          }),
        );
      },
    });
    if (persistence.isNothing) {
      throw new Error('Expected browser log persistence when explicitly enabled');
    }

    await persistence.value.flush();
    logging.getLogger('component').error('Still visible');

    expect(consoleOutput.error).toHaveBeenCalledTimes(1);
    expect(persistence.value.getStatistics()).toMatchObject({failures: 1, suspended: true, droppedRecords: 1});
  });

  it.each(['unsupported', 'failed'] as const)('preserves console logging when persistence setup is %s', failure => {
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const persistence = enableLogging({
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      consoleOutput,
      locationSearch: '?enableLogging=*',
      debugEnabled: false,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch('?enabled-features=persistent-browser-logs'),
      isElectron: false,
      createPersistenceOutput() {
        if (failure === 'failed') {
          throw new Error('Browser capability unavailable');
        }

        return Maybe.nothing();
      },
    });
    logging.getLogger('component').info('Still visible');

    expect(persistence).toEqual(Maybe.nothing());
    expect(consoleOutput.info).toHaveBeenCalledTimes(1);
  });

  it('delivers to persistence even when the console destination throws', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const persistedLines: string[] = [];
    const logging = createPinoLogging(
      Maybe.just({
        clock,
        namespaces: Maybe.just('*'),
        output(): never {
          throw new Error('Console failure');
        },
        persistenceOutput: Maybe.just(function persistLine(line: string) {
          persistedLines.push(line);
        }),
      }),
    );

    logging.getLogger('component').info('Still persisted');

    expect(persistedLines).toHaveLength(1);
    expect(JSON.parse(String(persistedLines.at(0)))).toMatchObject({msg: 'Still persisted'});
  });
});
