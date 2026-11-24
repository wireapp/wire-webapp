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

export type BulkDownloadRejectionReason = 'empty' | 'selection-unavailable' | 'forbidden' | 'unsupported-location';

export type BulkDownloadSelection =
  | {readonly kind: 'eligible'; readonly paths: readonly string[]}
  | {readonly kind: 'rejected'; readonly reason: BulkDownloadRejectionReason};

export const resolveBulkDownloadSelection = ({
  nodes,
  canDownload,
  selectedCount = nodes.length,
  isSupportedLocation = true,
}: {
  nodes: readonly CellNode[];
  canDownload: boolean;
  selectedCount?: number;
  isSupportedLocation?: boolean;
}): BulkDownloadSelection => {
  if (selectedCount === 0) {
    return {kind: 'rejected', reason: 'empty'};
  }
  if (nodes.length !== selectedCount) {
    return {kind: 'rejected', reason: 'selection-unavailable'};
  }
  if (!isSupportedLocation) {
    return {kind: 'rejected', reason: 'unsupported-location'};
  }
  if (
    !canDownload ||
    nodes.some(node => {
      return !canPerformCellsAction({action: CELLS_ACTION.DOWNLOAD, selfUserDriveRole: node.selfUserDriveRole});
    })
  ) {
    return {kind: 'rejected', reason: 'forbidden'};
  }

  const paths = nodes.map(({path}) => {
    return path;
  });
  if (
    paths.some(path => {
      return path.trim().length === 0;
    })
  ) {
    return {kind: 'rejected', reason: 'selection-unavailable'};
  }

  return {kind: 'eligible', paths};
};

export type BulkDownloadOperationState =
  | {readonly kind: 'idle'}
  | {readonly kind: 'starting'}
  | {readonly kind: 'downloading'; readonly bytesReceived: number}
  | {readonly kind: 'stream-consumed'; readonly bytesReceived: number}
  | {readonly kind: 'cancelled'}
  | {readonly kind: 'failed'; readonly error: unknown};

interface BulkDownloadRequest {
  readonly selection: BulkDownloadSelection;
  readonly archiveParentPath: string;
  readonly abortController?: AbortController;
}

interface DownloadArchiveRequest {
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
  download: (request: DownloadArchiveRequest) => Promise<ReadableStream<Uint8Array>>,
): BulkDownloadOperation => {
  let state: BulkDownloadOperationState = {kind: 'idle'};
  let isActive = false;
  let operationId = 0;
  const listeners = new Set<(state: BulkDownloadOperationState) => void>();

  const setState = (nextState: BulkDownloadOperationState): void => {
    state = nextState;
    listeners.forEach(listener => {
      try {
        listener(state);
      } catch {
        // A status observer must not interrupt the transfer lifecycle.
      }
    });
  };

  return {
    getState: () => {
      return state;
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        return listeners.delete(listener);
      };
    },
    start: async request => {
      if (isActive) {
        throw new Error('A bulk download is already in progress');
      }
      if (request.selection.kind !== 'eligible') {
        throw new Error(`Cannot start bulk download: ${request.selection.reason}`);
      }

      isActive = true;
      const currentOperationId = ++operationId;

      try {
        setState({kind: 'starting'});
        const source = await download({
          paths: request.selection.paths,
          archiveParentPath: request.archiveParentPath,
          abortController: request.abortController,
        });
        let bytesReceived = 0;
        let isCancelling = false;
        const reader = source.getReader();
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const {done, value} = await reader.read();
              if (isCancelling) {
                return;
              }
              if (done) {
                controller.close();
                if (!isCancelling && operationId === currentOperationId) {
                  isActive = false;
                  setState({kind: 'stream-consumed', bytesReceived});
                }
                return;
              }
              bytesReceived += value.byteLength;
              if (operationId === currentOperationId) {
                setState({kind: 'downloading', bytesReceived});
              }
              controller.enqueue(value);
            } catch (error) {
              if (isCancelling) {
                return;
              }
              if (operationId === currentOperationId) {
                isActive = false;
                setState({kind: 'failed', error});
              }
              controller.error(error);
            }
          },
          async cancel(reason) {
            isCancelling = true;
            try {
              await reader.cancel(reason);
              if (operationId === currentOperationId) {
                isActive = false;
                setState({kind: 'cancelled'});
              }
            } catch (error) {
              if (operationId === currentOperationId) {
                isActive = false;
                setState({kind: 'failed', error});
              }
              throw error;
            }
          },
        });
        return {
          stream,
          get bytesReceived() {
            return bytesReceived;
          },
        };
      } catch (error) {
        if (operationId === currentOperationId) {
          isActive = false;
          setState({kind: 'failed', error});
        }
        throw error;
      }
    },
  };
};
