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

import {createDeterministicClock, type DeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createConsoleLogSink} from './consoleLogSink';
import {createLogging, type LoggingDependencies, type LogRecord, type LogSink} from './structuredLogger';

type TestLoggingOptions = {
  readonly sinks: readonly LogSink[];
  readonly namespaces: Maybe<string>;
};

type TestLogging = {
  readonly clock: DeterministicClock;
  readonly logging: ReturnType<typeof createLogging>;
  readonly dependencies: LoggingDependencies;
};

function createTestLogging(options: TestLoggingOptions): TestLogging {
  const {sinks, namespaces} = options;
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1234000n});
  const dependencies: LoggingDependencies = {clock, sinks, namespaces};
  const logging = createLogging(Maybe.just(dependencies));

  return {clock, logging, dependencies};
}

describe('structured logging', () => {
  it.each(['debug', 'info', 'warn', 'error'] as const)(
    'creates synchronous %s records with an injected clock',
    level => {
      const sink = jest.fn<void, [LogRecord]>();
      const {logging} = createTestLogging({sinks: [sink], namespaces: Maybe.nothing()});
      const logger = logging.getLogger('@wireapp/webapp/WebSocketClient');

      expect(logger[level]('Connection opened')).toBeUndefined();
      expect(sink).toHaveBeenCalledWith({
        timestamp: 1234,
        level,
        component: '@wireapp/webapp/WebSocketClient',
        message: 'Connection opened',
        attributes: Maybe.nothing(),
      });
      expect(Object.keys(logger).sort()).toEqual(['debug', 'error', 'info', 'warn']);
    },
  );

  it('reads the injected clock for each accepted event', () => {
    const sink = jest.fn<void, [LogRecord]>();
    const {logging, clock} = createTestLogging({sinks: [sink], namespaces: Maybe.nothing()});
    const logger = logging.getLogger('component');

    logger.info('First event');
    clock.advanceByMilliseconds(25);
    logger.info('Second event');

    expect(
      sink.mock.calls.map(call => {
        return call[0].timestamp;
      }),
    ).toEqual([1234, 1259]);
  });

  it.each(['@wireapp/webapp/WebSocketClient', '@wireapp/api-client/Client', '@wireapp/core/Account'])(
    'preserves the complete component %s and unmodified attributes',
    component => {
      const sink = jest.fn<void, [LogRecord]>();
      const {logging} = createTestLogging({sinks: [sink], namespaces: Maybe.nothing()});
      const attributes = {attempt: 2, connected: false, error: new Error('Socket closed')};

      logging.getLogger(component).error('Connection failed', attributes);

      expect(sink).toHaveBeenCalledWith({
        timestamp: 1234,
        level: 'error',
        component,
        message: 'Connection failed',
        attributes: Maybe.just(attributes),
      });
      expect(sink.mock.calls[0]?.[0].attributes.unwrapOr({})).toBe(attributes);
    },
  );

  it.each([
    {
      namespaces: Maybe.nothing<string>(),
      expectedComponents: ['@wireapp/webapp/Client', '@wireapp/core/Client', 'other'],
    },
    {namespaces: Maybe.just(''), expectedComponents: []},
    {namespaces: Maybe.just('@wireapp/*'), expectedComponents: ['@wireapp/webapp/Client', '@wireapp/core/Client']},
    {namespaces: Maybe.just(' @wireapp/* , -@wireapp/core/* '), expectedComponents: ['@wireapp/webapp/Client']},
    {namespaces: Maybe.just('*,-@wireapp/*,@wireapp/core/*'), expectedComponents: ['@wireapp/core/Client', 'other']},
    {namespaces: Maybe.just('@wireapp/webapp/Client'), expectedComponents: ['@wireapp/webapp/Client']},
    {
      namespaces: Maybe.just('@wireapp/(webapp|core)/*'),
      expectedComponents: ['@wireapp/webapp/Client', '@wireapp/core/Client'],
    },
    {namespaces: Maybe.just('['), expectedComponents: []},
  ])('applies ordered anchored namespace rules: $namespaces', testCase => {
    const {namespaces, expectedComponents} = testCase;
    const sink = jest.fn<void, [LogRecord]>();
    const {logging} = createTestLogging({sinks: [sink], namespaces});

    ['@wireapp/webapp/Client', '@wireapp/core/Client', 'other'].forEach(component => {
      logging.getLogger(component).info('Connected');
    });

    expect(
      sink.mock.calls.map(call => {
        return call[0].component;
      }),
    ).toEqual(expectedComponents);
  });

  it('initializes previously created loggers and updates their injected configuration', () => {
    const sink = jest.fn<void, [LogRecord]>();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1234000n});
    const logging = createLogging(Maybe.nothing());
    const existingLogger = logging.getLogger('@wireapp/core/Account');

    existingLogger.error('Before initialization');
    expect(sink).not.toHaveBeenCalled();

    logging.configure(Maybe.just({clock, sinks: [sink], namespaces: Maybe.nothing<string>()}));
    existingLogger.info('After initialization');
    logging.getLogger('@wireapp/api-client/Client').debug('New logger');
    logging.configure(Maybe.just({clock, sinks: [sink], namespaces: Maybe.just('-*')}));
    existingLogger.warn('Disabled by filter');
    logging.configure(Maybe.nothing());
    existingLogger.warn('Detached outputs');

    expect(
      sink.mock.calls.map(call => {
        return call[0].message;
      }),
    ).toEqual(['After initialization', 'New logger']);
  });

  it('does not read the clock or serialize attributes for filtered events', () => {
    const readTimestamp = jest.fn().mockReturnValue(1234);
    const clock = {
      get currentUnixEpochMilliseconds(): number {
        return readTimestamp();
      },
    };
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
    const toJSON = jest.fn(() => {
      throw new Error('Should not serialize');
    });
    const logging = createLogging(
      Maybe.just({
        clock,
        sinks: [createConsoleLogSink({output})],
        namespaces: Maybe.just('*,-excluded'),
      }),
    );

    logging.getLogger('excluded').error('Filtered', {toJSON});

    expect(readTimestamp).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    expect(output.error).not.toHaveBeenCalled();
  });

  it('isolates failing outputs and continues delivering the same record to other outputs', () => {
    const failingSink = jest.fn((_: LogRecord) => {
      throw new Error('Output unavailable');
    });
    const workingSink = jest.fn<void, [LogRecord]>();
    const {logging} = createTestLogging({sinks: [failingSink, workingSink], namespaces: Maybe.nothing()});

    expect(() => {
      logging.getLogger('component').error('Failed to connect');
    }).not.toThrow();
    expect(failingSink).toHaveBeenCalledTimes(1);
    expect(workingSink).toHaveBeenCalledTimes(1);
    expect(workingSink.mock.calls[0]?.[0]).toBe(failingSink.mock.calls[0]?.[0]);
  });
});
