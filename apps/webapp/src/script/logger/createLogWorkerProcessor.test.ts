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

import {createLogWorkerProcessor} from './createLogWorkerProcessor';
import type {LogWorkerResponse} from './logWorkerProtocol';

describe('log worker message processing', () => {
  it('binds ownership and supports cleanup without initializing a persistence writer', async () => {
    const initialize = jest.fn(() => {
      return Maybe.just({async append(): Promise<void> {}});
    });
    const removeAccountLogs = jest.fn<Promise<void>, [string]>();
    const responses: LogWorkerResponse[] = [];
    const processor = createLogWorkerProcessor({
      initialize,
      removeAccountLogs,
      maximumBatchBytes: 256,
      close() {},
      respond(response) {
        responses.push(response);
      },
    });
    const accountIdentifier = 'a'.repeat(64);

    await processor.receive({type: 'remove-account', accountIdentifier, requestIdentifier: 1});
    expect(initialize).not.toHaveBeenCalled();
    expect(removeAccountLogs).toHaveBeenCalledWith(accountIdentifier);
    await processor.receive({type: 'set-account', accountIdentifier, requestIdentifier: 2});
    expect(initialize).toHaveBeenCalledWith(accountIdentifier);
    expect(responses).toEqual([
      {requestIdentifier: 1, outcome: 'complete'},
      {requestIdentifier: 2, outcome: 'complete'},
    ]);
  });

  it('closes after an ownership failure instead of falling back to a global writer', async () => {
    const close = jest.fn();
    const initialize = jest.fn(async (): Promise<never> => {
      throw new Error('Coordination unavailable');
    });
    const responses: LogWorkerResponse[] = [];
    const processor = createLogWorkerProcessor({
      initialize,
      close,
      maximumBatchBytes: 256,
      respond(response) {
        responses.push(response);
      },
    });

    await processor.receive({type: 'set-account', accountIdentifier: 'a'.repeat(64), requestIdentifier: 1});
    await processor.receive({type: 'append', lines: ['{}\n'], requestIdentifier: 2});

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(responses).toEqual([
      {requestIdentifier: 1, outcome: 'failed'},
      {requestIdentifier: 2, outcome: 'failed'},
    ]);
  });

  it('initializes once and acknowledges initialization, batched writes, flush and shutdown in order', async () => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const initialize = jest.fn(() => {
      return Maybe.just({append});
    });
    const responses: LogWorkerResponse[] = [];
    const close = jest.fn();
    const processor = createLogWorkerProcessor({
      initialize,
      respond(response) {
        responses.push(response);
      },
      close,
      maximumBatchBytes: 256,
    });
    const lines = ['{"secret":"[REDACTED]"}\n', '{"escaped":"\\u0025"}\n'];
    await processor.receive({type: 'initialize', requestIdentifier: 1});
    await processor.receive({type: 'append', requestIdentifier: 2, lines});
    await processor.receive({type: 'flush', requestIdentifier: 3});
    await processor.receive({type: 'shutdown', requestIdentifier: 4});

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(append.mock.calls).toEqual([[[]], [lines], [[]], [[]]]);
    expect(responses).toEqual(
      [1, 2, 3, 4].map(requestIdentifier => {
        return {requestIdentifier, outcome: 'complete'};
      }),
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported capabilities and closes without touching storage', async () => {
    const respond = jest.fn();
    const close = jest.fn();
    const processor = createLogWorkerProcessor({
      initialize() {
        return Maybe.nothing();
      },
      respond,
      close,
      maximumBatchBytes: 256,
    });
    await processor.receive({type: 'initialize', requestIdentifier: 1});

    expect(respond).toHaveBeenCalledWith({requestIdentifier: 1, outcome: 'unsupported'});
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects concurrent commands instead of growing a worker-side queue', async () => {
    const blockedWrite = Promise.withResolvers<void>();
    const append = jest.fn(() => {
      return blockedWrite.promise;
    });
    const respond = jest.fn();
    const processor = createLogWorkerProcessor({
      initialize() {
        return Maybe.just({append});
      },
      respond,
      close() {},
      maximumBatchBytes: 256,
    });
    const writing = processor.receive({type: 'append', requestIdentifier: 1, lines: ['{}\n']});
    await processor.receive({type: 'append', requestIdentifier: 2, lines: ['[]\n']});
    expect(respond).toHaveBeenCalledWith({requestIdentifier: 2, outcome: 'failed'});
    expect(append).toHaveBeenCalledTimes(1);
    blockedWrite.resolve();
    await writing;

    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 1, outcome: 'complete'});
  });

  it('contains storage failures and accepts a later explicit recovery command', async () => {
    let failing = true;
    const respond = jest.fn();
    const processor = createLogWorkerProcessor({
      initialize() {
        return Maybe.just({
          async append() {
            if (failing) {
              throw new Error('Quota exceeded');
            }
          },
        });
      },
      respond,
      close() {},
      maximumBatchBytes: 256,
    });
    await expect(processor.receive({type: 'initialize', requestIdentifier: 1})).resolves.toBeUndefined();
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 1, outcome: 'failed'});
    failing = false;
    await processor.receive({type: 'flush', requestIdentifier: 2});

    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 2, outcome: 'complete'});
  });

  it.each([
    {type: 'set-account', requestIdentifier: 1, accountIdentifier: '../another-account'},
    {type: 'remove-account', requestIdentifier: 1, accountIdentifier: ''},
    {type: 'append', requestIdentifier: 1, lines: ['{}\n{}\n']},
    {type: 'append', requestIdentifier: 1, lines: ['{}']},
    {type: 'append', requestIdentifier: 1, lines: [42]},
    {type: 'append', requestIdentifier: 1, lines: ['"€€"\n']},
    {type: 'flush', requestIdentifier: -1},
    {type: 'raw-record', requestIdentifier: 1, record: {message: 'unsafe'}},
  ])('rejects malformed or oversized messages without invoking storage: %j', async message => {
    const initialize = jest.fn();
    const respond = jest.fn();
    const processor = createLogWorkerProcessor({initialize, respond, close() {}, maximumBatchBytes: 6});
    await processor.receive(message);

    expect(initialize).not.toHaveBeenCalled();
    expect(respond).toHaveBeenCalledWith({requestIdentifier: 0, outcome: 'failed'});
  });
});
