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
import type {LogStore} from './createOriginPrivateFileSystemLogStore';
import type {LogWorkerResponse} from './logWorkerProtocol';

describe('log worker message processing', () => {
  it.each(['initialize', 'append', 'flush'] as const)(
    'binds before %s and keeps repeated binding on the same store',
    async commandType => {
      const accountIdentifier = '0123456789abcdef'.repeat(4);
      const append = jest.fn<Promise<void>, [readonly string[]]>();
      const initialize = jest.fn(() => {
        return Maybe.just({append});
      });
      const respond = jest.fn();
      const processor = createLogWorkerProcessor({initialize, respond, close() {}, maximumBatchBytes: 256});

      await processor.receive({type: 'bind-account', requestIdentifier: 1, accountIdentifier});
      await processor.receive({type: commandType, requestIdentifier: 2, lines: ['{}\n']});
      await processor.receive({type: 'bind-account', requestIdentifier: 3, accountIdentifier});

      expect(initialize).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledWith(Maybe.just(accountIdentifier));
      expect(append.mock.calls).toEqual([[[]], [commandType === 'append' ? ['{}\n'] : []], [[]]]);
      expect(respond.mock.calls).toEqual(
        [1, 2, 3].map(requestIdentifier => {
          return [{requestIdentifier, outcome: 'complete'}];
        }),
      );
    },
  );

  it('switches from unattributed storage to account storage and supports another account', async () => {
    const accountIdentifier = 'a'.repeat(64);
    const otherAccountIdentifier = 'b'.repeat(64);
    const unattributedAppend = jest.fn<Promise<void>, [readonly string[]]>();
    const accountAppend = jest.fn<Promise<void>, [readonly string[]]>();
    const otherAccountAppend = jest.fn<Promise<void>, [readonly string[]]>();
    const initialize = jest
      .fn<Maybe<LogStore>, [Maybe<string>]>()
      .mockReturnValueOnce(Maybe.just({append: unattributedAppend}))
      .mockReturnValueOnce(Maybe.just({append: accountAppend}))
      .mockReturnValueOnce(Maybe.just({append: otherAccountAppend}));
    const respond = jest.fn();
    const processor = createLogWorkerProcessor({initialize, respond, close() {}, maximumBatchBytes: 256});

    await processor.receive({type: 'append', requestIdentifier: 1, lines: ['{"before":true}\n']});
    await processor.receive({type: 'bind-account', requestIdentifier: 2, accountIdentifier});
    await processor.receive({type: 'append', requestIdentifier: 3, lines: ['{"after":true}\n']});
    await processor.receive({type: 'bind-account', requestIdentifier: 4, accountIdentifier: otherAccountIdentifier});
    await processor.receive({type: 'append', requestIdentifier: 5, lines: ['{}\n']});
    await processor.receive({type: 'shutdown', requestIdentifier: 6});

    expect(initialize.mock.calls).toEqual([
      [Maybe.nothing()],
      [Maybe.just(accountIdentifier)],
      [Maybe.just(otherAccountIdentifier)],
    ]);
    expect(unattributedAppend.mock.calls).toEqual([[['{"before":true}\n']]]);
    expect(accountAppend.mock.calls).toEqual([[[]], [['{"after":true}\n']]]);
    expect(otherAccountAppend.mock.calls).toEqual([[[]], [['{}\n']], [[]]]);
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 6, outcome: 'complete'});
  });

  it('acknowledges binding only after account storage is ready and sends later logs to that store', async () => {
    const accountIdentifier = 'a'.repeat(64);
    const accountStorageReady = Promise.withResolvers<void>();
    const unattributedAppend = jest.fn<Promise<void>, [readonly string[]]>();
    const accountAppend = jest.fn(() => {
      return accountStorageReady.promise;
    });
    const initialize = jest
      .fn<Maybe<LogStore>, [Maybe<string>]>()
      .mockReturnValueOnce(Maybe.just({append: unattributedAppend}))
      .mockReturnValueOnce(Maybe.just({append: accountAppend}));
    const respond = jest.fn();
    const processor = createLogWorkerProcessor({initialize, respond, close() {}, maximumBatchBytes: 256});
    await processor.receive({type: 'append', requestIdentifier: 1, lines: ['{"before":true}\n']});

    const binding = processor.receive({type: 'bind-account', requestIdentifier: 2, accountIdentifier});

    expect(accountAppend).toHaveBeenCalledWith([]);
    expect(respond.mock.calls).toEqual([[{requestIdentifier: 1, outcome: 'complete'}]]);

    accountStorageReady.resolve();
    await binding;
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 2, outcome: 'complete'});
    await processor.receive({type: 'append', requestIdentifier: 3, lines: ['{"after":true}\n']});

    expect(initialize.mock.calls).toEqual([[Maybe.nothing()], [Maybe.just(accountIdentifier)]]);
    expect(unattributedAppend.mock.calls).toEqual([[['{"before":true}\n']]]);
    expect(accountAppend.mock.calls).toEqual([[[]], [['{"after":true}\n']]]);
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 3, outcome: 'complete'});
  });

  it.each(['factory', 'storage', 'unsupported'] as const)(
    'stops persistence after a binding %s failure without falling back to unattributed storage',
    async failure => {
      const append = jest.fn<Promise<void>, [readonly string[]]>();
      const initialize = jest.fn((accountIdentifier: Maybe<string>): Maybe<LogStore> => {
        if (accountIdentifier.isNothing) {
          return Maybe.just({append});
        }
        if (failure === 'factory') {
          throw new Error('Cannot create account store');
        }
        if (failure === 'unsupported') {
          return Maybe.nothing();
        }

        return Maybe.just({
          async append() {
            throw new Error('Cannot access account storage');
          },
        });
      });
      const respond = jest.fn();
      const close = jest.fn();
      const processor = createLogWorkerProcessor({initialize, respond, close, maximumBatchBytes: 256});
      await processor.receive({type: 'append', requestIdentifier: 1, lines: ['{}\n']});
      await processor.receive({type: 'bind-account', requestIdentifier: 2, accountIdentifier: 'a'.repeat(64)});
      expect(respond).toHaveBeenLastCalledWith({
        requestIdentifier: 2,
        outcome: failure === 'unsupported' ? 'unsupported' : 'failed',
      });
      await processor.receive({type: 'append', requestIdentifier: 3, lines: ['[]\n']});
      await processor.receive({type: 'initialize', requestIdentifier: 4});

      expect(append).toHaveBeenCalledTimes(1);
      expect(initialize).toHaveBeenCalledTimes(2);
      expect(close).toHaveBeenCalledTimes(1);
      expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 4, outcome: 'failed'});
    },
  );

  it.each([
    undefined,
    null,
    42,
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    'g'.repeat(64),
    `${'a'.repeat(64)}\n`,
    `${'a'.repeat(64)}\r`,
    '../account',
  ])('rejects invalid account identifier %j and stops further writes', async accountIdentifier => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const initialize = jest.fn(() => {
      return Maybe.just({append});
    });
    const respond = jest.fn();
    const close = jest.fn();
    const processor = createLogWorkerProcessor({initialize, respond, close, maximumBatchBytes: 256});
    await processor.receive({type: 'bind-account', requestIdentifier: 1, accountIdentifier});
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 0, outcome: 'failed'});
    await processor.receive({type: 'append', requestIdentifier: 2, lines: ['{}\n']});

    expect(initialize).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 2, outcome: 'failed'});
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

  it('stops an existing unattributed store when account binding is malformed', async () => {
    const append = jest.fn<Promise<void>, [readonly string[]]>();
    const initialize = jest.fn(() => {
      return Maybe.just({append});
    });
    const respond = jest.fn();
    const close = jest.fn();
    const processor = createLogWorkerProcessor({initialize, respond, close, maximumBatchBytes: 256});
    await processor.receive({type: 'append', requestIdentifier: 1, lines: ['{}\n']});
    await processor.receive({type: 'bind-account', requestIdentifier: 2, accountIdentifier: 'raw-account-identifier'});
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 0, outcome: 'failed'});
    await processor.receive({type: 'flush', requestIdentifier: 3});
    await processor.receive({type: 'append', requestIdentifier: 4, lines: ['[]\n']});

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(append.mock.calls).toEqual([[['{}\n']]]);
    expect(close).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 4, outcome: 'failed'});
  });

  it('stops unattributed logging when binding is rejected during an in-flight write', async () => {
    const blockedWrite = Promise.withResolvers<void>();
    const append = jest.fn(() => {
      return blockedWrite.promise;
    });
    const respond = jest.fn();
    const close = jest.fn();
    const processor = createLogWorkerProcessor({
      initialize() {
        return Maybe.just({append});
      },
      respond,
      close,
      maximumBatchBytes: 256,
    });
    const writing = processor.receive({type: 'append', requestIdentifier: 1, lines: ['{}\n']});
    await processor.receive({type: 'bind-account', requestIdentifier: 2, accountIdentifier: 'a'.repeat(64)});
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 2, outcome: 'failed'});
    blockedWrite.resolve();
    await writing;
    await processor.receive({type: 'append', requestIdentifier: 3, lines: ['[]\n']});

    expect(append).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(respond).toHaveBeenLastCalledWith({requestIdentifier: 3, outcome: 'failed'});
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
