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

import type {Logger} from './logger';
import {createLogdownAdapter} from './logdownAdapter';

function createLogOutput(): Record<keyof Logger, jest.Mock<void, unknown[]>> {
  return {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
}

describe('createLogdownAdapter', () => {
  it.each(['debug', 'info', 'warn', 'error'] as const)('forwards message-only %s calls synchronously', level => {
    const output = createLogOutput();
    const logger = createLogdownAdapter({output, serializeForDesktop: false});

    const actualReturnValue = logger[level]('Connection established');

    expect(actualReturnValue).toBeUndefined();
    expect(output[level]).toHaveBeenCalledWith('Connection established');
    expect(
      Object.values(output).reduce((count, method) => {
        return count + method.mock.calls.length;
      }, 0),
    ).toBe(1);
  });

  it.each(['debug', 'info', 'warn', 'error'] as const)(
    'preserves structured attributes for browser %s calls',
    level => {
      const output = createLogOutput();
      const logger = createLogdownAdapter({output, serializeForDesktop: false});
      const error = new Error('Connection closed');
      const attributes = {connectionId: 'connection-1', attempt: 2, error};

      logger[level]('Connection interrupted', attributes);

      expect(output[level]).toHaveBeenCalledWith('Connection interrupted', attributes);
      expect(output[level].mock.calls[0]?.[1]).toBe(attributes);
      expect(attributes.error).toBe(error);
    },
  );

  it.each(['debug', 'info', 'warn', 'error'] as const)('serializes attributes for Desktop %s calls', level => {
    const output = createLogOutput();
    const logger = createLogdownAdapter({output, serializeForDesktop: true});

    logger[level]('Connection interrupted', {connectionId: 'connection-1', attempt: 2});

    expect(output[level]).toHaveBeenCalledWith('Connection interrupted', '{"connectionId":"connection-1","attempt":2}');
  });

  it('keeps error details, causes, and custom fields in Desktop console text', () => {
    const output = createLogOutput();
    const logger = createLogdownAdapter({output, serializeForDesktop: true});
    const cause = new Error('Socket closed');
    const error = Object.assign(new Error('Connection failed', {cause}), {code: 'CONNECTION_FAILED'});

    logger.error('Failed to connect', {error, connectionId: 'connection-1'});

    const actualSerializedAttributes: unknown = JSON.parse(output.error.mock.calls[0]?.[1] as string);

    expect(actualSerializedAttributes).toEqual({
      connectionId: 'connection-1',
      error: {
        code: 'CONNECTION_FAILED',
        name: 'Error',
        message: 'Connection failed',
        stack: error.stack,
        cause: {name: 'Error', message: 'Socket closed', stack: cause.stack},
      },
    });
  });

  it.each(['connection failed', 42, false, null, undefined, {reason: 'connection failed'}])(
    'preserves an unknown thrown value in Desktop attributes: %p',
    error => {
      const output = createLogOutput();
      const logger = createLogdownAdapter({output, serializeForDesktop: true});

      logger.error('Failed to connect', {error});

      expect(output.error).toHaveBeenCalledWith('Failed to connect', JSON.stringify({error}));
    },
  );

  it('retains existing Desktop sanitization, truncation, and circular-reference safeguards', () => {
    const output = createLogOutput();
    const logger = createLogdownAdapter({output, serializeForDesktop: true});
    const error = new Error('Authorization: Bearer secret-token');
    Object.assign(error, {cause: error});

    logger.error('Failed to connect with Bearer secret-token', {error});
    logger.info('x'.repeat(11_000));
    logger.info('Large attributes', {description: 'x'.repeat(11_000)});

    expect(output.error).toHaveBeenCalledWith(
      'Failed to connect with Bearer [REDACTED]',
      expect.stringContaining('"cause":"[Circular]"'),
    );
    expect(output.error.mock.calls[0]?.[1]).not.toContain('secret-token');
    expect(output.info.mock.calls[0]?.[0]).toHaveLength(10_000);
    expect(output.info.mock.calls[0]?.[0]).toMatch(/\.\.\. \[truncated\]$/u);
    expect(output.info.mock.calls[1]?.[1]).toHaveLength(10_000);
  });

  it('contains only the Wire contract and accepts a simple fake logger', () => {
    const output = createLogOutput();
    const logger = createLogdownAdapter({output, serializeForDesktop: false});
    const fakeLogger: Logger = createLogOutput();

    fakeLogger.info('Connection established', {connectionId: 'connection-1'});

    expect(Object.keys(logger).sort()).toEqual(['debug', 'error', 'info', 'warn']);
    expect(fakeLogger.info).toHaveBeenCalledWith('Connection established', {connectionId: 'connection-1'});
  });
});
