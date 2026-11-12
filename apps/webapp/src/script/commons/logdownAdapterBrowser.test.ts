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

import {LogFactory} from './LogFactory';
import type {Logger} from './logger';
import {createLogdownAdapter} from './logdownAdapter';

function createConsoleOutput(): Record<keyof Logger, jest.Mock<void, unknown[]>> {
  return {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
}

describe('Logdown browser compatibility', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it.each(['debug', 'info', 'warn', 'error'] as const)(
    'preserves browser console %s output and inspectable errors',
    level => {
      localStorage.setItem('debug', '@wireapp/*');

      // Load the actual browser backend after setting its startup configuration, without replacing any modules.
      jest.isolateModules(() => {
        const browserLogdown = jest.requireActual<typeof import('logdown')>('logdown/src/browser');
        const consoleOutput = createConsoleOutput();
        const output = browserLogdown('@wireapp/webapp/Connection', {logger: consoleOutput, markdown: false});
        browserLogdown.transports.push(LogFactory.addTimestamp);
        const logger = createLogdownAdapter({output, serializeForDesktop: false});
        const error = new Error('Socket closed');
        const attributes = {error, connectionId: 'connection-1'};

        logger[level]('Connection interrupted', attributes);

        const actualConsoleArguments = consoleOutput[level].mock.calls.flat();

        expect(consoleOutput[level]).toHaveBeenCalledTimes(1);
        expect(actualConsoleArguments).toContain(attributes);
        expect(actualConsoleArguments).toContain('Connection interrupted');
        expect(actualConsoleArguments.join(' ')).toContain('@wireapp/webapp/Connection');
        expect(actualConsoleArguments.join(' ')).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/u);
      });
    },
  );

  it('retains namespace-based startup enablement, including exclusions', () => {
    localStorage.setItem('debug', '@wireapp/*,-@wireapp/core/*');

    jest.isolateModules(() => {
      const browserLogdown = jest.requireActual<typeof import('logdown')>('logdown/src/browser');
      const consoleOutput = createConsoleOutput();

      for (const name of ['@wireapp/webapp/Connection', '@wireapp/api-client/Connection', '@wireapp/core/Connection']) {
        const output = browserLogdown(name, {logger: consoleOutput, markdown: false});
        const logger = createLogdownAdapter({output, serializeForDesktop: false});

        logger.info('Connection established');
      }

      expect(consoleOutput.info).toHaveBeenCalledTimes(2);
      expect(consoleOutput.info.mock.calls.flat().join(' ')).toContain('@wireapp/webapp/Connection');
      expect(consoleOutput.info.mock.calls.flat().join(' ')).toContain('@wireapp/api-client/Connection');
      expect(consoleOutput.info.mock.calls.flat().join(' ')).not.toContain('@wireapp/core/Connection');
    });
  });

  it('keeps browser logging disabled without startup enablement', () => {
    localStorage.removeItem('debug');

    jest.isolateModules(() => {
      const browserLogdown = jest.requireActual<typeof import('logdown')>('logdown/src/browser');
      const consoleOutput = createConsoleOutput();
      const output = browserLogdown('@wireapp/webapp/Disabled', {logger: consoleOutput});
      const logger = createLogdownAdapter({output, serializeForDesktop: false});

      logger.error('Connection interrupted', {error: new Error('Socket closed')});

      expect(consoleOutput.error).not.toHaveBeenCalled();
    });
  });

  it('keeps component, timestamp, message, and attributes in text captured by Electron', () => {
    localStorage.setItem('debug', '@wireapp/*');

    jest.isolateModules(() => {
      const browserLogdown = jest.requireActual<typeof import('logdown')>('logdown/src/browser');
      const consoleOutput = createConsoleOutput();
      const output = browserLogdown('@wireapp/core/Connection', {logger: consoleOutput, markdown: false});
      browserLogdown.transports.push(LogFactory.addTimestamp);
      const logger = createLogdownAdapter({output, serializeForDesktop: true});

      logger.error('Failed to connect', {connectionId: 'connection-1', error: new Error('Socket closed')});

      const actualConsoleArguments = consoleOutput.error.mock.calls.flat();
      const actualConsoleText = actualConsoleArguments.join(' ');

      expect(
        actualConsoleArguments.every(value => {
          return typeof value === 'string';
        }),
      ).toBe(true);
      expect(actualConsoleText).toContain('@wireapp/core/Connection');
      expect(actualConsoleText).toContain('Failed to connect');
      expect(actualConsoleText).toContain('"connectionId":"connection-1"');
      expect(actualConsoleText).toContain('"name":"Error"');
      expect(actualConsoleText).toContain('"message":"Socket closed"');
      expect(actualConsoleText).toContain('"stack":');
      expect(actualConsoleText).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/u);
    });
  });
});
