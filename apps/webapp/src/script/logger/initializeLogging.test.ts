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
import {noop} from 'noop-esm';
import {Maybe} from 'true-myth';

import {createPinoLogging} from './createPinoLogging';
import {initializeLogging} from './initializeLogging';
import {createBrowserLogPersistence, type BrowserLogPersistence} from './createBrowserLogPersistence';
import {createDesktopLogOutput} from './createDesktopLogOutput';
import {selectDesktopApplicationLogWrite} from './selectDesktopApplicationLogWrite';
import {createLogWorkerConnectionForTest} from './test/createLogWorkerConnectionForTest';

import {createStartupFeatureTogglesFromLocationSearch} from '../featureToggles/startupFeatureToggles';

const disabledPersistenceOptions = {
  loggingEnabled: true,
  browserPersistenceEnabled: false,
  createPersistenceOutput() {
    return Maybe.nothing<BrowserLogPersistence>();
  },
};

type TestPersistenceOptions = {
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly append: (lines: readonly string[]) => Promise<void>;
};

function createTestPersistence(options: TestPersistenceOptions): Maybe<BrowserLogPersistence> {
  const {clock, append} = options;
  const worker = createLogWorkerConnectionForTest();
  worker.state.onPost = async request => {
    try {
      await append(request.type === 'append' ? request.lines : []);
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'complete'});
    } catch {
      worker.emitMessage({requestIdentifier: request.requestIdentifier, outcome: 'failed'});
    }
  };

  return createBrowserLogPersistence({
    clock,
    createWorker() {
      return Maybe.just(worker.connection);
    },
    lifecycle: {
      isHidden() {
        return false;
      },
      subscribeToVisibilityChanges() {
        return noop;
      },
    },
  });
}

