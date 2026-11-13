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

import {createConsoleLogSink} from './consoleLogSink';
import type {Logger} from './logger';
import {createLogging, type LogRecord} from './structuredLogger';

function createConsoleOutput(): Record<keyof Logger, jest.Mock<void, unknown[]>> {
  return {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
}

const record: LogRecord = {
  timestamp: 1760000000000,
  level: 'warn',
  component: '@wireapp/api-client/tcp/WebSocketClient',
  message: 'Connection interrupted',
  attributes: Maybe.just({attempt: 3, connectionId: 'abc'}),
};

describe('structured console output', () => {
  it.each([
    {level: 'debug', numericLevel: 20},
    {level: 'info', numericLevel: 30},
    {level: 'warn', numericLevel: 40},
    {level: 'error', numericLevel: 50},
  ] as const)('invokes console.$level once with one JSON string', testCase => {
    const {level, numericLevel} = testCase;
    const output = createConsoleOutput();
    const sink = createConsoleLogSink({output});

    sink({...record, level});

    expect(output[level]).toHaveBeenCalledTimes(1);
    const consoleArguments = output[level].mock.calls[0];
    expect(consoleArguments).toHaveLength(1);
    const serializedRecord = consoleArguments?.[0];
    expect(typeof serializedRecord).toBe('string');
    const actualRecord: unknown = JSON.parse(String(serializedRecord));
    expect(actualRecord).toEqual({
      level: numericLevel,
      time: 1760000000000,
      component: record.component,
      attempt: 3,
      connectionId: 'abc',
      msg: 'Connection interrupted',
    });
    expect(
      Object.values(output).reduce((count, method) => {
        return count + method.mock.calls.length;
      }, 0),
    ).toBe(1);
  });

  it('uses the same JSON console contract for browser inspection and Electron text capture', () => {
    const output = createConsoleOutput();
    const sink = createConsoleLogSink({output});
    const cause = new Error('Socket closed');
    const error = new Error('Connection failed', {cause});

    sink({...record, message: 'Literal %s %c message\nsecond line', attributes: Maybe.just({error})});

    const capturedConsoleText = String(output.warn.mock.calls[0]?.[0]);
    const capturedRecord: unknown = JSON.parse(capturedConsoleText);

    expect(capturedRecord).toEqual({
      level: 40,
      time: record.timestamp,
      component: record.component,
      msg: 'Literal %s %c message\nsecond line',
      error: {
        name: 'Error',
        message: error.message,
        stack: error.stack,
        cause: {name: 'Error', message: cause.message, stack: cause.stack},
      },
    });
    expect(capturedConsoleText).toMatch(/^\{/u);
    expect(capturedConsoleText).not.toMatch(/[\r\n\u001b]/u);
    expect(capturedConsoleText).not.toContain('[WebSocketClient]');
    expect(capturedConsoleText).not.toContain('[WARN]');
  });

  it('contains console failures even when used directly', () => {
    const output = createConsoleOutput();
    output.warn.mockImplementation(() => {
      throw new Error('Console unavailable');
    });

    expect(() => {
      createConsoleLogSink({output})(record);
    }).not.toThrow();
    expect(output.warn).toHaveBeenCalledTimes(1);
  });

  it('contains serialization failures without interrupting application logic', () => {
    const output = createConsoleOutput();
    const logging = createLogging(
      Maybe.just({
        clock: createDeterministicClock({initialUnixEpochMicroseconds: 1760000000000000n}),
        sinks: [createConsoleLogSink({output})],
        namespaces: Maybe.nothing<string>(),
      }),
    );
    const attributes = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('Cannot enumerate');
        },
      },
    );

    expect(() => {
      logging.getLogger(record.component).error(record.message, attributes);
    }).not.toThrow();
    const actualRecord: unknown = JSON.parse(String(output.error.mock.calls[0]?.[0]));
    expect(actualRecord).toEqual({
      level: 50,
      time: record.timestamp,
      component: record.component,
      msg: record.message,
      attributes: '[Unserializable Object]',
    });
  });
});
