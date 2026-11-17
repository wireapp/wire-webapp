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

import {result, task, type Result, type Task} from 'true-myth';

import {checkBrowserLogExportCancellation} from './browserLogExportPolicy';
import type {BrowserLogArchiveOptions, BrowserLogExportFailure, BrowserLogExportSummary} from './browserLogExportTypes';

type WithBrowserLogExportDestinationOptions = {
  readonly destination: WritableStream<Uint8Array>;
  readonly signal: AbortSignal;
  readonly exportArchive: (options: BrowserLogArchiveOptions) => Task<BrowserLogExportSummary, BrowserLogExportFailure>;
};

type DestinationOwnership = {
  readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  readonly signal: AbortSignal;
  readonly cancellation: AbortController;
  readonly cancel: () => void;
};

function acquireDestination(options: WithBrowserLogExportDestinationOptions): Result<DestinationOwnership, 'failed'> {
  const {destination, signal} = options;

  return result.tryOr('failed', () => {
    const cancellation = new AbortController();
    const writer = destination.getWriter();
    function cancel(): void {
      cancellation.abort(new Error('Log export cancelled'));
    }
    signal.addEventListener('abort', cancel, {once: true});
    if (signal.aborted) {
      cancel();
    }

    return {writer, signal, cancellation, cancel};
  });
}

function createArchiveDestination(ownership: DestinationOwnership): WritableStream<Uint8Array> {
  const {writer, cancellation} = ownership;

  return new WritableStream<Uint8Array>({
    async write(chunk) {
      cancellation.signal.throwIfAborted();
      await writer.write(chunk);
    },
    // Provider errors must never reach the destination's abort callback.
    abort() {},
  });
}

function closeDestination(ownership: DestinationOwnership): Task<void, BrowserLogExportFailure> {
  const {writer, cancellation} = ownership;

  return task.fromResult(checkBrowserLogExportCancellation(cancellation.signal.aborted)).andThen(() => {
    // Commit point: cancellation after close starts cannot undo a successful commit.
    return task.tryOr('failed' as const, () => {
      return writer.close();
    });
  });
}

function abortDestination(ownership: DestinationOwnership): Task<void, never> {
  const {writer, cancellation} = ownership;
  cancellation.abort(new Error('Log export failed'));

  return task
    .tryOr('failed' as const, () => {
      return writer.abort(new Error('Log export failed'));
    })
    .orElse(() => {
      // A failed abort must not replace the primary semantic failure.
      return task.resolve(undefined);
    });
}

function releaseDestination(ownership: DestinationOwnership): Result<void, 'failed'> {
  const {writer, signal, cancel} = ownership;

  return result.tryOr('failed', () => {
    signal.removeEventListener('abort', cancel);
    writer.releaseLock();
  });
}

function runExportWithDestination(
  ownership: DestinationOwnership,
  exportArchive: WithBrowserLogExportDestinationOptions['exportArchive'],
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {cancellation, signal} = ownership;

  return task
    .fromResult(checkBrowserLogExportCancellation(cancellation.signal.aborted))
    .andThen(() => {
      // Capture synchronous failures from the supplied operation, as well as its Task outcome.
      return task.fromResult(
        result.tryOr('failed' as const, () => {
          return exportArchive({destination: createArchiveDestination(ownership), signal: cancellation.signal});
        }),
      );
    })
    .andThen(exportOperation => {
      return exportOperation;
    })
    .andThen(summary => {
      return closeDestination(ownership).andThen(() => {
        return releaseDestination(ownership).map(() => {
          return summary;
        });
      });
    })
    .orElse(failure => {
      return abortDestination(ownership).andThen(() => {
        // Preserve the primary failure even if releasing an already failed sink also fails.
        releaseDestination(ownership).unwrapOr(undefined);

        return task.reject(failure);
      });
    })
    .mapRejected(failure => {
      return signal.aborted ? ('cancelled' as const) : failure;
    });
}

export function withBrowserLogExportDestination(
  options: WithBrowserLogExportDestinationOptions,
): Task<BrowserLogExportSummary, BrowserLogExportFailure> {
  const {exportArchive} = options;

  return task.fromResult(acquireDestination(options)).andThen(ownership => {
    return runExportWithDestination(ownership, exportArchive);
  });
}
