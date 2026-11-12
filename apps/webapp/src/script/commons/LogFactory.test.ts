/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import * as fs from 'fs-extra';

import os from 'os';
import path from 'path';

import {LogFactory} from './LogFactory';
import {getSafeErrorDetails, redactSensitiveData, sanitizeLogMessage} from './util/StringUtil';

describe('LogFactory', () => {
  describe('createLoggerName', () => {
    it('provides a convenient solution to get a nice logger name', () => {
      const loggerName = LogFactory.createLoggerName('LogFactory', 'example', '::');
      expect(loggerName).toBe('example::LogFactory');
    });

    it('does not add empty strings to the logger name', () => {
      const loggerName = LogFactory.createLoggerName('LogFactory', '', '::');
      expect(loggerName).toBe('LogFactory');
    });

    it.each(['@wireapp/webapp/Connection', '@wireapp/api-client/Connection', '@wireapp/core/Connection'])(
      'preserves the complete component identifier %s',
      name => {
        expect(LogFactory.createLoggerName(name)).toBe(name);
      },
    );
  });

  describe('getLogger', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('exposes only the Wire logging contract', () => {
      const logger = LogFactory.getLogger('ContractLogger');

      expect(Object.keys(logger).sort()).toEqual(['debug', 'error', 'info', 'warn']);
    });

    it.each(['debug', 'info', 'warn', 'error'] as const)('preserves console severity and timestamps for %s', level => {
      const consoleOutput = jest.spyOn(console, level).mockImplementation(jest.fn());
      const logger = LogFactory.getLogger(`SeverityLogger/${level}`, {forceEnable: true});
      const attributes = {connectionId: 'connection-1'};

      logger[level]('Connection established', attributes);

      const actualConsoleArguments: unknown[] = consoleOutput.mock.calls.flat();

      expect(consoleOutput).toHaveBeenCalledTimes(1);
      expect(actualConsoleArguments).toContain('Connection established');
      expect(actualConsoleArguments).toContain(attributes);
      expect(actualConsoleArguments.join(' ')).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/u);
    });

    it('supports namespaces in console output', () => {
      const consoleOutput = jest.spyOn(console, 'info').mockImplementation(jest.fn());
      const name = 'LogFactory';
      const namespace = 'OurCompany';
      const logger = LogFactory.getLogger(name, {namespace, forceEnable: true});

      logger.info('Namespaced message');

      expect(consoleOutput.mock.calls.flat().join(' ')).toContain(`${namespace}::${name}`);
    });

    it('supports namespaces and separators', () => {
      const consoleOutput = jest.spyOn(console, 'info').mockImplementation(jest.fn());
      const name = 'LogFactory';
      const namespace = 'OurCompany';
      const separator = '-';
      const logger = LogFactory.getLogger(name, {namespace, separator, forceEnable: true});

      logger.info('Namespaced message');

      expect(consoleOutput.mock.calls.flat().join(' ')).toContain(`${namespace}${separator}${name}`);
    });
  });

  describe('writeMessage', () => {
    const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webapp-commons-'));

    afterEach(() => {
      return fs.remove(logDir);
    });

    it('appends text to a log file', async () => {
      const logFile = path.join(logDir, 'test.log');

      const logMessage1 = 'This is a first test';
      const logMessage2 = 'This is a second test';

      await LogFactory.writeMessage(logMessage1, logFile);
      await LogFactory.writeMessage(logMessage2, logFile);
      const result = await fs.readFile(logFile, 'utf-8');
      expect(result).toBe(`${logMessage1}${os.EOL}${logMessage2}${os.EOL}`);
    });

    it('strips ANSI escape codes', async () => {
      const logFile = path.join(logDir, 'test.log');

      const logMessage1 = 'This is a first test';
      const logMessage2 = 'This is a second test';
      const logAnsiMessage2 = `\u001B[4m${logMessage2}\u001B[0m`;

      await LogFactory.writeMessage(logMessage1, logFile);
      await LogFactory.writeMessage(logAnsiMessage2, logFile);
      const result = await fs.readFile(logFile, 'utf-8');
      expect(result).toBe(`${logMessage1}${os.EOL}${logMessage2}${os.EOL}`);
    });
  });
});

describe('redactSensitiveData', () => {
  it('redacts Bearer token in plain strings', () => {
    const input = 'Authorization: Bearer abcd1234.DEF456ghi==';
    const output = redactSensitiveData(input);
    expect(output).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts Authorization header in object', () => {
    const input = {
      headers: {
        Authorization: 'Bearer my.secret.token',
      },
    };
    const output = redactSensitiveData(input);
    expect(output.headers.Authorization).toBe('Bearer [REDACTED]');
  });

  it('does not modify unrelated strings', () => {
    const input = 'This is safe';
    const output = redactSensitiveData(input);
    expect(output).toBe('This is safe');
  });

  it('does not modify unrelated objects', () => {
    const input = {foo: 'bar'};
    const output = redactSensitiveData(input);
    expect(output).toEqual({foo: 'bar'});
  });
});

describe('sanitizeLogMessage', () => {
  it('redacts query parameters, cookies, and JSON web tokens', () => {
    const jwtLikeValue = ['eyJhbGciOiJub25lIn0', 'eyJzdWIiOiIxIn0', 'signature'].join('.');
    const input = `wss://example.com/events?access_token=access-token&sync_marker=sync-marker Cookie: session=cookie-value ${jwtLikeValue}`;

    const actualSanitizedMessage = sanitizeLogMessage(input);
    const expectedSanitizedMessage = 'wss://example.com/events?[REDACTED] Cookie: [REDACTED] [REDACTED]';

    expect(actualSanitizedMessage).toBe(expectedSanitizedMessage);
  });

  it('removes newlines and limits the message length', () => {
    const actualSanitizedMessage = sanitizeLogMessage(`first line\n${'x'.repeat(250)}`);

    expect(actualSanitizedMessage).toHaveLength(200);
    expect(actualSanitizedMessage).toContain('first line ');
  });
});

describe('getSafeErrorDetails', () => {
  it('returns a safe error name and message', () => {
    const actualErrorDetails = getSafeErrorDetails(
      Object.assign(new Error('Bearer secret-token'), {name: 'RequestError'}),
    );

    expect(actualErrorDetails).toEqual({
      errorMessage: '"Bearer [REDACTED]"',
      errorName: 'RequestError',
    });
  });
});
