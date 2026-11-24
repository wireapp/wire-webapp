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

import {ReadableStream} from 'node:stream/web';

import {CellNodeType, type CellNode} from '../../../../types/cellNode';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  type CellsSelfUserDriveRole,
} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {createBulkDownloadOperation, resolveBulkDownloadSelection} from './bulkDownloadOperation';

Object.assign(globalThis, {ReadableStream});

const createStream = (
  source?: ConstructorParameters<typeof ReadableStream<Uint8Array>>[0],
): globalThis.ReadableStream<Uint8Array> => {
  return new ReadableStream<Uint8Array>(
    source ?? {
      start(controller) {
        controller.close();
      },
    },
  ) as unknown as globalThis.ReadableStream<Uint8Array>;
};

const eligibleSelection = (paths: readonly string[]) => ({kind: 'eligible', paths}) as const;

const createNode = (path: string, role: CellsSelfUserDriveRole = CELLS_SELF_USER_DRIVE_ROLE.EDITOR): CellNode =>
  ({
    id: path,
    name: path.split('/').at(-1) ?? path,
    path,
    type: path.endsWith('/') ? CellNodeType.FOLDER : CellNodeType.FILE,
    selfUserDriveRole: role,
  }) as CellNode;

describe('resolveBulkDownloadSelection', () => {
  it('accepts every permitted file and folder in a mixed selection without imposing a cap', () => {
    const nodes = Array.from({length: 501}, (_, index) =>
      createNode(index === 0 ? 'workspace/folder/' : `workspace/file-${index}.txt`),
    );

    expect(resolveBulkDownloadSelection({nodes, canDownload: true})).toEqual({
      kind: 'eligible',
      paths: nodes.map(({path}) => path),
    });
  });

  it('rejects empty, whitespace-only, and incomplete selections', () => {
    expect(resolveBulkDownloadSelection({nodes: [], canDownload: true})).toEqual({kind: 'rejected', reason: 'empty'});
    expect(resolveBulkDownloadSelection({nodes: [createNode('  ')], canDownload: true})).toEqual({
      kind: 'rejected',
      reason: 'selection-unavailable',
    });
    expect(resolveBulkDownloadSelection({nodes: [createNode('file')], canDownload: true, selectedCount: 2})).toEqual({
      kind: 'rejected',
      reason: 'selection-unavailable',
    });
  });

  it('rejects the whole selection when the current drive permission or any item denies download', () => {
    expect(resolveBulkDownloadSelection({nodes: [createNode('file')], canDownload: false})).toEqual({
      kind: 'rejected',
      reason: 'forbidden',
    });
    expect(
      resolveBulkDownloadSelection({
        nodes: [createNode('allowed'), createNode('denied', CELLS_SELF_USER_DRIVE_ROLE.VIEWER)],
        canDownload: true,
      }),
    ).toEqual({kind: 'rejected', reason: 'forbidden'});
  });
});

