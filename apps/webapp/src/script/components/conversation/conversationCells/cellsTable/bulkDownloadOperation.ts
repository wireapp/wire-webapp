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

import type {CellNode} from '../../../../types/cellNode';
import {canPerformCellsAction, CELLS_ACTION} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

export type BulkDownloadRejectionReason = 'empty' | 'selection-unavailable' | 'forbidden';

export type BulkDownloadSelection =
  | {readonly kind: 'eligible'; readonly paths: readonly string[]}
  | {readonly kind: 'rejected'; readonly reason: BulkDownloadRejectionReason};

export const resolveBulkDownloadSelection = ({
  nodes,
  canDownload,
  selectedCount = nodes.length,
}: {
  nodes: readonly CellNode[];
  canDownload: boolean;
  selectedCount?: number;
}): BulkDownloadSelection => {
  if (selectedCount === 0) {
    return {kind: 'rejected', reason: 'empty'};
  }
  if (nodes.length !== selectedCount) {
    return {kind: 'rejected', reason: 'selection-unavailable'};
  }
  if (
    !canDownload ||
    nodes.some(node => {
      return !canPerformCellsAction({action: CELLS_ACTION.DOWNLOAD, selfUserDriveRole: node.selfUserDriveRole});
    })
  ) {
    return {kind: 'rejected', reason: 'forbidden'};
  }

  const paths = nodes.map(({path}) => path);
  if (paths.some(path => path.trim().length === 0)) {
    return {kind: 'rejected', reason: 'selection-unavailable'};
  }

  return {kind: 'eligible', paths};
};

export type BulkDownloadOperationState =
  | {readonly kind: 'idle'}
  | {readonly kind: 'starting'}
  | {readonly kind: 'downloading'; readonly bytesReceived: number}
  | {readonly kind: 'stream-consumed'; readonly bytesReceived: number}
  | {readonly kind: 'failed'; readonly error: unknown};

interface BulkDownloadRequest {
  readonly paths: readonly string[];
  readonly archiveParentPath: string;
  readonly abortController?: AbortController;
}

interface BulkDownloadResult {
  readonly stream: ReadableStream<Uint8Array>;
  readonly bytesReceived: number;
}

export interface BulkDownloadOperation {
  getState(): BulkDownloadOperationState;
  subscribe(listener: (state: BulkDownloadOperationState) => void): () => void;
  start(request: BulkDownloadRequest): Promise<BulkDownloadResult>;
}

export const createBulkDownloadOperation = (
  download: (request: BulkDownloadRequest) => Promise<ReadableStream<Uint8Array>>,
): BulkDownloadOperation => {
  let state: BulkDownloadOperationState = {kind: 'idle'};
  let isActive = false;
  const listeners = new Set<(state: BulkDownloadOperationState) => void>();

  const setState = (nextState: BulkDownloadOperationState): void => {
    state = nextState;
    listeners.forEach(listener => listener(state));
  };

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: async request => {
      if (isActive) {
        throw new Error('A bulk download is already in progress');
      }
      if (request.paths.length === 0 || request.paths.some(path => path.trim().length === 0)) {
        throw new Error('A bulk download requires at least one non-empty path');
      }

      isActive = true;
      setState({kind: 'starting'});

      try {
        const source = await download(request);
        let bytesReceived = 0;
        const reader = source.getReader();
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const {done, value} = await reader.read();
              if (done) {
                controller.close();
                isActive = false;
                setState({kind: 'stream-consumed', bytesReceived});
                return;
              }
              bytesReceived += value.byteLength;
              setState({kind: 'downloading', bytesReceived});
              controller.enqueue(value);
            } catch (error) {
              isActive = false;
              setState({kind: 'failed', error});
              controller.error(error);
            }
          },
          async cancel(reason) {
            isActive = false;
            await reader.cancel(reason);
            setState({kind: 'failed', error: new Error('Archive stream was cancelled')});
          },
        });
        return {
          stream,
          get bytesReceived() {
            return bytesReceived;
          },
        };
      } catch (error) {
        isActive = false;
        setState({kind: 'failed', error});
        throw error;
      }
    },
  };
};
