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

import {Maybe} from 'true-myth';

import {serializeLogRecord} from './serializeLogRecord';
import type {LogRecord} from './structuredLogger';

const record: LogRecord = {
  timestamp: 1760000000000,
  level: 'warn',
  component: '@wireapp/api-client/tcp/WebSocketClient',
  message: 'Connection interrupted',
  attributes: Maybe.nothing(),
};

function parseRecord(event: LogRecord): Record<string, unknown> {
  return JSON.parse(serializeLogRecord(event));
}

describe('log record serialization', () => {
  it('escapes legacy Desktop rewrite sequences without changing parsed values', () => {
    const message = '%cstyled%c color:#abc; font-weight:bold; access_token=secret-token';
    const serializedRecord = serializeLogRecord({...record, message});
    const actualRecord: unknown = JSON.parse(serializedRecord);

    expect(actualRecord).toEqual(
      expect.objectContaining({
        msg: '%cstyled%c color:#abc; font-weight:bold; access_token=[REDACTED]',
      }),
    );
    expect(serializedRecord).not.toMatch(/%c|color:#|font-weight:|access_token=/u);
  });

  it('retains complete metadata for message-only events without Node-specific fields', () => {
    expect(parseRecord(record)).toEqual({
      level: 40,
      time: 1760000000000,
      component: record.component,
      msg: 'Connection interrupted',
    });
  });

  it('flattens attributes while preserving nested objects and arrays', () => {
    const attributes = {attempt: 3, connectionId: 'abc', connected: false, nested: {values: [1, 'two', null]}};

    expect(parseRecord({...record, attributes: Maybe.just(attributes)})).toEqual({
      level: 40,
      time: record.timestamp,
      component: record.component,
      msg: record.message,
      ...attributes,
    });
  });

  it('retains all reserved-field collisions, including an existing attributes property', () => {
    const attributes = {
      level: 'custom',
      time: 10,
      component: 'source',
      msg: 'original',
      attributes: {nested: true},
      attempt: 3,
    };
    const actualRecord = parseRecord({...record, attributes: Maybe.just(attributes)});

    expect(actualRecord).toEqual({
      level: 40,
      time: record.timestamp,
      component: record.component,
      msg: record.message,
      attempt: 3,
      attributes: {level: 'custom', time: 10, component: 'source', msg: 'original', attributes: {nested: true}},
    });
    expect(attributes.level).toBe('custom');
  });

  it('preserves special property names without allowing prototype or toJSON overrides', () => {
    const attributes = Object.fromEntries([
      ['__proto__', {polluted: true}],
      ['constructor', 'custom constructor'],
      [
        'toJSON',
        () => {
          return 'override';
        },
      ],
    ]);
    const actualRecord = parseRecord({...record, attributes: Maybe.just(attributes)});

    expect(Object.hasOwn(actualRecord, '__proto__')).toBe(true);
    expect(actualRecord['__proto__']).toEqual({polluted: true});
    expect(actualRecord['constructor']).toBe('custom constructor');
    expect(actualRecord['toJSON']).toBe('[Function]');
    expect(actualRecord['msg']).toBe(record.message);
  });

  it('retains error names, messages, stacks, causes, and custom properties', () => {
    const cause = new Error('Socket closed');
    const error = Object.assign(new Error('Connection failed', {cause}), {code: 'CONNECTION_FAILED'});
    const actualRecord = parseRecord({...record, attributes: Maybe.just({error})});

    expect(actualRecord['error']).toEqual({
      code: 'CONNECTION_FAILED',
      name: 'Error',
      message: 'Connection failed',
      stack: error.stack,
      cause: {name: 'Error', message: 'Socket closed', stack: cause.stack},
    });
  });

  it('honors Error toJSON projections while retaining standard error details', () => {
    const error = Object.assign(new Error('Connection failed', {cause: 'Socket closed'}), {
      request: {privateValue: 'must-not-appear'},
      toJSON() {
        return {code: 'CONNECTION_FAILED'};
      },
    });
    const serializedRecord = serializeLogRecord({...record, attributes: Maybe.just({error})});
    const actualRecord: unknown = JSON.parse(serializedRecord);

    expect(actualRecord).toEqual(
      expect.objectContaining({
        error: {
          name: 'Error',
          message: error.message,
          stack: error.stack,
          cause: 'Socket closed',
          code: 'CONNECTION_FAILED',
        },
      }),
    );
    expect(serializedRecord).not.toContain('must-not-appear');
  });

  it('retains error messages and causes even when a custom toJSON fails', () => {
    const error = Object.assign(new Error('Connection failed', {cause: 42}), {
      toJSON() {
        throw new Error('Cannot serialize');
      },
    });

    expect(parseRecord({...record, attributes: Maybe.just({error})})['error']).toEqual({
      name: 'Error',
      message: 'Connection failed',
      stack: error.stack,
      cause: 42,
      serializationError: '[Unserializable Object]',
    });
  });

  it('replaces circular paths without treating shared references as cycles', () => {
    const shared = {status: 'closed'};
    const circular: Record<string, unknown> = {shared};
    circular['self'] = circular;
    const error = new Error('Connection failed');
    Object.assign(error, {cause: error});

    expect(parseRecord({...record, attributes: Maybe.just({first: shared, second: shared, circular, error})})).toEqual(
      expect.objectContaining({
        first: shared,
        second: shared,
        circular: {shared, self: '[Circular]'},
        error: {name: 'Error', message: error.message, stack: error.stack, cause: '[Circular]'},
      }),
    );
  });

  it.each([
    {error: 'failed', expected: 'failed'},
    {error: 42, expected: 42},
    {error: false, expected: false},
    {error: null, expected: null},
    {error: undefined, expected: '[undefined]'},
    {error: 42n, expected: '42'},
    {error: Symbol('failure'), expected: 'Symbol(failure)'},
    {
      error: () => {
        return 'failure';
      },
      expected: '[Function]',
    },
    {error: NaN, expected: 'NaN'},
    {error: Infinity, expected: 'Infinity'},
    {error: -Infinity, expected: '-Infinity'},
    {error: {reason: 'failed'}, expected: {reason: 'failed'}},
  ])('retains unknown thrown values: $error', testCase => {
    const {error, expected} = testCase;

    expect(parseRecord({...record, attributes: Maybe.just({error})})['error']).toEqual(expected);
  });

  it('retains native and projected values', () => {
    const attributes = {
      date: new Date('2026-01-02T03:04:05.000Z'),
      map: new Map([['attempt', 3]]),
      set: new Set([1, 2]),
      projected: {
        toJSON() {
          return {value: 'projected'};
        },
      },
    };

    expect(parseRecord({...record, attributes: Maybe.just(attributes)})).toEqual(
      expect.objectContaining({
        date: '2026-01-02T03:04:05.000Z',
        map: [['attempt', 3]],
        set: [1, 2],
        projected: {value: 'projected'},
      }),
    );
  });

  it('isolates unreadable properties and nested serialization failures from other diagnostics', () => {
    const broken = {
      toJSON() {
        throw new Error('Cannot serialize');
      },
    };
    const attributes = {
      attempt: 3,
      broken,
      get inaccessible(): never {
        throw new Error('Cannot read');
      },
      values: [undefined, 42n, broken],
    };

    expect(parseRecord({...record, attributes: Maybe.just(attributes)})).toEqual(
      expect.objectContaining({
        attempt: 3,
        broken: '[Unserializable Object]',
        inaccessible: '[Unserializable Object]',
        values: ['[undefined]', '42', '[Unserializable Object]'],
      }),
    );
  });

  it('preserves existing redaction rules without corrupting JSON strings', () => {
    const jwt = ['eyJhbGciOiJub25lIn0', 'eyJzdWIiOiIxIn0', 'signature'].join('.');
    const cause = new Error('Authorization: Bearer secret-credential');
    const error = Object.assign(new Error('token=secret-token', {cause}), {
      requestUrl: 'https://example.com/events?access_token=secret-access&sync_marker=secret-marker',
    });
    error.stack = 'Error: token=secret-token';
    cause.stack = 'Error: Bearer secret-credential';
    const serializedRecord = serializeLogRecord({
      ...record,
      message: 'Bearer secret-credential',
      attributes: Maybe.just({
        error,
        headers: {Authorization: 'Bearer secret-credential'},
        cookie: 'Cookie: session=secret-cookie',
        jwt,
      }),
    });
    const actualRecord: unknown = JSON.parse(serializedRecord);

    expect(actualRecord).toEqual(
      expect.objectContaining({
        msg: 'Bearer [REDACTED]',
        headers: {Authorization: 'Bearer [REDACTED]'},
        cookie: 'Cookie: [REDACTED]',
        jwt: '[REDACTED]',
        error: expect.objectContaining({
          message: 'token=[REDACTED]',
          cause: expect.objectContaining({
            message: 'Authorization: Bearer [REDACTED]',
            stack: 'Error: Bearer [REDACTED]',
          }),
        }),
      }),
    );
    expect(serializedRecord).not.toContain('secret-');
    expect(serializedRecord).not.toContain(jwt);
  });

  it('redacts property names and retains values when redaction makes keys collide', () => {
    const attributes = {
      'https://example.com/events?token=first-secret': 1,
      'https://example.com/events?token=second-secret': 2,
    };
    const serializedRecord = serializeLogRecord({...record, attributes: Maybe.just(attributes)});

    expect(JSON.parse(serializedRecord)).toEqual(
      expect.objectContaining({
        entries: [
          ['https://example.com/events?[REDACTED]', 1],
          ['https://example.com/events?[REDACTED]', 2],
        ],
      }),
    );
    expect(serializedRecord).not.toContain('secret');
  });

  it('truncates long string values with an explicit marker while keeping valid JSON', () => {
    const actualRecord = parseRecord({
      ...record,
      message: 'x'.repeat(11000),
      attributes: Maybe.just({description: 'y'.repeat(11000)}),
    });

    expect(actualRecord['msg']).toHaveLength(10000);
    expect(actualRecord['description']).toHaveLength(10000);
    expect(actualRecord['msg']).toMatch(/\.\.\. \[truncated\]$/u);
    expect(actualRecord['description']).toMatch(/\.\.\. \[truncated\]$/u);
  });
});