describe('createBulkDownloadOperation', () => {
  it('rejects concurrent starts and reports transferred bytes without claiming a save', async () => {
    let finishDownload: ((stream: globalThis.ReadableStream<Uint8Array>) => void) | undefined;
    const download = jest.fn(
      () =>
        new Promise<globalThis.ReadableStream<Uint8Array>>(resolve => {
          finishDownload = resolve;
        }),
    );
    const operation = createBulkDownloadOperation(download);
    const states: string[] = [];
    operation.subscribe(state => states.push(state.kind));

    const first = operation.start({
      selection: eligibleSelection(['workspace/file.txt']),
      archiveParentPath: 'workspace',
    });
    await expect(
      operation.start({selection: eligibleSelection(['workspace/other.txt']), archiveParentPath: 'workspace'}),
    ).rejects.toThrow('A bulk download is already in progress');
    finishDownload?.(
      createStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
          controller.close();
        },
      }),
    );
    const result = await first;
    const reader = result.stream.getReader();
    await reader.read();
    await reader.read();

    expect(result.bytesReceived).toBe(2);
    expect(download).toHaveBeenCalledTimes(1);
    expect(states).toEqual(['starting', 'downloading', 'stream-consumed']);
    expect(operation.getState()).toMatchObject({kind: 'stream-consumed', bytesReceived: 2});
  });

  it('exposes stream failures without retrying automatically', async () => {
    const failure = new Error('connection lost while reading');
    const download = jest.fn().mockResolvedValue(
      createStream({
        start(controller) {
          controller.error(failure);
        },
      }),
    );
    const operation = createBulkDownloadOperation(download);
    const {stream} = await operation.start({
      selection: eligibleSelection(['workspace/file.txt']),
      archiveParentPath: 'workspace',
    });

    await expect(stream.getReader().read()).rejects.toBe(failure);
    expect(operation.getState()).toEqual({kind: 'failed', error: failure});
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('exposes failures and allows a deliberate later attempt without retrying automatically', async () => {
    const failure = new Error('connection lost');
    const download = jest.fn().mockRejectedValueOnce(failure).mockResolvedValue(createStream());
    const operation = createBulkDownloadOperation(download);
    const request = {selection: eligibleSelection(['workspace/file.txt']), archiveParentPath: 'workspace'};

    await expect(operation.start(request)).rejects.toBe(failure);
    expect(operation.getState()).toEqual({kind: 'failed', error: failure});
    expect(download).toHaveBeenCalledTimes(1);

    const retry = await operation.start(request);
    await retry.stream.getReader().read();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('keeps the operation locked until cancellation settles, then exposes cancellation', async () => {
    let finishCancel: (() => void) | undefined;
    const source = createStream({
      cancel() {
        return new Promise<void>(resolve => {
          finishCancel = resolve;
        });
      },
    });
    const download = jest.fn().mockResolvedValueOnce(source).mockResolvedValue(createStream());
    const operation = createBulkDownloadOperation(download);
    const request = {selection: eligibleSelection(['workspace/file.txt']), archiveParentPath: 'workspace'};
    const {stream} = await operation.start(request);
    const cancellation = stream.cancel();

    await expect(operation.start(request)).rejects.toThrow('A bulk download is already in progress');
    finishCancel?.();
    await cancellation;
    expect(operation.getState()).toEqual({kind: 'cancelled'});

    const retry = await operation.start(request);
    await retry.stream.getReader().read();
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('keeps the operation active while cancelling an already-pending source read', async () => {
    let signalPullStarted: (() => void) | undefined;
    let finishSourcePull: (() => void) | undefined;
    let signalCancelStarted: (() => void) | undefined;
    let finishSourceCancel: (() => void) | undefined;
    const pullStarted = new Promise<void>(resolve => {
      signalPullStarted = resolve;
    });
    const cancelStarted = new Promise<void>(resolve => {
      signalCancelStarted = resolve;
    });
    const source = createStream({
      pull() {
        signalPullStarted?.();
        return new Promise<void>(resolve => {
          finishSourcePull = resolve;
        });
      },
      cancel() {
        signalCancelStarted?.();
        return new Promise<void>(resolve => {
          finishSourceCancel = resolve;
        });
      },
    });
    const download = jest.fn().mockResolvedValueOnce(source).mockResolvedValue(createStream());
    const operation = createBulkDownloadOperation(download);
    const states: string[] = [];
    operation.subscribe(({kind}) => states.push(kind));
    const request = {selection: eligibleSelection(['workspace/file.txt']), archiveParentPath: 'workspace'};
    const {stream} = await operation.start(request);
    await pullStarted;

    const cancellation = stream.cancel();
    await cancelStarted;
    await new Promise<void>(resolve => setImmediate(resolve));

    try {
      expect(operation.getState()).toEqual({kind: 'starting'});
      expect(states).toEqual(['starting']);
      await expect(operation.start(request)).rejects.toThrow('A bulk download is already in progress');
    } finally {
      finishSourcePull?.();
      finishSourceCancel?.();
      await cancellation;
    }

    expect(operation.getState()).toEqual({kind: 'cancelled'});
    expect(states).toEqual(['starting', 'cancelled']);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('exposes cancellation failures and releases the operation lock', async () => {
    const failure = new Error('cancel failed');
    const source = createStream({cancel: () => Promise.reject(failure)});
    const download = jest.fn().mockResolvedValueOnce(source).mockResolvedValue(createStream());
    const operation = createBulkDownloadOperation(download);
    const request = {selection: eligibleSelection(['workspace/file.txt']), archiveParentPath: 'workspace'};
    const {stream} = await operation.start(request);

    await expect(stream.cancel()).rejects.toBe(failure);
    expect(operation.getState()).toEqual({kind: 'failed', error: failure});
    await operation.start(request);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('does not let a throwing observer corrupt operation state', async () => {
    const operation = createBulkDownloadOperation(async () => createStream());
    operation.subscribe(() => {
      throw new Error('observer failed');
    });

    const result = await operation.start({
      selection: eligibleSelection(['workspace/file.txt']),
      archiveParentPath: 'workspace',
    });
    await result.stream.getReader().read();

    expect(operation.getState()).toEqual({kind: 'stream-consumed', bytesReceived: 0});
  });
});