describe('logging startup', () => {
  it.each(['?debugLogging=*', '?enableLogging=*'])(
    'keeps standalone logging disabled when the save picker is unavailable despite %s',
    locationSearch => {
      const logging = createPinoLogging(Maybe.nothing());
      const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
      const configureLogging = jest.fn(logging.configure);
      const createPersistenceOutput = jest.fn();
      const storage = {setItem: jest.fn(), removeItem: jest.fn()};
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
      initializeLogging({
        loggingEnabled: false,
        browserPersistenceEnabled: false,
        createPersistenceOutput,
        debugEnabled: false,
        developerConsoleEnabled: false,
        clock,
        consoleOutput,
        locationSearch,
        storage: Maybe.just(storage),
        configureLogging,
      });
      logging.getLogger('Startup').debug('debug diagnostic');
      logging.getLogger('Startup').error('error diagnostic');

      expect(configureLogging).toHaveBeenCalledWith(Maybe.nothing());
      expect(createPersistenceOutput).not.toHaveBeenCalled();
      expect(consoleOutput.debug).not.toHaveBeenCalled();
      expect(consoleOutput.error).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
      expect(storage.removeItem).not.toHaveBeenCalled();
    },
  );

  it.each([
    {locationSearch: '?enableLogging=@wireapp/*', debugRecords: 1},
    {locationSearch: '?enableLogging=@wireapp/*&debugLogging=', debugRecords: 0},
    {
      locationSearch: '?enableLogging=@wireapp/*&debugLogging=-*',
      debugRecords: 0,
    },
    {
      locationSearch: '?debugLogging=@wireapp/webapp/Startup&enableLogging=-*',
      debugRecords: 1,
    },
  ])('preserves the only Desktop console transport with $locationSearch', options => {
    const {locationSearch, debugRecords} = options;
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    initializeLogging({
      ...disabledPersistenceOptions,
      debugEnabled: false,
      developerConsoleEnabled: false,
      clock,
      consoleOutput,
      locationSearch,
      shouldWriteConsoleFallback() {
        return true;
      },
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });
    const logger = logging.getLogger('@wireapp/webapp/Startup');
    logger.debug('debug diagnostic');
    logger.info('info diagnostic');
    logger.warn('warn diagnostic');
    logger.error('error diagnostic');

    expect(consoleOutput.debug).toHaveBeenCalledTimes(debugRecords);
    expect(consoleOutput.info).toHaveBeenCalledTimes(1);
    expect(consoleOutput.warn).toHaveBeenCalledTimes(1);
    expect(consoleOutput.error).toHaveBeenCalledTimes(1);
  });

  it('preserves release Desktop fallback with an exposed capability and the feature disabled', () => {
    const logging = createPinoLogging(Maybe.nothing());
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const nativeWrite = jest.fn(async () => {
      return 'written';
    });
    const selection = selectDesktopApplicationLogWrite({
      isDesktopApp: true,
      startupFeatureToggles: createStartupFeatureTogglesFromLocationSearch(''),
      readCapability() {
        return {version: 1, write: nativeWrite};
      },
    });
    initializeLogging({
      ...disabledPersistenceOptions,
      debugEnabled: false,
      developerConsoleEnabled: false,
      clock,
      consoleOutput,
      locationSearch: '?enableLogging=@wireapp/*&debugLogging=',
      shouldWriteConsoleFallback() {
        return selection.isNothing;
      },
      desktopPersistenceOutput: selection
        .map(writeToDesktop => {
          return createDesktopLogOutput({clock, writeToDesktop, reportFailure: noop}).write;
        })
        .unwrapOr(undefined),
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });
    const logger = logging.getLogger('@wireapp/webapp/Startup');
    logger.debug('disabled debug');
    logger.info('sole persistence destination');

    expect(nativeWrite).not.toHaveBeenCalled();
    expect(consoleOutput.debug).not.toHaveBeenCalled();
    expect(consoleOutput.info).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      configuredDebug: false,
      locationSearch: '?debugLogging=Selected',
      expectedLevels: [20, 30, 40, 50],
    },
    {
      configuredDebug: true,
      locationSearch: '',
      expectedLevels: [20, 20, 30, 40, 50],
    },
  ])('persists INFO, WARN, ERROR and enabled DEBUG to OPFS with a quiet console ($locationSearch)', async options => {
    const {configuredDebug, locationSearch, expectedLevels} = options;
    const logging = createPinoLogging(Maybe.nothing());
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const persistedLines: string[] = [];
    const persistence = initializeLogging({
      loggingEnabled: true,
      debugEnabled: configuredDebug,
      developerConsoleEnabled: false,
      clock,
      consoleOutput,
      locationSearch,
      browserPersistenceEnabled: true,
      createPersistenceOutput() {
        return createTestPersistence({
          clock,
          async append(lines) {
            persistedLines.push(...lines);
          },
        });
      },
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });
    const selected = logging.getLogger('Selected');
    const excluded = logging.getLogger('Excluded');
    selected.debug('explicit debug');
    excluded.debug('excluded debug');
    excluded.info('persistent info');
    excluded.warn('persistent warning');
    excluded.error('persistent error');
    if (persistence.isJust) {
      await persistence.value.dispose();
    }

    expect(
      persistedLines.map(line => {
        return JSON.parse(line).level;
      }),
    ).toEqual(expectedLevels);
    expect(consoleOutput.debug).not.toHaveBeenCalled();
    expect(consoleOutput.info).not.toHaveBeenCalled();
    expect(consoleOutput.warn).not.toHaveBeenCalled();
    expect(consoleOutput.error).not.toHaveBeenCalled();
  });

  it('uses the release Desktop console until acknowledgement and after transport failure', async () => {
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const writeToDesktop = jest.fn().mockResolvedValueOnce('written').mockResolvedValueOnce('failed');
    const desktop = createDesktopLogOutput({clock, writeToDesktop, reportFailure: noop});
    initializeLogging({
      ...disabledPersistenceOptions,
      debugEnabled: false,
      developerConsoleEnabled: false,
      clock,
      consoleOutput,
      locationSearch: '?debugLogging=*,-Excluded',
      desktopPersistenceOutput: desktop.write,
      shouldWriteConsoleFallback() {
        return !desktop.hasConfirmedDelivery();
      },
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });
    logging.getLogger('Excluded').info('startup');
    await desktop.flush();
    logging.getLogger('Selected').debug('persist only');
    logging.getLogger('Excluded').debug('excluded');
    logging.getLogger('Excluded').warn('still persisted');
    await desktop.flush();
    logging.getLogger('Excluded').error('fallback restored');

    expect(consoleOutput.info).toHaveBeenCalledTimes(1);
    expect(consoleOutput.debug).not.toHaveBeenCalled();
    expect(consoleOutput.warn).not.toHaveBeenCalled();
    expect(consoleOutput.error).toHaveBeenCalledTimes(1);
    const persistedMessages = writeToDesktop.mock.calls.flatMap(([batch]: [string[]]) => {
      return batch.map(line => {
        return JSON.parse(line).msg;
      });
    });
    expect(persistedMessages).toEqual(['startup', 'persist only', 'still persisted']);
  });

  it.each([
    {search: '', debugEnabled: false, expected: Maybe.nothing<string>(), calls: 0},
    {search: '', debugEnabled: true, expected: Maybe.just('*'), calls: 1},
    {search: '?enableLogging=', debugEnabled: false, expected: Maybe.nothing<string>(), calls: 0},
    {search: '?enableLogging=', debugEnabled: true, expected: Maybe.just('*'), calls: 1},
    {search: '?enableLogging=*&debugLogging=', debugEnabled: false, expected: Maybe.nothing<string>(), calls: 0},
    {search: '?enableLogging=-*&debugLogging=', debugEnabled: true, expected: Maybe.just('*'), calls: 1},
    {search: '?debugLogging=*&enableLogging=-*', debugEnabled: false, expected: Maybe.just('*'), calls: 1},
    {
      search: '?debugLogging=@wireapp/*,-@wireapp/core/*',
      debugEnabled: true,
      expected: Maybe.just('@wireapp/*,-@wireapp/core/*'),
      calls: 1,
    },
    {search: '?debugLogging=-*', debugEnabled: true, expected: Maybe.just('-*'), calls: 0},
    {search: '?debugLogging=(a%2B)%2B%24', debugEnabled: true, expected: Maybe.just('(a+)+$'), calls: 0},
    {search: '?debugLogging=*,-', debugEnabled: true, expected: Maybe.just('*,-'), calls: 0},
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

    initializeLogging({
      ...disabledPersistenceOptions,
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
      consoleOutput: output,
      locationSearch: search,
      debugEnabled,
      developerConsoleEnabled: true,
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
    initializeLogging({
      ...disabledPersistenceOptions,
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
      consoleOutput: output,
      locationSearch: '?debugLogging=*',
      debugEnabled: false,
      developerConsoleEnabled: true,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
    });

    logging.getLogger('component').debug('Enabled');

    expect(output.debug).toHaveBeenCalledTimes(1);
  });

  describe.each(['browser', 'desktop'])('debug eligibility with %s persistence', environment => {
    it.each([
      {query: '', debugEnabled: false, expected: []},
      {query: '&debugLogging=*', debugEnabled: false, expected: ['Application/Selected', 'Application/Other']},
      {query: '&debugLogging=Application/Selected', debugEnabled: false, expected: ['Application/Selected']},
      {query: '&debugLogging=*,-Application/Other', debugEnabled: true, expected: ['Application/Selected']},
      {
        query: '&debugLogging=*,-Application/*,Application/Other',
        debugEnabled: false,
        expected: ['Application/Other'],
      },
      {query: '&enableLogging=Application/Other', debugEnabled: false, expected: ['Application/Other']},
      {
        query: '&enableLogging=*&debugLogging=Application/Selected',
        debugEnabled: false,
        expected: ['Application/Selected'],
      },
      {query: '&enableLogging=*&debugLogging=', debugEnabled: false, expected: []},
      {query: '', debugEnabled: true, expected: ['Application/Selected', 'Application/Other']},
    ])('uses $query with ENABLE_DEBUG=$debugEnabled', async options => {
      const {query, debugEnabled, expected} = options;
      const isElectron = environment === 'desktop';
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
      const logging = createPinoLogging(Maybe.nothing());
      const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
      const persistedLines: string[] = [];
      const nativeOutput = createDesktopLogOutput({
        clock,
        async writeToDesktop(records) {
          persistedLines.push(...records);

          return 'written';
        },
        reportFailure: noop,
      });
      const locationSearch = '?enabled-features=desktop-structured-logs' + query;
      const browserPersistence = initializeLogging({
        clock,
        consoleOutput,
        locationSearch,
        loggingEnabled: true,
        debugEnabled,
        developerConsoleEnabled: true,
        storage: Maybe.nothing(),
        configureLogging: logging.configure,
        browserPersistenceEnabled: !isElectron,
        desktopPersistenceOutput: isElectron ? nativeOutput.write : undefined,
        createPersistenceOutput() {
          return createTestPersistence({
            clock,
            async append(lines) {
              persistedLines.push(...lines);
            },
          });
        },
      });

      const toJSON = jest.fn(() => {
        return 'serialized';
      });
      logging.getLogger('Application/Selected').debug('Selected debug', {projection: {toJSON}});
      const otherLogger = logging.getLogger('Application/Other');
      otherLogger.debug('Other debug', {projection: {toJSON}});
      otherLogger.info('Persistent info');
      otherLogger.warn('Persistent warning');
      otherLogger.error('Persistent error');
      if (browserPersistence.isJust) {
        await browserPersistence.value.dispose();
      } else {
        await nativeOutput.flush();
      }

      const persistedRecords = persistedLines.map(line => {
        return JSON.parse(line) as Readonly<Record<string, unknown>>;
      });
      const persistedDebugComponents = persistedRecords
        .filter(record => {
          return record['level'] === 20;
        })
        .map(record => {
          return record['component'];
        });
      const consoleDebugComponents = consoleOutput.debug.mock.calls.map(call => {
        const record: Readonly<Record<string, unknown>> = JSON.parse(call[0]);

        return record['component'];
      });
      expect(persistedDebugComponents).toEqual(expected);
      expect(consoleDebugComponents).toEqual(expected);
      expect(toJSON).toHaveBeenCalledTimes(expected.length);
      expect(persistedRecords.slice(expected.length)).toMatchObject([
        {level: 30, msg: 'Persistent info'},
        {level: 40, msg: 'Persistent warning'},
        {level: 50, msg: 'Persistent error'},
      ]);
    });
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
      initializeLogging({
        ...disabledPersistenceOptions,
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 1000n}),
        consoleOutput: output,
        locationSearch: '',
        debugEnabled: true,
        developerConsoleEnabled: true,
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
        return createTestPersistence({clock, append});
      });
      const logging = createPinoLogging(Maybe.nothing());
      const loggingEnabled = isElectron || persistenceEnabled;
      const shouldWriteConsole = loggingEnabled && consoleEnabled;
      const locationSearch = `?enabled-features=mark-as-unread${consoleEnabled ? '&debugLogging=selected' : ''}`;
      const startupFeatureToggles = createStartupFeatureTogglesFromLocationSearch(locationSearch);
      const persistence = initializeLogging({
        loggingEnabled,
        clock,
        consoleOutput,
        locationSearch,
        debugEnabled: false,
        developerConsoleEnabled: true,
        storage: Maybe.nothing(),
        configureLogging: logging.configure,
        browserPersistenceEnabled: persistenceEnabled && !isElectron,
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
      expect(consoleOutput.info).toHaveBeenCalledTimes(shouldWriteConsole ? 1 : 0);
      expect(consoleOutput.warn).not.toHaveBeenCalled();
      expect(startupFeatureToggles.isFeatureToggleEnabled('mark-as-unread')).toBe(true);
      expect(serializationCount).toBe(shouldWriteConsole || shouldPersist ? 1 : 0);
      const lines = append.mock.calls.flatMap(call => {
        return call[0];
      });
      expect(lines).toHaveLength(shouldPersist ? 2 : 0);
      expect(lines.join('')).not.toContain('secret-');
      if (shouldPersist && shouldWriteConsole) {
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
    const persistence = initializeLogging({
      loggingEnabled: true,
      clock,
      consoleOutput,
      locationSearch: '?debugLogging=*',
      debugEnabled: false,
      developerConsoleEnabled: true,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
      browserPersistenceEnabled: true,
      createPersistenceOutput() {
        return createTestPersistence({
          clock,
          async append() {
            throw Object.assign(new Error('Quota exceeded'), {name: 'QuotaExceededError'});
          },
        });
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

  it('exposes binding through startup and keeps console logging independent of failed binding', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const worker = createLogWorkerConnectionForTest();
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    worker.state.onPost = request => {
      worker.emitMessage({
        requestIdentifier: request.requestIdentifier,
        outcome: request.type === 'bind-account' ? 'failed' : 'complete',
      });
    };
    const persistence = initializeLogging({
      loggingEnabled: true,
      clock,
      consoleOutput,
      locationSearch: '?debugLogging=*',
      debugEnabled: false,
      developerConsoleEnabled: true,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
      browserPersistenceEnabled: true,
      createPersistenceOutput() {
        return createBrowserLogPersistence({
          clock,
          createWorker() {
            return Maybe.just(worker.connection);
          },
          lifecycle: {
            isHidden() {
              return false;
            },
            subscribeToVisibilityChanges() {
              return noop;
            },
          },
        });
      },
    }).unwrapOrElse(() => {
      throw new Error('Expected persistence');
    });

    const binding = persistence.bindAccount('a'.repeat(64));
    logging.getLogger('component').info('Visible during binding');
    expect((await binding).isErr).toBe(true);
    logging.getLogger('component').error('Visible after failure');
    await persistence.flush();

    expect(consoleOutput.info).toHaveBeenCalledTimes(1);
    expect(consoleOutput.error).toHaveBeenCalledTimes(1);
    expect(
      worker.requests.map(request => {
        return request.type;
      }),
    ).toEqual(['initialize', 'bind-account']);
    expect(persistence.getStatistics()).toMatchObject({failures: 1, suspended: true, droppedRecords: 2});
    await persistence.dispose();
  });

  it.each(['unsupported', 'failed'] as const)('preserves console logging when persistence setup is %s', failure => {
    const logging = createPinoLogging(Maybe.nothing());
    const consoleOutput = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const persistence = initializeLogging({
      loggingEnabled: true,
      clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
      consoleOutput,
      locationSearch: '?debugLogging=*',
      debugEnabled: false,
      developerConsoleEnabled: true,
      storage: Maybe.nothing(),
      configureLogging: logging.configure,
      browserPersistenceEnabled: true,
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
