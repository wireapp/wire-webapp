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

import {LogFactory} from '@wireapp/commons';

describe('LogFactory', () => {
  describe('createLoggerName', () => {
    it('provides a convenient solution to get a nice logger name', () => {
      const loggerName = LogFactory.createLoggerName('LogFactory', '@wireapp/commons', '::');
      expect(loggerName).toBe('@wireapp/commons::LogFactory');
    });

    it('does not add empty strings to the logger name', () => {
      const loggerName = LogFactory.createLoggerName('LogFactory', '', '::');
      expect(loggerName).toBe('LogFactory');
    });
  });

  describe('getLogger', () => {
    it('sets a different color for every new logger', () => {
      const firstLogger = LogFactory.getLogger('FirstLogger');
      const secondLogger = LogFactory.getLogger('SecondLogger');
      expect((firstLogger as any).opts.prefixColor).not.toBe((secondLogger as any).opts.prefixColor);
    });

    it('supports namespaces', () => {
      const name = 'LogFactory';
      const namespace = 'OurCompany';
      const logger = LogFactory.getLogger(name, {namespace});
      expect((logger as any).opts.prefix.startsWith(namespace)).toBe(true);
    });

    it('supports namespaces and separators', () => {
      const name = 'LogFactory';
      const namespace = 'OurCompany';
      const separator = '-';
      const logger = LogFactory.getLogger('LogFactory', {namespace, separator});
      expect((logger as any).opts.prefix).toBe(`${namespace}${separator}${name}`);
    });
  });

  describe('writeMessage', () => {
    const logDir = path.join(__dirname, '../../.temp');

    afterEach(() => fs.remove(logDir));

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
