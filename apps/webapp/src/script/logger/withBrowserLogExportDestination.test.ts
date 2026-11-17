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

import {WritableStream as NodeWritableStream} from 'node:stream/web';
import {task, type Task} from 'true-myth';

import {unwrap, unwrapErr} from '../util/test/resultTestSupport';

import type {BrowserLogArchiveOptions, BrowserLogExportFailure, BrowserLogExportSummary} from './browserLogExportTypes';
import {withBrowserLogExportDestination} from './withBrowserLogExportDestination';

const originalWritableStream = Object.getOwnPropertyDescriptor(globalThis, 'WritableStream');
const exportSummary: BrowserLogExportSummary = {exportedFiles: 1, missingFiles: 0};

function writeArchive(options: BrowserLogArchiveOptions): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {destination} = options;

  return task.tryOr('failed', async () => {
    const writer = destination.getWriter();
    try {
      await writer.write(new Uint8Array([1, 2, 3]));
    } finally {
      writer.releaseLock();
    }

    return exportSummary;
  });
}

describe('browser log export destination ownership', () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, 'WritableStream', {configurable: true, value: NodeWritableStream});
  });
  afterAll(() => {
    if (originalWritableStream === undefined) {
      Reflect.deleteProperty(globalThis, 'WritableStream');
    } else {
      Object.defineProperty(globalThis, 'WritableStream', originalWritableStream);
    }
  });

  it('commits only after archive completion and removes its cancellation listener', async () => {
    const events: string[] = [];
    const cancellation = new AbortController();
    let archiveSignal: AbortSignal | undefined;
    const destination = new globalThis.WritableStream<Uint8Array>({
      write() {
        events.push('write');
      },
      close() {
        events.push('commit');
      },
      abort() {
        events.push('abort');
      },
    });
    const completion = await withBrowserLogExportDestination({
      destination,
      signal: cancellation.signal,
      exportArchive(options) {
        archiveSignal = options.signal;

        return writeArchive(options).map(summary => {
          events.push('archive-complete');

          return summary;
        });
      },
    });
    cancellation.abort(new Error('Cancelled after completion'));

    expect(unwrap(completion)).toEqual(exportSummary);
    expect(events).toEqual(['write', 'archive-complete', 'commit']);
    expect(destination.locked).toBe(false);
    expect(archiveSignal?.aborted).toBe(false);
  });

  it.each<BrowserLogExportFailure>(['failed', 'cancelled', 'limit-exceeded'])(
    'preserves %s and sanitizes abort even when destination abort fails',
    async failure => {
      const abort = jest.fn(() => {
        throw new Error('account-secret: private contents');
      });
      const close = jest.fn();
      const destination = new globalThis.WritableStream<Uint8Array>({abort, close});
      const completion = await withBrowserLogExportDestination({
        destination,
        signal: new AbortController().signal,
        exportArchive() {
          return task.reject(failure);
        },
      });

      expect(unwrapErr(completion)).toBe(failure);
      expect(abort.mock.calls).toEqual([[new Error('Log export failed')]]);
      expect(close).not.toHaveBeenCalled();
      expect(destination.locked).toBe(false);
    },
  );

  it('normalizes synchronous operation failures and releases destination ownership', async () => {
    const abort = jest.fn();
    const destination = new globalThis.WritableStream<Uint8Array>({abort});
    const completion = await withBrowserLogExportDestination({
      destination,
      signal: new AbortController().signal,
      exportArchive() {
        throw new Error('account-secret: private contents');
      },
    });

    expect(unwrapErr(completion)).toBe('failed');
    expect(abort.mock.calls).toEqual([[new Error('Log export failed')]]);
    expect(destination.locked).toBe(false);
  });

  it('does not invoke the operation or interfere with an already locked destination', async () => {
    const abort = jest.fn();
    const exportArchive = jest.fn(() => {
      return task.resolve(exportSummary);
    });
    const destination = new globalThis.WritableStream<Uint8Array>({abort});
    const originalOwner = destination.getWriter();
    const completion = await withBrowserLogExportDestination({
      destination,
      signal: new AbortController().signal,
      exportArchive,
    });

    expect(unwrapErr(completion)).toBe('failed');
    expect(exportArchive).not.toHaveBeenCalled();
    expect(abort).not.toHaveBeenCalled();
    expect(destination.locked).toBe(true);
    originalOwner.releaseLock();
  });

  it('reports cancellation during abort only after destination cleanup completes', async () => {
    const cancellation = new AbortController();
    const abortStarted = Promise.withResolvers<void>();
    const finishAbort = Promise.withResolvers<void>();
    const destination = new globalThis.WritableStream<Uint8Array>({
      async abort() {
        abortStarted.resolve();
        await finishAbort.promise;
      },
    });
    const completion = withBrowserLogExportDestination({
      destination,
      signal: cancellation.signal,
      exportArchive() {
        return task.reject('failed');
      },
    });
    await abortStarted.promise;
    cancellation.abort();
    expect(destination.locked).toBe(true);
    finishAbort.resolve();

    expect(unwrapErr(await completion)).toBe('cancelled');
    expect(destination.locked).toBe(false);
  });
});
