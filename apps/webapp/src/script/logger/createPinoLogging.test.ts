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
import {createConsoleOutput, encodeLogOutput} from './logOutput';
import type {Logger} from './logger';

function createTestLogging(namespaces: Maybe<string>): {
  readonly logging: ReturnType<typeof createPinoLogging>;
  readonly clock: ReturnType<typeof createDeterministicClock>;
  readonly output: Record<keyof Logger, jest.Mock<void, [string]>>;
} {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1760000000000000n});
  const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};
  const logging = createPinoLogging(Maybe.just({clock, output: createConsoleOutput(output), namespaces}));

  return {logging, clock, output};
}

function parseOutput(output: jest.Mock<void, [string]>): Record<string, unknown> {
  return JSON.parse(String(output.mock.calls[0]?.[0]));
}

describe('Wire logging through Pino browser', () => {
  it.each([
    {level: 'debug', numericLevel: 20},
    {level: 'info', numericLevel: 30},
    {level: 'warn', numericLevel: 40},
    {level: 'error', numericLevel: 50},
  ] as const)('writes one structured JSON string through console.$level', testCase => {
    const {level, numericLevel} = testCase;
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const logger = logging.getLogger('@wireapp/api-client/tcp/WebSocketClient');

    expect(logger[level]('Connection interrupted', {attempt: 3, connectionId: 'abc'})).toBeUndefined();
    expect(output[level]).toHaveBeenCalledTimes(1);
    expect(output[level].mock.calls[0]).toHaveLength(1);
    expect(parseOutput(output[level])).toEqual({
      level: numericLevel,
      time: 1760000000000,
      component: '@wireapp/api-client/tcp/WebSocketClient',
      attempt: 3,
      connectionId: 'abc',
      msg: 'Connection interrupted',
    });
    expect(Object.keys(logger).sort()).toEqual(['debug', 'error', 'info', 'warn']);
  });

  it('forwards Pino objects to the injected output and uses the injected clock on each call', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1000n});
    const output = jest.fn();
    const logging = createPinoLogging(Maybe.just({clock, output, namespaces: Maybe.just('*')}));
    const logger = logging.getLogger('@wireapp/core/Account');

    logger.info('First event');
    clock.advanceByMilliseconds(10);
    logger.info('Second event');

    expect(
      output.mock.calls.map(call => {
        return call[0];
      }),
    ).toMatchObject([
      {level: 30, time: 1, component: '@wireapp/core/Account', msg: 'First event'},
      {level: 30, time: 11, component: '@wireapp/core/Account', msg: 'Second event'},
    ]);
  });

  it.each([
    {namespaces: Maybe.nothing<string>(), expected: []},
    {namespaces: Maybe.just('*'), expected: ['@wireapp/webapp/Client', '@wireapp/core/Client', 'other']},
    {namespaces: Maybe.just(' @wireapp/* , -@wireapp/core/* '), expected: ['@wireapp/webapp/Client']},
    {namespaces: Maybe.just('*,-@wireapp/*,@wireapp/core/*'), expected: ['@wireapp/core/Client', 'other']},
    {namespaces: Maybe.just('@wireapp/core/Client'), expected: ['@wireapp/core/Client']},
    {namespaces: Maybe.just('['), expected: []},
  ])('preserves namespace selection and ordered exclusions: $namespaces', testCase => {
    const {namespaces, expected} = testCase;
    const {logging, output} = createTestLogging(namespaces);

    ['@wireapp/webapp/Client', '@wireapp/core/Client', 'other'].forEach(component => {
      logging.getLogger(component).info('Connected');
    });

    expect(
      output.info.mock.calls.map(call => {
        const record: Record<string, unknown> = JSON.parse(call[0]);
        return record['component'];
      }),
    ).toEqual(expected);
  });

  it('applies initialization and later filter changes to existing loggers', () => {
    const {clock, output} = createTestLogging(Maybe.nothing());
    const logging = createPinoLogging(Maybe.nothing());
    const logger = logging.getLogger('component');
    logger.debug('Before initialization');
    logging.configure(Maybe.just({clock, output: createConsoleOutput(output), namespaces: Maybe.just('*')}));
    logger.debug('Enabled');
    logging.configure(Maybe.just({clock, output: createConsoleOutput(output), namespaces: Maybe.nothing<string>()}));
    logger.debug('Disabled');

    expect(output.debug).toHaveBeenCalledTimes(1);
    expect(parseOutput(output.debug)['msg']).toBe('Enabled');
  });

  it('does not read time or attributes for a filtered call', () => {
    const readTime = jest.fn().mockReturnValue(1234);
    const readAttribute = jest.fn();
    const output = jest.fn();
    const clock = {
      get currentUnixEpochMilliseconds(): number {
        return readTime();
      },
    };
    const logging = createPinoLogging(Maybe.just({clock, output, namespaces: Maybe.nothing<string>()}));

    logging.getLogger('component').debug('Filtered', {
      get error(): unknown {
        return readAttribute();
      },
    });

    expect(readTime).not.toHaveBeenCalled();
    expect(readAttribute).not.toHaveBeenCalled();
    expect(output).not.toHaveBeenCalled();
  });

  it('retains error diagnostics, nested errors, causes, and custom fields without mutating attributes', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const cause = Object.assign(new Error('Socket closed'), {code: 'CLOSED'});
    const error = Object.assign(new Error('Connection failed', {cause}), {name: 'ConnectionError', code: 'FAILED'});
    const attributes = {error, context: {nestedError: cause}};

    logging.getLogger('component').error('Failure', attributes);

    expect(parseOutput(output.error)).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          name: 'ConnectionError',
          type: 'Error',
          message: 'Connection failed',
          stack: error.stack,
          code: 'FAILED',
          cause: expect.objectContaining({type: 'Error', message: 'Socket closed', stack: cause.stack, code: 'CLOSED'}),
        }),
        context: {nestedError: expect.objectContaining({type: 'Error', message: 'Socket closed', stack: cause.stack})},
      }),
    );
    expect(attributes.error).toBe(error);
  });

  it('uses library handling for circular attributes and cyclic error causes', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const error = new Error('Failed');
    Object.assign(error, {cause: error});

    expect(() => {
      logging.getLogger('component').error('Failure', {circular, error});
    }).not.toThrow();
    expect(parseOutput(output.error)).toEqual(
      expect.objectContaining({
        circular: {self: '[Circular]'},
        error: expect.objectContaining({type: 'Error', message: 'Failed', stack: error.stack}),
      }),
    );
  });

  it.each(['failed', 42, false, null, {reason: 'failed'}])('retains unknown thrown values: %p', error => {
    const {logging, output} = createTestLogging(Maybe.just('*'));

    logging.getLogger('component').error('Failure', {error});

    expect(parseOutput(output.error)['error']).toEqual(error);
  });

  it('uses safe stringify for BigInt attributes', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));

    logging.getLogger('component').info('Counter', {counter: 17n});

    expect(parseOutput(output.info)['counter']).toBe(17);
    expect(output.info).toHaveBeenCalledTimes(1);
  });

  it('preserves Wire redaction in messages, nested values, keys, errors, and causes', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const cause = new Error('Authorization: Bearer secret-credential');
    const error = Object.assign(new Error('token=secret-token', {cause}), {
      request: {body: 'private-request'},
      config: {password: 'private-password'},
    });
    const jwt = ['eyJhbGciOiJub25lIn0', 'eyJzdWIiOiIxIn0', 'signature'].join('.');

    logging.getLogger('component').error('Bearer secret-credential', {
      error,
      nested: {Authorization: 'Bearer secret-credential', url: 'https://example.com?token=secret-token'},
      cookie: 'Cookie: session=secret-cookie',
      jwt,
      'token=secret-key': 'key value',
    });

    const line = String(output.error.mock.calls[0]?.[0]);
    expect(line).not.toContain('secret-');
    expect(line).not.toContain(jwt);
    expect(line).not.toContain('private-request');
    expect(line).not.toContain('private-password');
    expect(parseOutput(output.error)).toEqual(
      expect.objectContaining({
        msg: 'Bearer [REDACTED]',
        'token=[REDACTED]': 'key value',
        jwt: '[REDACTED]',
        nested: {Authorization: 'Bearer [REDACTED]', url: 'https://example.com/?[REDACTED]'},
      }),
    );
  });

  it('protects Pino metadata while retaining conflicting attributes', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const attributes = {level: 1, time: 2, component: 'source', msg: 'original', attempt: 3};

    logging.getLogger('component').info('Message', attributes);

    expect(parseOutput(output.info)).toEqual({
      level: 30,
      time: 1760000000000,
      component: 'component',
      msg: 'Message',
      attributes,
    });
  });

  it('does not allow a provider error toJSON projection to expose request configuration', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    const error = Object.assign(new Error('Provider failure'), {
      config: {password: 'private-password'},
      request: {body: 'private-request'},
      toJSON(): Record<string, unknown> {
        return {message: 'Provider failure', config: this.config, request: this.request};
      },
    });

    logging.getLogger('component').error('Failure', {error});

    expect(parseOutput(output.error)['error']).toEqual({type: 'Error', message: error.message, stack: error.stack});
    expect(String(output.error.mock.calls[0]?.[0])).not.toContain('private-');
    expect(error.config.password).toBe('private-password');
  });

  it('reports serialization failure and contains failing outputs without recursion', () => {
    const {logging, output, clock} = createTestLogging(Maybe.just('*'));
    const broken = {
      toJSON() {
        throw new Error('Cannot serialize');
      },
    };

    expect(() => {
      logging.getLogger('component').warn('Failure', {broken});
    }).not.toThrow();
    expect(parseOutput(output.warn)).toEqual({
      level: 40,
      time: 1760000000000,
      component: 'component',
      msg: 'Failure',
      serializationError: 'Unable to serialize log attributes',
    });
    const failingOutput = jest.fn(() => {
      throw new Error('Output unavailable');
    });
    logging.configure(Maybe.just({clock, output: failingOutput, namespaces: Maybe.just('*')}));
    expect(() => {
      logging.getLogger('component').info('Failed output');
    }).not.toThrow();
    expect(failingOutput).toHaveBeenCalledTimes(1);
  });

  it('contains console failures and emits one-line JSON with no decorative formatting', () => {
    const {logging, output} = createTestLogging(Maybe.just('*'));
    logging
      .getLogger('component')
      .info('Literal %s %cstyled%c color:#abc; font-weight:bold; token=secret-token\nnext line');
    const line = String(output.info.mock.calls[0]?.[0]);

    expect(JSON.parse(line)['msg']).toBe(
      'Literal %s %cstyled%c color:#abc; font-weight:bold; token=[REDACTED]\nnext line',
    );
    expect(line).not.toMatch(/%c|color:#|font-weight:|access_token=|[\r\n]/u);
    output.info.mockImplementation(() => {
      throw new Error('Console unavailable');
    });
    expect(() => {
      logging.getLogger('component').info('Broken console');
    }).not.toThrow();
    expect(encodeLogOutput({level: 30, msg: 'safe'})).toBeTruthy();
  });
});
