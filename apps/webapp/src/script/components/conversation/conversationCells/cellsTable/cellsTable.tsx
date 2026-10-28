/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {DragEvent, useEffect, useRef, useState, type FunctionComponent, type ReactElement} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {createPortal} from 'react-dom';
import {Maybe, maybe, task} from 'true-myth';

import {ArrowIcon, CloseIcon, UploadIcon} from '@wireapp/react-ui-kit';

import {CellsBulkMovePreviewModal} from 'Components/conversation/conversationCells/cellsTable/cellsBulkMovePreviewModal/cellsBulkMovePreviewModal';
import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {isInRecycleBin} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {
  useSharedDriveUploadStatus,
  type SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {formatBytes} from 'Util/util';

import {CellsFilePreviewModal} from './cellsFilePreviewModal/cellsFilePreviewModal';
import {
  bulkMoveButtonStyles,
  clearSelectionButtonStyles,
  folderDropOverlayDescriptionStyles,
  folderDropOverlayFolderNameStyles,
  folderDropOverlayStyles,
  folderDropOverlayTitleStyles,
  folderDropTargetRowStyles,
  headerCellStyles,
  moveOutcomeMessageStyles,
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  selectedTableCellRowStyles,
  selectionBarContainerStyles,
  selectionBarStyles,
  selectionCountStyles,
  selectionSizeStyles,
  tableStyles,
  wrapperWithRowsStyles,
  wrapperStyles,
} from './cellsTable.styles';
import {getCellsTableColumns, getCellsTableDataCellLabels} from './cellsTableColumns/cellsTableColumns';
import {CellsFilePreviewModalProvider} from './common/cellsFilePreviewModalContext/cellsFilePreviewModalContext';

import {CellsSortDirection} from '../common/cellsSortIcon/cellsSortIcon';
import {CellsSortField, SORTABLE_COLUMN_FIELD, toAriaSort} from '../common/useCellsSorting/useCellsSorting';
import {getSharedDriveDroppedFiles} from '../getSharedDriveDroppedFiles';

interface CellsTableProps {
  nodes: CellNode[];
  cellsRepository: CellsRepository;
  conversation: Conversation;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  onRefresh: () => void;
  onRefreshAfterBulkMoveOutcome: () => Promise<boolean>;
  onCloseSearchView?: () => void;
  folderDropResetKey?: number;
  onFolderDropTargetChange?: (folderName: string | null) => void;
  onDropFilesToFolder?: (files: readonly File[], uploadPath: string) => void;
  onDropReadError: () => void;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
  onToggleSort: (field: CellsSortField) => void;
  selectionEnabled: boolean;
  selectionScopeKey: string;
  selectionBarAnchor: HTMLElement | null;
  random?: () => number;
}

interface CellsTableHeaderCellProps {
  header: Header<CellNode, unknown>;
  getDirectionFor: (field: CellsSortField) => CellsSortDirection | undefined;
  isSortingEnabled: boolean;
}

const CellsTableHeaderCell: FunctionComponent<CellsTableHeaderCellProps> = ({
  header,
  getDirectionFor,
  isSortingEnabled,
}: CellsTableHeaderCellProps) => {
  const sortField = SORTABLE_COLUMN_FIELD[header.column.id];
  const ariaSort = isSortingEnabled && isNonEmptyString(sortField) ? toAriaSort(getDirectionFor(sortField)) : undefined;

  return (
    <th
      css={headerCellStyles}
      aria-sort={ariaSort}
      style={{
        width: header.id === 'name' ? undefined : header.getSize(),
      }}
    >
      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
    </th>
  );
};

const dragEventContainsFiles = (event: DragEvent<HTMLElement>): boolean => {
  return Array.from(event.dataTransfer.types).includes('Files');
};

const getSelectedFilesTotalSize = (nodes: CellNode[]): Maybe<number> => {
  if (nodes.length === 0) {
    return Maybe.nothing();
  }

  let totalBytes = 0;
  for (const node of nodes) {
    if (node.type !== CellNodeType.FILE || maybe.isNothing(node.sizeBytes)) {
      return Maybe.nothing();
    }

    const fileBytes = node.sizeBytes.value;
    if (!Number.isSafeInteger(fileBytes) || fileBytes < 0) {
      return Maybe.nothing();
    }

    totalBytes += fileBytes;
    if (!Number.isSafeInteger(totalBytes)) {
      return Maybe.nothing();
    }
  }

  return Maybe.just(totalBytes);
};

const preventDefaultFileDrop = (event: DragEvent<HTMLElement>): void => {
  event.preventDefault();
  event.stopPropagation();
};

const BACKGROUND_MOVE_STATUS_POLL_INTERVAL_MS = 1000;
const BACKGROUND_MOVE_STATUS_RETRY_BACKOFF_FACTOR = 2;
const BACKGROUND_MOVE_STATUS_RETRY_MIN_JITTER_FACTOR = 0.75;
const BACKGROUND_MOVE_STATUS_RETRY_MAX_JITTER_FACTOR = 1.25;
const MAX_BACKGROUND_MOVE_STATUS_RETRIES = 5;

type BulkMoveOutcomeEvidence = 'complete' | 'partial' | 'unknown';

const getBulkMoveOutcomeEvidence = (
  affectedNodes: RestPerformActionResponse['AffectedNodes'],
  expectedNodeIds: string[],
): BulkMoveOutcomeEvidence => {
  if (affectedNodes === undefined) {
    return 'unknown';
  }

  const affectedNodeIds = affectedNodes.map(({Uuid}) => {
    return Uuid;
  });
  const affectedNodeIdSet = new Set(affectedNodeIds);
  if (affectedNodeIdSet.size !== affectedNodeIds.length) {
    return 'unknown';
  }

  const expectedNodeIdSet = new Set(expectedNodeIds);
  const missingExpectedNodes = expectedNodeIds.some(nodeId => {
    return !affectedNodeIdSet.has(nodeId);
  });
  if (!missingExpectedNodes) {
    return 'complete';
  }

  const includesUnexpectedNodes = affectedNodeIds.some(nodeId => {
    return !expectedNodeIdSet.has(nodeId);
  });
  return includesUnexpectedNodes ? 'unknown' : 'partial';
};

export const CellsTable = ({
  nodes,
  cellsRepository,
  conversation,
  conversationQualifiedId,
  conversationName,
  onRefresh,
  onRefreshAfterBulkMoveOutcome,
  onCloseSearchView,
  folderDropResetKey,
  onFolderDropTargetChange,
  onDropFilesToFolder,
  onDropReadError,
  getDirectionFor,
  isSortingEnabled,
  onToggleSort,
  selectionEnabled,
  selectionScopeKey,
  selectionBarAnchor,
  random = Math.random,
}: CellsTableProps): ReactElement => {
  const {clock, translate, isFeatureToggleEnabled} = useApplicationContext();
  const {updateMoveStatus, createMoveStatusId, clearMoveStatus} = useSharedDriveUploadStatus();
  const backgroundMoveSummary = useRef<Maybe<SharedDriveMoveSummary>>(Maybe.nothing());
  const activeMoveStatusId = useRef<Maybe<string>>(Maybe.nothing());
  const canPerformCurrentDriveAction = useCellsActionPermissions();
  const isSelectionEnabled = selectionEnabled && isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => {
    return new Set();
  });
  const [isBulkMovePreviewOpen, setIsBulkMovePreviewOpen] = useState(false);
  const [isBulkMoveRequestPending, setIsBulkMoveRequestPending] = useState(false);
  const [isBackgroundMovePending, setIsBackgroundMovePending] = useState(false);
  const isMovePendingRef = useRef(false);
  isMovePendingRef.current = isBulkMoveRequestPending || isBackgroundMovePending;
  const [isBackgroundMoveError, setIsBackgroundMoveError] = useState(false);
  const [isBackgroundMoveRetryBlocked, setIsBackgroundMoveRetryBlocked] = useState(false);
  const [isBackgroundMoveStatusUnknown, setIsBackgroundMoveStatusUnknown] = useState(false);
  const [backgroundMoveJobUuids, setBackgroundMoveJobUuids] = useState<string[]>([]);
  const [backgroundMoveStatusId, setBackgroundMoveStatusId] = useState('');
  const [backgroundMoveStatusCheckId, setBackgroundMoveStatusCheckId] = useState(0);
  const [isBulkMoveOutcomeUnresolved, setIsBulkMoveOutcomeUnresolved] = useState(false);
  const [isBulkMovePartialOutcome, setIsBulkMovePartialOutcome] = useState(false);
  const [isBulkMoveRequestError, setIsBulkMoveRequestError] = useState(false);
  const [isRefreshingBulkMoveOutcome, setIsRefreshingBulkMoveOutcome] = useState(false);
  const [didBulkMoveOutcomeRefreshFail, setDidBulkMoveOutcomeRefreshFail] = useState(false);

  useEffect(() => {
    if (isMovePendingRef.current) {
      return;
    }

    setSelectedNodeIds(new Set());
    setIsBulkMovePreviewOpen(false);
  }, [selectionScopeKey, isSelectionEnabled]);

  const handleBulkMoveRequestError = (): void => {
    if (maybe.isJust(activeMoveStatusId.current) && maybe.isJust(backgroundMoveSummary.current)) {
      updateMoveStatus({
        id: activeMoveStatusId.current.value,
        kind: 'request-failed',
        ...backgroundMoveSummary.current.value,
      });
    }
    backgroundMoveSummary.current = Maybe.nothing();
    setIsBulkMoveRequestPending(false);
    setIsBulkMovePreviewOpen(false);
    setIsBulkMoveOutcomeUnresolved(true);
    setIsBulkMovePartialOutcome(false);
    setIsBulkMoveRequestError(true);
  };

  const handleRefreshAfterBulkMoveOutcome = async (): Promise<void> => {
    if (isRefreshingBulkMoveOutcome) {
      return;
    }

    setIsRefreshingBulkMoveOutcome(true);
    const wasRefreshSuccessful = await onRefreshAfterBulkMoveOutcome();
    setIsRefreshingBulkMoveOutcome(false);
    setDidBulkMoveOutcomeRefreshFail(!wasRefreshSuccessful);
    if (!wasRefreshSuccessful) {
      return;
    }

    if (maybe.isJust(activeMoveStatusId.current)) {
      clearMoveStatus(activeMoveStatusId.current.value);
    }
    activeMoveStatusId.current = Maybe.nothing();
    backgroundMoveSummary.current = Maybe.nothing();
    setSelectedNodeIds(new Set());
    setIsBulkMoveOutcomeUnresolved(false);
    setIsBulkMovePartialOutcome(false);
    setIsBulkMoveRequestError(false);
    setIsBackgroundMoveError(false);
    setIsBackgroundMoveRetryBlocked(false);
    setIsBackgroundMoveStatusUnknown(false);
    setIsBulkMovePreviewOpen(false);
  };

  const handleBulkMoveStart = (summary: SharedDriveMoveSummary): void => {
    const id = createMoveStatusId();
    activeMoveStatusId.current = Maybe.just(id);
    backgroundMoveSummary.current = Maybe.just(summary);
    setIsBulkMoveRequestPending(true);
    setIsBulkMovePreviewOpen(false);
    setIsBulkMoveOutcomeUnresolved(false);
    setIsBulkMovePartialOutcome(false);
    setIsBulkMoveRequestError(false);
    setIsBackgroundMoveError(false);
    setIsBackgroundMoveStatusUnknown(false);
    updateMoveStatus({id, kind: 'processing', ...summary});
  };

  useEffect(() => {
    if (backgroundMoveJobUuids.length === 0 || backgroundMoveStatusId.length === 0) {
      return undefined;
    }

    let isActive = true;
    let timeout: ReturnType<typeof clock.setTimeout> | undefined;
    let retryCount = 0;
    const scheduleNextCheck = (delay: number): void => {
      timeout = clock.setTimeout(() => {
        void checkBackgroundMoveStatus();
      }, delay);
    };
    const moveStatusId = backgroundMoveStatusId;
    const handleUnknownStatus = (): void => {
      if (retryCount >= MAX_BACKGROUND_MOVE_STATUS_RETRIES) {
        if (maybe.isJust(backgroundMoveSummary.current)) {
          updateMoveStatus({id: moveStatusId, kind: 'status-unknown', ...backgroundMoveSummary.current.value});
        }
        activeMoveStatusId.current = Maybe.just(moveStatusId);
        setIsBackgroundMovePending(false);
        setIsBackgroundMoveStatusUnknown(true);
        setIsBulkMoveOutcomeUnresolved(true);
        setIsBulkMovePreviewOpen(false);
        return;
      }

      const retryDelay =
        BACKGROUND_MOVE_STATUS_POLL_INTERVAL_MS *
        BACKGROUND_MOVE_STATUS_RETRY_BACKOFF_FACTOR ** retryCount *
        (BACKGROUND_MOVE_STATUS_RETRY_MIN_JITTER_FACTOR +
          random() * (BACKGROUND_MOVE_STATUS_RETRY_MAX_JITTER_FACTOR - BACKGROUND_MOVE_STATUS_RETRY_MIN_JITTER_FACTOR));
      retryCount += 1;
      scheduleNextCheck(retryDelay);
    };
    const checkBackgroundMoveStatus = async (): Promise<void> => {
      const statusResults = await Promise.all(
        backgroundMoveJobUuids.map(jobUuid => {
          return task.tryOrElse(
            error => {
              return error;
            },
            () => {
              return cellsRepository.getBackgroundMoveInfo({jobUuid});
            },
          );
        }),
      );
      if (!isActive) {
        return;
      }

      const backgroundActions = statusResults.map(statusResult => {
        return statusResult.isOk ? statusResult.value : undefined;
      });
      const statuses = backgroundActions.map(action => {
        return action?.Status;
      });
      if (
        statuses.some(status => {
          return status === undefined || status === JobsTaskStatus.Unknown;
        })
      ) {
        handleUnknownStatus();
        return;
      }
      retryCount = 0;
      if (maybe.isJust(backgroundMoveSummary.current)) {
        updateMoveStatus({id: moveStatusId, kind: 'processing', ...backgroundMoveSummary.current.value});
      }
      const areAllJobsFinished = statuses.every(status => {
        return status === JobsTaskStatus.Finished;
      });
      if (areAllJobsFinished) {
        if (maybe.isJust(backgroundMoveSummary.current)) {
          updateMoveStatus({id: moveStatusId, kind: 'finished-unknown', ...backgroundMoveSummary.current.value});
        }
        activeMoveStatusId.current = Maybe.just(moveStatusId);
        backgroundMoveSummary.current = Maybe.nothing();
        setBackgroundMoveStatusId('');
        setBackgroundMoveJobUuids([]);
        setIsBackgroundMovePending(false);
        setIsBackgroundMoveError(false);
        setIsBackgroundMoveRetryBlocked(true);
        setIsBackgroundMoveStatusUnknown(false);
        setIsBulkMoveOutcomeUnresolved(true);
        setIsBulkMovePartialOutcome(false);
        setIsBulkMoveRequestError(false);
        setIsBulkMovePreviewOpen(false);
        return;
      }

      const hasNonTerminalJob = statuses.some(status => {
        return (
          status !== JobsTaskStatus.Finished && status !== JobsTaskStatus.Error && status !== JobsTaskStatus.Interrupted
        );
      });
      if (hasNonTerminalJob) {
        scheduleNextCheck(BACKGROUND_MOVE_STATUS_POLL_INTERVAL_MS);
        return;
      }

      const hasFinishedJob = statuses.some(status => {
        return status === JobsTaskStatus.Finished;
      });
      if (hasFinishedJob) {
        if (maybe.isJust(backgroundMoveSummary.current)) {
          updateMoveStatus({id: moveStatusId, kind: 'partial', ...backgroundMoveSummary.current.value});
        }
        activeMoveStatusId.current = Maybe.just(moveStatusId);
        setBackgroundMoveJobUuids([]);
        setIsBackgroundMovePending(false);
        setIsBackgroundMoveRetryBlocked(true);
        setIsBackgroundMoveStatusUnknown(false);
        setIsBackgroundMoveError(false);
        setIsBulkMoveOutcomeUnresolved(true);
        setIsBulkMovePartialOutcome(true);
        setIsBulkMoveRequestError(false);
        backgroundMoveSummary.current = Maybe.nothing();
        setBackgroundMoveStatusId('');
        setIsBulkMovePreviewOpen(false);
        return;
      }

      if (maybe.isJust(backgroundMoveSummary.current)) {
        updateMoveStatus({id: moveStatusId, kind: 'failed', ...backgroundMoveSummary.current.value});
      }
      activeMoveStatusId.current = Maybe.just(moveStatusId);
      setBackgroundMoveJobUuids([]);
      setIsBackgroundMovePending(false);
      setIsBackgroundMoveRetryBlocked(true);
      setIsBackgroundMoveStatusUnknown(false);
      setIsBackgroundMoveError(true);
      setIsBulkMoveOutcomeUnresolved(true);
      setIsBulkMovePartialOutcome(false);
      setIsBulkMoveRequestError(false);
      backgroundMoveSummary.current = Maybe.nothing();
      setBackgroundMoveStatusId('');
      setIsBulkMovePreviewOpen(false);
    };

    void checkBackgroundMoveStatus();

    return () => {
      isActive = false;
      if (timeout !== undefined) {
        clock.clearTimeout(timeout);
      }
    };
  }, [
    backgroundMoveJobUuids,
    backgroundMoveStatusId,
    backgroundMoveStatusCheckId,
    cellsRepository,
    clock,
    clearMoveStatus,
    random,
    updateMoveStatus,
  ]);

  useEffect(() => {
    const currentNodeIds = new Set<string>();
    for (const node of nodes) {
      currentNodeIds.add(node.id);
    }
    setSelectedNodeIds(currentSelection => {
      const nextSelection = new Set(currentSelection);
      for (const nodeId of currentSelection) {
        if (!currentNodeIds.has(nodeId)) {
          nextSelection.delete(nodeId);
        }
      }
      return nextSelection.size === currentSelection.size ? currentSelection : nextSelection;
    });
  }, [nodes]);

  const handleBulkMoveResult = (response: RestPerformActionResponse, summary: SharedDriveMoveSummary): boolean => {
    const moveStatusId = maybe.isJust(activeMoveStatusId.current)
      ? activeMoveStatusId.current.value
      : createMoveStatusId();
    const outcomeEvidence = getBulkMoveOutcomeEvidence(
      response.AffectedNodes,
      summary.items.map(({id}) => {
        return id;
      }),
    );
    setIsBulkMoveRequestPending(false);
    setIsBackgroundMoveError(false);
    setIsBackgroundMoveRetryBlocked(false);
    setIsBackgroundMoveStatusUnknown(false);

    if (
      response.Status === RestActionStatus.Performed &&
      response.AffectedNodes !== undefined &&
      outcomeEvidence !== 'complete'
    ) {
      updateMoveStatus({
        id: moveStatusId,
        kind: outcomeEvidence === 'partial' ? 'partial' : 'finished-unknown',
        ...summary,
      });
      activeMoveStatusId.current = Maybe.just(moveStatusId);
      backgroundMoveSummary.current = Maybe.nothing();
      setIsBulkMoveOutcomeUnresolved(true);
      setIsBulkMovePartialOutcome(outcomeEvidence === 'partial');
      setIsBulkMoveRequestError(false);
      setIsBackgroundMovePending(false);
      setIsBackgroundMoveRetryBlocked(true);
      setIsBulkMovePreviewOpen(false);
      return false;
    }

    if (response.Status === RestActionStatus.Performed) {
      updateMoveStatus({id: moveStatusId, kind: 'completed', ...summary});
      activeMoveStatusId.current = Maybe.nothing();
      backgroundMoveSummary.current = Maybe.nothing();
      setIsBulkMoveOutcomeUnresolved(false);
      setIsBulkMoveRequestError(false);
      onRefresh();
      return true;
    }

    const moveJobUuids = response.BackgroundActions?.filter(action => {
      return action.Name === 'move' && isNonEmptyString(action.JobUuid);
    }).map(action => {
      return action.JobUuid;
    });
    const uniqueMoveJobUuids = [...new Set(moveJobUuids ?? [])];
    if (uniqueMoveJobUuids.length === 0) {
      updateMoveStatus({id: moveStatusId, kind: 'status-unknown', ...summary});
      activeMoveStatusId.current = Maybe.just(moveStatusId);
      backgroundMoveSummary.current = Maybe.nothing();
      setIsBulkMoveOutcomeUnresolved(true);
      setIsBackgroundMovePending(false);
      setIsBackgroundMoveStatusUnknown(true);
      setIsBulkMovePreviewOpen(false);
      return false;
    }

    activeMoveStatusId.current = Maybe.nothing();
    backgroundMoveSummary.current = Maybe.just(summary);
    setBackgroundMoveStatusId(moveStatusId);
    setBackgroundMoveJobUuids(uniqueMoveJobUuids);
    setIsBulkMoveOutcomeUnresolved(false);
    setIsBulkMovePartialOutcome(false);
    setIsBulkMoveRequestError(false);
    setIsBackgroundMovePending(true);
    updateMoveStatus({id: moveStatusId, kind: 'processing', ...summary});
    return true;
  };

  const handleRetryBackgroundMoveStatus = (): void => {
    if (backgroundMoveJobUuids.length === 0) {
      return;
    }

    setIsBackgroundMoveStatusUnknown(false);
    setIsBulkMoveOutcomeUnresolved(false);
    setIsBackgroundMovePending(true);
    if (maybe.isJust(backgroundMoveSummary.current)) {
      updateMoveStatus({
        id: backgroundMoveStatusId,
        kind: 'processing',
        ...backgroundMoveSummary.current.value,
      });
    }
    setBackgroundMoveStatusCheckId(currentCheckId => {
      return currentCheckId + 1;
    });
  };

  const handleToggleSelection = (nodeId: string, isSelected: boolean): void => {
    setSelectedNodeIds(currentSelection => {
      const nextSelection = new Set(currentSelection);
      if (isSelected) {
        nextSelection.add(nodeId);
      } else {
        nextSelection.delete(nodeId);
      }
      return nextSelection;
    });
  };
  const [activeFolderDropTargetId, setActiveFolderDropTargetId] = useState<string | null>(null);
  const [activeFolderDropTargetName, setActiveFolderDropTargetName] = useState<string | null>(null);
  const labels = {
    actions: translate('cells.tableRow.actions'),
    created: translate('cells.tableRow.modified'),
    name: translate('cells.tableRow.name'),
    owner: translate('cells.tableRow.owner'),
    publicLink: translate('cells.tableRow.publicLink'),
    size: translate('cells.tableRow.size'),
    tags: translate('cells.tableRow.tags'),
  };
  const cellLabels = getCellsTableDataCellLabels(labels);

  const table = useReactTable({
    data: nodes,
    columns: getCellsTableColumns({
      cellsRepository,
      conversationQualifiedId,
      conversationName,
      labels,
      onRefresh,
      onCloseSearchView,
      getDirectionFor,
      isSortingEnabled,
      onToggleSort,
      selectedNodeIds,
      onToggleSelection: handleToggleSelection,
      selectionEnabled: isSelectionEnabled && !isBulkMoveOutcomeUnresolved,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectedNodes = nodes.filter(node => {
    return selectedNodeIds.has(node.id);
  });
  const selectedFilesTotalSize =
    selectedNodes.length === selectedNodeIds.size ? getSelectedFilesTotalSize(selectedNodes) : Maybe.nothing();
  const canMoveSelection =
    selectedNodes.length > 0 &&
    !isBulkMoveOutcomeUnresolved &&
    !isBulkMoveRequestPending &&
    !isBackgroundMovePending &&
    !isInRecycleBin() &&
    canPerformCurrentDriveAction(CELLS_ACTION.MOVE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.MOVE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const tableWrapperStyles = rows.length > 0 ? [wrapperStyles, wrapperWithRowsStyles] : wrapperStyles;

  useEffect(() => {
    return () => {
      return onFolderDropTargetChange?.(null);
    };
  }, [onFolderDropTargetChange]);

  useEffect(() => {
    setActiveFolderDropTargetId(null);
    setActiveFolderDropTargetName(null);
  }, [folderDropResetKey]);

  const setActiveFolderDropTarget = (node: CellNode | null): void => {
    setActiveFolderDropTargetId(node?.id ?? null);
    setActiveFolderDropTargetName(node?.name ?? null);
    onFolderDropTargetChange?.(node?.name ?? null);
  };

  type GetFolderDropHandlersResult =
    | {onDragEnter?: undefined; onDragOver?: undefined; onDragLeave?: undefined; onDrop?: undefined}
    | {
        onDragEnter: (event: DragEvent<HTMLTableRowElement>) => void;
        onDragOver: (event: DragEvent<HTMLTableRowElement>) => void;
        onDragLeave: (event: DragEvent<HTMLTableRowElement>) => void;
        onDrop: (event: DragEvent<HTMLTableRowElement>) => void;
      };
  const getFolderDropHandlers = (node: CellNode): GetFolderDropHandlersResult => {
    if (node.type !== CellNodeType.FOLDER || onDropFilesToFolder === undefined) {
      return {};
    }

    return {
      onDragEnter: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        setActiveFolderDropTarget(node);
      },
      onDragOver: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        event.dataTransfer.dropEffect = 'copy';
        setActiveFolderDropTarget(node);
      },
      onDragLeave: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);

        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }

        setActiveFolderDropTarget(null);
      },
      onDrop: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          return;
        }

        preventDefaultFileDrop(event);
        setActiveFolderDropTarget(null);
        void getSharedDriveDroppedFiles(event.dataTransfer).then(result => {
          if (result.isErr) {
            onDropReadError();
            return;
          }

          onDropFilesToFolder(result.value, node.path);
        });
      },
    };
  };

  const getMoveOutcomeMessage = (): string => {
    if (isBulkMoveRequestError) {
      return translate('cells.bulkMove.requestFailed');
    }
    if (isBackgroundMoveError) {
      return translate('cells.bulkMove.allJobsFailed');
    }
    if (isBackgroundMoveStatusUnknown) {
      return translate('cells.bulkMove.statusLookupUnknown');
    }
    if (isBulkMovePartialOutcome) {
      return translate('cells.bulkMove.partialMoveWarning');
    }
    return translate('cells.bulkMove.finishedUnknown');
  };

  return (
    <CellsFilePreviewModalProvider>
      <div css={tableWrapperStyles}>
        {isSelectionEnabled &&
          !isBulkMoveOutcomeUnresolved &&
          selectionBarAnchor !== null &&
          createPortal(
            <div css={selectionBarContainerStyles}>
              {selectedNodeIds.size > 0 && (
                <div css={selectionBarStyles} role="status" aria-live="polite">
                  <button
                    css={clearSelectionButtonStyles}
                    type="button"
                    aria-label={translate('cells.selection.clear')}
                    onClick={() => {
                      return setSelectedNodeIds(new Set());
                    }}
                  >
                    <CloseIcon aria-hidden="true" />
                  </button>
                  <span css={selectionCountStyles}>
                    {translate('cells.selection.selectedCount', {count: selectedNodeIds.size})}
                  </span>
                  {maybe.isJust(selectedFilesTotalSize) && (
                    <span css={selectionSizeStyles}>{formatBytes(selectedFilesTotalSize.value)}</span>
                  )}
                  {canMoveSelection && (
                    <button
                      css={bulkMoveButtonStyles}
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        return setIsBulkMovePreviewOpen(true);
                      }}
                    >
                      <ArrowIcon direction="right" aria-hidden="true" focusable="false" />
                      {translate('cells.selection.move')}
                    </button>
                  )}
                </div>
              )}
            </div>,
            selectionBarAnchor,
          )}
        {(isBulkMovePreviewOpen || isBulkMoveRequestPending || isBackgroundMovePending) &&
          (canMoveSelection ||
            isBulkMoveOutcomeUnresolved ||
            isBulkMoveRequestPending ||
            isBackgroundMovePending ||
            isBackgroundMoveError ||
            isBackgroundMoveStatusUnknown) && (
            <CellsBulkMovePreviewModal
              isOpen={isBulkMovePreviewOpen}
              onClose={() => {
                return setIsBulkMovePreviewOpen(false);
              }}
              selectedNodes={selectedNodes}
              cellsRepository={cellsRepository}
              conversationQualifiedId={conversationQualifiedId}
              conversationName={conversationName}
              isMoveOutcomeUnresolved={isBulkMoveOutcomeUnresolved}
              isMoveRequestPending={isBulkMoveRequestPending}
              onMoveStart={handleBulkMoveStart}
              onMoveResult={handleBulkMoveResult}
              onMoveError={handleBulkMoveRequestError}
              isBackgroundMovePending={isBackgroundMovePending}
              isBackgroundMoveError={isBackgroundMoveError}
              isBackgroundMoveRetryBlocked={isBackgroundMoveRetryBlocked}
              isBackgroundMoveStatusUnknown={isBackgroundMoveStatusUnknown}
            />
          )}
        {activeFolderDropTargetName !== null && (
          <div css={folderDropOverlayStyles} role="status">
            <UploadIcon width={24} height={24} aria-hidden="true" />
            <p css={folderDropOverlayTitleStyles}>{translate('sharedDriveDropOverlayTitle')}</p>
            <p css={folderDropOverlayDescriptionStyles}>
              {translate('sharedDriveDropFolderOverlayDescription')}{' '}
              <span css={folderDropOverlayFolderNameStyles} title={activeFolderDropTargetName}>
                {activeFolderDropTargetName}
              </span>
            </p>
          </div>
        )}
        {isBulkMoveOutcomeUnresolved && (
          <div css={moveOutcomeMessageStyles} role="status" aria-live="polite">
            <span>
              {getMoveOutcomeMessage()}
              {didBulkMoveOutcomeRefreshFail && (
                <span role="alert">{translate('cells.newItemMenuModalForm.genericError')}</span>
              )}
            </span>
            <button
              css={bulkMoveButtonStyles}
              type="button"
              onClick={() => {
                void handleRefreshAfterBulkMoveOutcome();
              }}
              disabled={isRefreshingBulkMoveOutcome}
            >
              {translate('cells.bulkMove.refreshDrive')}
            </button>
            {isBackgroundMoveStatusUnknown && backgroundMoveJobUuids.length > 0 && (
              <button
                css={bulkMoveButtonStyles}
                type="button"
                onClick={handleRetryBackgroundMoveStatus}
                disabled={isBackgroundMovePending}
              >
                {translate('cells.bulkMove.checkStatus')}
              </button>
            )}
          </div>
        )}
        <table css={tableStyles}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => {
              return (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <CellsTableHeaderCell
                        key={header.id}
                        header={header}
                        getDirectionFor={getDirectionFor}
                        isSortingEnabled={isSortingEnabled}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </thead>
          {rows.length > 0 && (
            <tbody>
              {rows.map(row => {
                const node = row.original;
                const rowStyles = [
                  tableCellRow,
                  ...(isSelectionEnabled && selectedNodeIds.has(node.id) ? [selectedTableCellRowStyles] : []),
                  ...(activeFolderDropTargetId === node.id ? [folderDropTargetRowStyles] : []),
                ];

                return (
                  <tr
                    key={row.id}
                    css={rowStyles}
                    data-folder-drop-active={activeFolderDropTargetId === node.id || undefined}
                    aria-selected={isSelectionEnabled && selectedNodeIds.has(node.id)}
                    data-uie-name="cells-table-row"
                    {...getFolderDropHandlers(node)}
                  >
                    {row.getVisibleCells().map(cell => {
                      return (
                        <td
                          key={cell.id}
                          css={cell.column.id === 'id' ? tableActionsCellStyles : tableCellStyles}
                          data-cell={cellLabels[cell.column.id]}
                          style={{
                            width: cell.column.id == 'name' ? undefined : cell.column.getSize(),
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
        <CellsFilePreviewModal sourceConversation={conversation} />
      </div>
    </CellsFilePreviewModalProvider>
  );
};
