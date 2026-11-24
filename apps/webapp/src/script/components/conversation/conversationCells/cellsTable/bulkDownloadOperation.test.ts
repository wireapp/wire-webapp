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
  return new ReadableStream<Uint8Array>(source) as unknown as globalThis.ReadableStream<Uint8Array>;
};

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

  it('rejects an empty selection and a selection containing a node missing from the current view', () => {
    expect(resolveBulkDownloadSelection({nodes: [], canDownload: true})).toEqual({kind: 'rejected', reason: 'empty'});
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

    const first = operation.start({paths: ['workspace/file.txt'], archiveParentPath: 'workspace'});
    await expect(operation.start({paths: ['workspace/other.txt'], archiveParentPath: 'workspace'})).rejects.toThrow(
      'A bulk download is already in progress',
    );
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
    const {stream} = await operation.start({paths: ['workspace/file.txt'], archiveParentPath: 'workspace'});

    await expect(stream.getReader().read()).rejects.toBe(failure);
    expect(operation.getState()).toEqual({kind: 'failed', error: failure});
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('exposes failures and allows an explicit later attempt without retrying automatically', async () => {
    const failure = new Error('connection lost');
    const download = jest.fn().mockRejectedValueOnce(failure);
    const operation = createBulkDownloadOperation(download);

    await expect(operation.start({paths: ['workspace/file.txt'], archiveParentPath: 'workspace'})).rejects.toBe(
      failure,
    );
    expect(operation.getState()).toEqual({kind: 'failed', error: failure});
    expect(download).toHaveBeenCalledTimes(1);
  });
});
