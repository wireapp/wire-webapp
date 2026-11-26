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

import {useEffect, useMemo, useRef, useState} from 'react';

import {
  createBulkDownloadOperation,
  resolveBulkDownloadSelection,
  type BulkDownloadOperationState,
  type BulkDownloadRejectionReason,
  type BulkDownloadSelection,
} from './bulkDownloadOperation';

import {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import type {CellNode} from '../../../../types/cellNode';
import type {Translate} from '../../../../util/localizerUtil/translationTypes';
import {downloadBlob, formatBytes} from '../../../../util/util';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';

const getArchiveParentPath = (): string => {
  const currentPath = getCellsFilesPath();
  return currentPath.trim().length > 0 ? currentPath : 'wire-cells-web';
};

const readArchiveBlob = async (stream: ReadableStream<Uint8Array>): Promise<Blob> => {
  const reader = stream.getReader();
  const chunks: ArrayBuffer[] = [];

  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      const chunk = new ArrayBuffer(value.byteLength);
      new Uint8Array(chunk).set(value);
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return new Blob(chunks, {type: 'application/zip'});
};

type BulkDownloadViewState = BulkDownloadOperationState | {readonly kind: 'ready'};

const getUnavailableReason = (
  selection: BulkDownloadSelection,
  selectedCount: number,
): Exclude<BulkDownloadRejectionReason, 'empty'> | null => {
  if (selectedCount === 0 || selection.kind === 'eligible' || selection.reason === 'empty') {
    return null;
  }
  return selection.reason;
};

const getStatusMessage = (state: BulkDownloadViewState, translate: Translate): string | null => {
  switch (state.kind) {
    case 'starting':
      return translate('cells.bulkDownload.starting');
    case 'downloading':
      return translate('cells.bulkDownload.progress', {bytes: formatBytes(state.bytesReceived)});
    case 'stream-consumed':
      return translate('cells.bulkDownload.preparingBrowserDownload');
    case 'failed':
      return translate('cells.bulkDownload.failed');
    case 'ready':
    case 'cancelled':
    case 'idle':
      return null;
  }
};

interface UseBulkDownloadSelectionOptions {
  readonly cellsRepository: CellsRepository;
  readonly selectedNodes: readonly CellNode[];
  readonly selectedCount: number;
  readonly canDownload: boolean;
  readonly isSupportedLocation: boolean;
  readonly isSelectionEnabled: boolean;
  readonly isSelectionDisabled: boolean;
  readonly translate: Translate;
}

interface BulkDownloadSelectionControls {
  readonly unavailableReason: Exclude<BulkDownloadRejectionReason, 'empty'> | null;
  readonly isVisible: boolean;
  readonly isDisabled: boolean;
  readonly statusMessage: string | null;
  readonly isFailure: boolean;
  readonly start: () => Promise<void>;
}

export const useBulkDownloadSelection = ({
  cellsRepository,
  selectedNodes,
  selectedCount,
  canDownload,
  isSupportedLocation,
  isSelectionEnabled,
  isSelectionDisabled,
  translate,
}: UseBulkDownloadSelectionOptions): BulkDownloadSelectionControls => {
  const operation = useMemo(() => {
    return createBulkDownloadOperation(request => {
      return cellsRepository.downloadSelectionArchive(request);
    });
  }, [cellsRepository]);
  const [state, setState] = useState<BulkDownloadViewState>({kind: 'idle'});
  const isStartingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = operation.subscribe(setState);
    return () => {
      isMountedRef.current = false;
      unsubscribe();
      abortControllerRef.current?.abort();
    };
  }, [operation]);

  const selection = resolveBulkDownloadSelection({nodes: selectedNodes, canDownload, selectedCount});
  const unavailableReason = getUnavailableReason(selection, selectedCount);
  const isActive = state.kind === 'starting' || state.kind === 'downloading' || state.kind === 'stream-consumed';
  const isDisabled = !isSelectionEnabled || isSelectionDisabled || isActive || selection.kind !== 'eligible';
  const isFailure = state.kind === 'failed';
  const statusMessage = getStatusMessage(state, translate);

  const start = async (): Promise<void> => {
    if (isStartingRef.current || isDisabled || selection.kind !== 'eligible') {
      return;
    }

    isStartingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      const {stream} = await operation.start({
        selection,
        archiveParentPath: getArchiveParentPath(),
        abortController,
      });
      if (abortController.signal.aborted) {
        await stream.cancel();
        return;
      }

      const archive = await readArchiveBlob(stream);
      if (abortController.signal.aborted) {
        return;
      }
      downloadBlob(archive, 'bulk-download.zip', 'application/zip');
      if (isMountedRef.current) {
        setState({kind: 'ready'});
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState({kind: 'failed', error});
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      isStartingRef.current = false;
    }
  };

  return {
    unavailableReason,
    isVisible: isSupportedLocation && isSelectionEnabled,
    isDisabled,
    statusMessage,
    isFailure,
    start,
  };
};
