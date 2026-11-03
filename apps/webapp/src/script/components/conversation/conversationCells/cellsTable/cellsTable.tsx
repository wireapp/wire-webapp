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

import {
  DragEvent,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FunctionComponent,
  type ReactElement,
} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {createPortal} from 'react-dom';
import {Maybe, maybe} from 'true-myth';

import {
  ArrowIcon,
  Button,
  ButtonVariant,
  CloseIcon,
  SharedDriveUploadSpinnerIcon,
  TrashIcon,
  UploadIcon,
} from '@wireapp/react-ui-kit';

import {CellsBulkMovePreviewModal} from 'Components/conversation/conversationCells/cellsTable/cellsBulkMovePreviewModal/cellsBulkMovePreviewModal';
import {CellsBulkMoveToBinConfirmationModal} from 'Components/conversation/conversationCells/cellsTable/cellsBulkMoveToBinConfirmationModal';
import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {isInRecycleBin} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {
  useSharedDriveUploadStatus,
  type SharedDriveMoveStatusKind,
  type SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {PrimaryModal, removeCurrentModal, usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {Conversation} from 'Repositories/entity/Conversation';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {formatBytes} from 'Util/util';

import {bulkMoveReducer} from './bulkMoveState';
import {CellsFilePreviewModal} from './cellsFilePreviewModal/cellsFilePreviewModal';
import {
  bulkActionButtonStyles,
  bulkMoveToBinButtonStyles,
  clearSelectionButtonStyles,
  folderDropOverlayDescriptionStyles,
  folderDropOverlayFolderNameStyles,
  folderDropOverlayStyles,
  folderDropOverlayTitleStyles,
  folderDropTargetRowStyles,
  headerCellStyles,
  moveOutcomeMessageStyles,
  permanentDeleteProgressStyles,
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
import {getBulkMoveOutcomeEvidence} from './getBulkMoveOutcomeEvidence';

import {
  getCellsBackgroundActionEvidence,
  observeCellsBackgroundActionJobs,
} from '../common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import type {BinOperation} from '../common/cellsBinOperations/cellsBinOperationController';
import {useCellsBinOperationView} from '../common/cellsBinOperations/useCellsBinOperationView';
import {CellsSortDirection} from '../common/cellsSortIcon/cellsSortIcon';
import {CellsSortField, SORTABLE_COLUMN_FIELD, toAriaSort} from '../common/useCellsSorting/useCellsSorting';
import {getSharedDriveDroppedFiles} from '../getSharedDriveDroppedFiles';
import {moveStatusMessageKey} from '../sharedDriveMoveStatusMessages';

interface CellsTableProps {
  nodes: CellNode[];
  isNodesLoading: boolean;
  cellsRepository: CellsRepository;
  conversation: Conversation;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  onRefresh: () => void;
  onRefreshAndReportSuccess: () => Promise<boolean>;
  onRefreshAfterBulkMoveToBinOutcome: () => Promise<boolean>;
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

type PermanentDeleteReviewReason = 'job-failed' | 'refresh-failed' | 'still-visible' | 'timed-out';

type PermanentDeleteCheckingMessageKey =
  'cells.bulkDelete.checking' | 'cells.bulkDelete.checkingAfterJobFailure' | 'cells.bulkDelete.retryingRefresh';
type PermanentDeleteReviewMessageKey =
  | 'cells.bulkDelete.jobFailed'
  | 'cells.bulkDelete.refreshFailed'
  | 'cells.bulkDelete.stillVisible'
  | 'cells.bulkDelete.timedOut';

const hasSameSelection = (selectedNodeIds: ReadonlySet<string>, nodeIds: readonly string[]): boolean => {
  return (
    selectedNodeIds.size === nodeIds.length &&
    nodeIds.every(nodeId => {
      return selectedNodeIds.has(nodeId);
    })
  );
};

const getPermanentDeleteCheckingMessageKey = (
  reason: PermanentDeleteReviewReason | null,
): PermanentDeleteCheckingMessageKey => {
  if (reason === 'job-failed') {
    return 'cells.bulkDelete.checkingAfterJobFailure';
  }
  if (reason === 'refresh-failed') {
    return 'cells.bulkDelete.retryingRefresh';
  }

  return 'cells.bulkDelete.checking';
};

const getPermanentDeleteReviewMessageKey = (
  reason: PermanentDeleteReviewReason | null,
): PermanentDeleteReviewMessageKey => {
  switch (reason) {
    case 'job-failed':
      return 'cells.bulkDelete.jobFailed';
    case 'refresh-failed':
      return 'cells.bulkDelete.refreshFailed';
    case 'still-visible':
      return 'cells.bulkDelete.stillVisible';
    case 'timed-out':
    default:
      return 'cells.bulkDelete.timedOut';
  }
};

interface CapturedBulkMoveToBinSelection {
  nodeIds: string[];
  scopeKey: string;
  summary: SharedDriveMoveSummary;
  drive: QualifiedId;
  path: string;
}

type BulkMoveToBinReviewReason = 'request-failed' | 'partial' | 'job-failed' | 'status-unknown' | 'refresh-failed';

const getMoveToBinReviewReason = (
  operation: BinOperation | undefined,
  refreshFailed: boolean,
): BulkMoveToBinReviewReason | null => {
  if (operation?.reason === 'partial' || operation?.reason === 'job-failed' || operation?.reason === 'request-failed') {
    return operation.reason;
  }
  if (refreshFailed) {
    return 'refresh-failed';
  }
  if (operation?.reason === 'timed-out') {
    return 'status-unknown';
  }
  return operation?.reason ?? null;
};

const getPermanentDeleteReviewReason = (
  operation: BinOperation | undefined,
  refreshFailed: boolean,
  refreshTimedOut: boolean,
): PermanentDeleteReviewReason | null => {
  if (refreshTimedOut && operation?.reason !== 'job-failed' && operation?.reason !== 'partial') {
    return 'timed-out';
  }
  if (refreshFailed) {
    return 'refresh-failed';
  }
  if (operation?.reason === 'job-failed' || operation?.reason === 'partial') {
    return 'job-failed';
  }
  if (operation?.reason === 'timed-out') {
    return 'timed-out';
  }
  return operation?.state === 'needs-review' ? 'still-visible' : null;
};

const getMoveToBinStatusKind = (operation: BinOperation): SharedDriveMoveStatusKind => {
  if (operation.state === 'completed') {
    return 'completed';
  }
  if (operation.state === 'submitting' || operation.state === 'processing') {
    return 'processing';
  }
  switch (operation.reason) {
    case 'partial':
      return 'partial';
    case 'job-failed':
      return 'failed';
    case 'request-failed':
      return 'request-failed';
    default:
      return 'status-unknown';
  }
};

export const CellsTable = ({
  nodes,
  isNodesLoading,
  cellsRepository,
  conversation,
  conversationQualifiedId,
  conversationName,
  onRefresh,
  onRefreshAndReportSuccess,
  onRefreshAfterBulkMoveToBinOutcome,
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
  const [isBulkMoveToBinConfirmationOpen, setIsBulkMoveToBinConfirmationOpen] = useState(false);
  const [capturedBulkMoveToBin, setCapturedBulkMoveToBin] = useState<CapturedBulkMoveToBinSelection | null>(null);
  const latestSelectionScopeKey = useRef(selectionScopeKey);
  latestSelectionScopeKey.current = selectionScopeKey;
  const previousSelectionScopeKey = useRef(selectionScopeKey);
  const driveKey = JSON.stringify([conversationQualifiedId.domain, conversationQualifiedId.id]);
  const previousDriveKey = useRef(driveKey);
  const conversationQualifiedIdRef = useRef(conversationQualifiedId);
  conversationQualifiedIdRef.current = conversationQualifiedId;
  const [isBulkMovePreviewOpen, setIsBulkMovePreviewOpen] = useState(false);
  const [moveState, dispatchMove] = useReducer(bulkMoveReducer, {kind: 'idle'});
  const isBulkMoveRequestPending = moveState.kind === 'request-pending';
  const isBackgroundMovePending = moveState.kind === 'background-pending';
  const isBulkMoveOutcomeUnresolved = moveState.kind === 'needs-review';
  const isBackgroundMoveError = moveState.kind === 'needs-review' && moveState.reason === 'failed';
  const isBackgroundMoveStatusUnknown = moveState.kind === 'needs-review' && moveState.reason === 'status-unknown';
  const isBackgroundMoveRetryBlocked = moveState.kind === 'needs-review' && moveState.reason !== 'status-unknown';
  const isRefreshingBulkMoveOutcome = moveState.kind === 'needs-review' && moveState.refresh === 'refreshing';
  const didBulkMoveOutcomeRefreshFail = moveState.kind === 'needs-review' && moveState.refresh === 'failed';
  const isMovePendingRef = useRef(false);
  isMovePendingRef.current = isBulkMoveRequestPending || isBackgroundMovePending;
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  selectedNodeIdsRef.current = selectedNodeIds;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const selectionScopeKeyRef = useRef(selectionScopeKey);
  selectionScopeKeyRef.current = selectionScopeKey;
  const canPerformCurrentDriveActionRef = useRef(canPerformCurrentDriveAction);
  canPerformCurrentDriveActionRef.current = canPerformCurrentDriveAction;
  const permanentDeleteModalId = useId();
  const currentPath = getCellsFilesPath();
  const binView = useCellsBinOperationView({
    drive: conversationQualifiedId,
    path: currentPath,
    clock,
    isCurrentScope: () => {
      return getCellsFilesPath() === currentPath;
    },
    visibleNodeIds: nodes.map(node => {
      return node.id;
    }),
    isNodesLoading,
    onRefresh: isInRecycleBin() ? onRefreshAndReportSuccess : onRefreshAfterBulkMoveToBinOutcome,
    onAcknowledged: operation => {
      setSelectedNodeIds(current => {
        return hasSameSelection(current, operation.targetIds) ? new Set() : current;
      });
      setCapturedBulkMoveToBin(null);
    },
  });
  const binOperation = binView.operation;
  const isDriveBinLocked = binView.isLocked;
  const moveToBinOperation = binOperation?.kind === 'move-to-bin' ? binOperation : undefined;
  const permanentDeleteOperation = binOperation?.kind === 'permanent-delete' ? binOperation : undefined;
  const isBulkMoveToBinPending =
    moveToBinOperation !== undefined &&
    (moveToBinOperation.state === 'submitting' || moveToBinOperation.state === 'processing');
  const isBulkMoveToBinNeedsReview = moveToBinOperation !== undefined && isDriveBinLocked && !isBulkMoveToBinPending;
  const isRefreshingBulkMoveToBin = binView.isRefreshing;
  const bulkMoveToBinReviewReason = getMoveToBinReviewReason(moveToBinOperation, binView.refreshFailed);
  const isPermanentDeletePending = permanentDeleteOperation?.state === 'submitting';
  const isPermanentDeleteRejected = permanentDeleteOperation?.state === 'rejected';
  const isPermanentDeleteUnresolved =
    permanentDeleteOperation !== undefined && isDriveBinLocked && !isPermanentDeletePending;
  const isRefreshingPermanentDeleteReview = binView.isRefreshing;
  const isPermanentDeleteReconciling =
    permanentDeleteOperation !== undefined &&
    permanentDeleteOperation.needsRefresh &&
    permanentDeleteOperation.state !== 'submitting' &&
    isDriveBinLocked;
  const isPermanentDeleteReconciliationRequestInFlight = binView.isRefreshing;
  const permanentDeleteReviewReason = getPermanentDeleteReviewReason(
    permanentDeleteOperation,
    binView.refreshFailed,
    binView.refreshTimedOut,
  );
  const handleRefreshAfterPermanentDeleteReview = binView.refreshReview;
  const [backgroundMoveJobUuids, setBackgroundMoveJobUuids] = useState<string[]>([]);
  const [backgroundMoveStatusId, setBackgroundMoveStatusId] = useState('');
  const [backgroundMoveStatusCheckId, setBackgroundMoveStatusCheckId] = useState(0);

  useEffect(() => {
    const didSelectionScopeChange =
      previousSelectionScopeKey.current !== selectionScopeKey || previousDriveKey.current !== driveKey;
    previousSelectionScopeKey.current = selectionScopeKey;
    previousDriveKey.current = driveKey;
    if (isMovePendingRef.current) {
      return;
    }
    if (didSelectionScopeChange || !isSelectionEnabled) {
      setSelectedNodeIds(new Set());
      setIsBulkMovePreviewOpen(false);
      setIsBulkMoveToBinConfirmationOpen(false);
      setCapturedBulkMoveToBin(null);
      if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
        removeCurrentModal();
      }
    }
  }, [permanentDeleteModalId, selectionScopeKey, isSelectionEnabled, driveKey]);

  useEffect(() => {
    return () => {
      if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
        removeCurrentModal();
      }
    };
  }, [permanentDeleteModalId]);

  const handleBulkMoveRequestError = (): void => {
    if (maybe.isJust(activeMoveStatusId.current) && maybe.isJust(backgroundMoveSummary.current)) {
      updateMoveStatus({
        id: activeMoveStatusId.current.value,
        kind: 'request-failed',
        ...backgroundMoveSummary.current.value,
      });
    }
    backgroundMoveSummary.current = Maybe.nothing();
    dispatchMove({type: 'needs-review', reason: 'request-failed'});
    setIsBulkMovePreviewOpen(false);
  };

  const handleRefreshAfterBulkMoveOutcome = async (): Promise<void> => {
    if (isRefreshingBulkMoveOutcome) {
      return;
    }

    dispatchMove({type: 'refresh-started'});
    const wasRefreshSuccessful = await onRefreshAndReportSuccess();
    if (!wasRefreshSuccessful) {
      dispatchMove({type: 'refresh-failed'});
      return;
    }

    if (maybe.isJust(activeMoveStatusId.current)) {
      clearMoveStatus(activeMoveStatusId.current.value);
    }
    activeMoveStatusId.current = Maybe.nothing();
    backgroundMoveSummary.current = Maybe.nothing();
    setSelectedNodeIds(new Set());
    dispatchMove({type: 'resolved'});
    setIsBulkMovePreviewOpen(false);
  };

  const handleBulkMoveStart = (summary: SharedDriveMoveSummary): void => {
    const id = createMoveStatusId();
    activeMoveStatusId.current = Maybe.just(id);
    backgroundMoveSummary.current = Maybe.just(summary);
    dispatchMove({type: 'request-started'});
    setIsBulkMovePreviewOpen(false);
    updateMoveStatus({id, kind: 'processing', ...summary});
  };

  useEffect(() => {
    if (backgroundMoveJobUuids.length === 0 || backgroundMoveStatusId.length === 0) {
      return undefined;
    }

    const moveStatusId = backgroundMoveStatusId;
    return observeCellsBackgroundActionJobs({
      cellsRepository,
      actionName: 'move',
      jobUuids: backgroundMoveJobUuids,
      clock,
      pollingPolicy: {
        pollIntervalMs: BACKGROUND_MOVE_STATUS_POLL_INTERVAL_MS,
        maxUnknownRetries: MAX_BACKGROUND_MOVE_STATUS_RETRIES,
        maxPollAttempts: Maybe.nothing(),
        getUnknownRetryDelay: retryIndex => {
          return (
            BACKGROUND_MOVE_STATUS_POLL_INTERVAL_MS *
            BACKGROUND_MOVE_STATUS_RETRY_BACKOFF_FACTOR ** retryIndex *
            (BACKGROUND_MOVE_STATUS_RETRY_MIN_JITTER_FACTOR +
              random() *
                (BACKGROUND_MOVE_STATUS_RETRY_MAX_JITTER_FACTOR - BACKGROUND_MOVE_STATUS_RETRY_MIN_JITTER_FACTOR))
          );
        },
      },
      isCurrent: () => {
        return true;
      },
      onStatusSnapshot: () => {
        if (maybe.isJust(backgroundMoveSummary.current)) {
          updateMoveStatus({id: moveStatusId, kind: 'processing', ...backgroundMoveSummary.current.value});
        }
      },
      onOutcome: outcome => {
        if (outcome === 'all-finished') {
          if (maybe.isJust(backgroundMoveSummary.current)) {
            updateMoveStatus({id: moveStatusId, kind: 'completed', ...backgroundMoveSummary.current.value});
          }
          activeMoveStatusId.current = Maybe.nothing();
          backgroundMoveSummary.current = Maybe.nothing();
          setBackgroundMoveStatusId('');
          setBackgroundMoveJobUuids([]);
          dispatchMove({type: 'resolved'});
          setIsBulkMovePreviewOpen(false);
          onRefresh();
          return;
        }

        if (outcome === 'mixed-terminal') {
          if (maybe.isJust(backgroundMoveSummary.current)) {
            updateMoveStatus({id: moveStatusId, kind: 'partial', ...backgroundMoveSummary.current.value});
          }
          activeMoveStatusId.current = Maybe.just(moveStatusId);
          setBackgroundMoveJobUuids([]);
          dispatchMove({type: 'needs-review', reason: 'partial'});
          backgroundMoveSummary.current = Maybe.nothing();
          setBackgroundMoveStatusId('');
          setIsBulkMovePreviewOpen(false);
          return;
        }

        if (outcome === 'all-failed') {
          if (maybe.isJust(backgroundMoveSummary.current)) {
            updateMoveStatus({id: moveStatusId, kind: 'failed', ...backgroundMoveSummary.current.value});
          }
          activeMoveStatusId.current = Maybe.just(moveStatusId);
          setBackgroundMoveJobUuids([]);
          dispatchMove({type: 'needs-review', reason: 'failed'});
          backgroundMoveSummary.current = Maybe.nothing();
          setBackgroundMoveStatusId('');
          setIsBulkMovePreviewOpen(false);
          return;
        }

        if (maybe.isJust(backgroundMoveSummary.current)) {
          updateMoveStatus({id: moveStatusId, kind: 'status-unknown', ...backgroundMoveSummary.current.value});
        }
        activeMoveStatusId.current = Maybe.just(moveStatusId);
        dispatchMove({type: 'needs-review', reason: 'status-unknown'});
        setIsBulkMovePreviewOpen(false);
      },
    });
  }, [
    backgroundMoveJobUuids,
    backgroundMoveStatusId,
    backgroundMoveStatusCheckId,
    cellsRepository,
    clock,
    clearMoveStatus,
    onRefresh,
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
    const moveEvidence = getCellsBackgroundActionEvidence(response, 'move');
    const hasFinishedMoveJobs = (response.BackgroundActions?.length ?? 0) > 0 && moveEvidence.hasCompleted;
    // Cells 5.0.3 returns awaited job statuses without AffectedNodes.
    const isMoveComplete =
      outcomeEvidence === 'complete' || (response.AffectedNodes === undefined && hasFinishedMoveJobs);
    if (response.Status === RestActionStatus.Performed && !isMoveComplete) {
      updateMoveStatus({
        id: moveStatusId,
        kind: outcomeEvidence === 'partial' ? 'partial' : 'finished-unknown',
        ...summary,
      });
      activeMoveStatusId.current = Maybe.just(moveStatusId);
      backgroundMoveSummary.current = Maybe.nothing();
      dispatchMove({type: 'needs-review', reason: outcomeEvidence === 'partial' ? 'partial' : 'finished-unknown'});
      setIsBulkMovePreviewOpen(false);
      return false;
    }

    if (response.Status === RestActionStatus.Performed) {
      updateMoveStatus({id: moveStatusId, kind: 'completed', ...summary});
      activeMoveStatusId.current = Maybe.nothing();
      backgroundMoveSummary.current = Maybe.nothing();
      dispatchMove({type: 'resolved'});
      onRefresh();
      return true;
    }

    const uniqueMoveJobUuids = [...moveEvidence.jobUuids];
    if (uniqueMoveJobUuids.length === 0) {
      updateMoveStatus({id: moveStatusId, kind: 'status-unknown', ...summary});
      activeMoveStatusId.current = Maybe.just(moveStatusId);
      backgroundMoveSummary.current = Maybe.nothing();
      dispatchMove({type: 'needs-review', reason: 'status-unknown'});
      setIsBulkMovePreviewOpen(false);
      return false;
    }

    activeMoveStatusId.current = Maybe.nothing();
    backgroundMoveSummary.current = Maybe.just(summary);
    setBackgroundMoveStatusId(moveStatusId);
    setBackgroundMoveJobUuids(uniqueMoveJobUuids);
    dispatchMove({type: 'background-started'});
    updateMoveStatus({id: moveStatusId, kind: 'processing', ...summary});
    return true;
  };

  const handleRetryBackgroundMoveStatus = (): void => {
    if (backgroundMoveJobUuids.length === 0) {
      return;
    }

    dispatchMove({type: 'background-started'});
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

  const isCurrentPermanentDeleteScope = (scopeKey: string, path: string): boolean => {
    return (
      isInRecycleBin() &&
      getCellsFilesPath() === path &&
      selectionScopeKeyRef.current === scopeKey &&
      conversationQualifiedIdRef.current.id === conversationQualifiedId.id &&
      conversationQualifiedIdRef.current.domain === conversationQualifiedId.domain
    );
  };

  const handlePermanentDelete = async (nodeIds: string[], scopeKey: string, path: string): Promise<void> => {
    if (isPermanentDeletePending || isPermanentDeleteUnresolved || !isCurrentPermanentDeleteScope(scopeKey, path)) {
      return;
    }
    if (!hasSameSelection(selectedNodeIdsRef.current, nodeIds)) {
      return;
    }

    const selectedIdSet = new Set(nodeIds);
    const currentSelectedNodes = nodesRef.current.filter(node => {
      return selectedIdSet.has(node.id);
    });
    if (currentSelectedNodes.length !== nodeIds.length) {
      return;
    }
    if (!canPerformCurrentDriveActionRef.current(CELLS_ACTION.DELETE)) {
      return;
    }
    if (
      currentSelectedNodes.some(node => {
        return !canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
      })
    ) {
      return;
    }

    binView.controller.start({kind: 'permanent-delete', drive: conversationQualifiedId, path, targetIds: nodeIds});
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
      isOperationLocked: isDriveBinLocked,
      selectionEnabled:
        isSelectionEnabled &&
        !isDriveBinLocked &&
        !isBulkMoveOutcomeUnresolved &&
        !isPermanentDeleteUnresolved &&
        !isBulkMoveToBinNeedsReview &&
        !isBulkMoveToBinPending,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectedNodes = nodes.filter(node => {
    return selectedNodeIds.has(node.id);
  });
  const selectedFilesTotalSize =
    selectedNodes.length === selectedNodeIds.size ? getSelectedFilesTotalSize(selectedNodes) : Maybe.nothing();
  const canPermanentlyDeleteSelection =
    selectedNodes.length > 0 &&
    selectedNodes.length === selectedNodeIds.size &&
    isInRecycleBin() &&
    !isDriveBinLocked &&
    !isPermanentDeleteUnresolved &&
    canPerformCurrentDriveAction(CELLS_ACTION.DELETE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const canMoveSelection =
    selectedNodes.length > 0 &&
    !isDriveBinLocked &&
    !isBulkMoveOutcomeUnresolved &&
    !isBulkMoveRequestPending &&
    !isBackgroundMovePending &&
    !isBulkMoveToBinPending &&
    !isBulkMoveToBinNeedsReview &&
    !isInRecycleBin() &&
    canPerformCurrentDriveAction(CELLS_ACTION.MOVE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.MOVE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const canMoveSelectionToBin =
    !isDriveBinLocked &&
    isSelectionEnabled &&
    selectionEnabled &&
    selectedNodes.length > 0 &&
    selectedNodes.length === selectedNodeIds.size &&
    !isBulkMoveOutcomeUnresolved &&
    !isBulkMoveRequestPending &&
    !isBackgroundMovePending &&
    !isBulkMoveToBinPending &&
    !isBulkMoveToBinNeedsReview &&
    !isInRecycleBin() &&
    canPerformCurrentDriveAction(CELLS_ACTION.DELETE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const tableWrapperStyles = rows.length > 0 ? [wrapperStyles, wrapperWithRowsStyles] : wrapperStyles;

  const isCapturedBulkMoveToBinSelectionCurrent = useCallback(
    (captured: CapturedBulkMoveToBinSelection): boolean => {
      if (
        captured.scopeKey !== latestSelectionScopeKey.current ||
        !selectionEnabled ||
        !isSelectionEnabled ||
        isInRecycleBin() ||
        selectedNodeIds.size !== captured.nodeIds.length ||
        captured.nodeIds.some(nodeId => {
          return !selectedNodeIds.has(nodeId);
        })
      ) {
        return false;
      }

      const currentNodes = nodes.filter(node => {
        return captured.nodeIds.includes(node.id);
      });
      return (
        currentNodes.length === captured.nodeIds.length &&
        canPerformCurrentDriveAction(CELLS_ACTION.DELETE) &&
        currentNodes.every(node => {
          return canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
        })
      );
    },
    [selectionEnabled, isSelectionEnabled, selectedNodeIds, nodes, canPerformCurrentDriveAction],
  );

  const handleConfirmBulkMoveToBin = (): void => {
    const captured = capturedBulkMoveToBin;
    setIsBulkMoveToBinConfirmationOpen(false);
    if (
      captured === null ||
      isDriveBinLocked ||
      !isCapturedBulkMoveToBinSelectionCurrent(captured) ||
      captured.drive.id !== conversationQualifiedId.id ||
      captured.drive.domain !== conversationQualifiedId.domain ||
      captured.path !== getCellsFilesPath()
    ) {
      setCapturedBulkMoveToBin(null);
      return;
    }
    binView.controller.start({
      kind: 'move-to-bin',
      drive: captured.drive,
      path: captured.path,
      targetIds: captured.nodeIds,
      summary: captured.summary,
    });
  };
  const handleRefreshBulkMoveToBinOutcome = binView.refreshReview;

  useEffect(() => {
    if (moveToBinOperation?.summary === undefined || moveToBinOperation.state === 'rejected') {
      return;
    }
    const kind = getMoveToBinStatusKind(moveToBinOperation);
    const id = `bin-operation-${moveToBinOperation.id}`;
    updateMoveStatus({id, kind, ...moveToBinOperation.summary});
    return () => {
      clearMoveStatus(id);
    };
  }, [moveToBinOperation, updateMoveStatus, clearMoveStatus]);

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

  const moveOutcomeMessage = moveState.kind === 'needs-review' ? translate(moveStatusMessageKey[moveState.reason]) : '';
  const bulkMoveToBinReviewMessageKey =
    bulkMoveToBinReviewReason === null
      ? null
      : (
          {
            'request-failed': 'cells.bulkMoveToBin.requestFailed',
            partial: 'cells.bulkMoveToBin.partial',
            'job-failed': 'cells.bulkMoveToBin.jobFailed',
            'status-unknown': 'cells.bulkMoveToBin.statusUnknown',
            'refresh-failed': 'cells.bulkMoveToBin.refreshFailed',
          } as const
        )[bulkMoveToBinReviewReason];

  return (
    <CellsFilePreviewModalProvider>
      <div css={tableWrapperStyles}>
        {isSelectionEnabled &&
          !isBulkMoveOutcomeUnresolved &&
          !isBulkMoveToBinNeedsReview &&
          selectionBarAnchor !== null &&
          createPortal(
            <div css={selectionBarContainerStyles}>
              {selectedNodeIds.size > 0 && (
                <div css={selectionBarStyles} role="status" aria-live="polite">
                  <button
                    css={clearSelectionButtonStyles}
                    type="button"
                    aria-label={translate('cells.selection.clear')}
                    disabled={isBulkMoveToBinPending}
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
                  {canPermanentlyDeleteSelection && (
                    <button
                      css={bulkActionButtonStyles}
                      type="button"
                      aria-haspopup="dialog"
                      disabled={isPermanentDeletePending}
                      onClick={() => {
                        const nodeIds = selectedNodes.map(node => {
                          return node.id;
                        });
                        const path = getCellsFilesPath();
                        const descriptionKey =
                          nodeIds.length === 1
                            ? 'cells.bulkDelete.confirmation.single'
                            : 'cells.bulkDelete.confirmation.multiple';
                        PrimaryModal.show(
                          PrimaryModal.type.CONFIRM,
                          {
                            primaryAction: {
                              action: () => {
                                void handlePermanentDelete(nodeIds, selectionScopeKey, path);
                              },
                              text: translate('cells.deletePermanentlyModal.button'),
                            },
                            text: {
                              message: translate(descriptionKey, {count: nodeIds.length}),
                              title: translate('cells.deletePermanentlyModal.headline'),
                            },
                          },
                          permanentDeleteModalId,
                          translate,
                        );
                      }}
                    >
                      {translate('cells.options.deletePermanently')}
                    </button>
                  )}
                  {canMoveSelection && (
                    <button
                      css={bulkActionButtonStyles}
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
                  {canMoveSelectionToBin && (
                    <button
                      css={bulkMoveToBinButtonStyles}
                      type="button"
                      aria-haspopup="dialog"
                      onClick={() => {
                        const summary = {
                          items: selectedNodes.map(node => {
                            return {id: node.id, name: node.name, isFolder: node.type === CellNodeType.FOLDER};
                          }),
                          destinationPath: translate('cells.bulkMoveToBin.destination'),
                        };
                        setCapturedBulkMoveToBin({
                          nodeIds: selectedNodes.map(({id}) => {
                            return id;
                          }),
                          scopeKey: selectionScopeKey,
                          summary,
                          drive: {...conversationQualifiedId},
                          path: getCellsFilesPath(),
                        });
                        setIsBulkMoveToBinConfirmationOpen(true);
                      }}
                    >
                      <TrashIcon width={14} height={14} aria-hidden="true" />
                      {translate('cells.selection.moveToBin')}
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
        <CellsBulkMoveToBinConfirmationModal
          isOpen={isBulkMoveToBinConfirmationOpen}
          selectedRootCount={capturedBulkMoveToBin?.nodeIds.length ?? 0}
          isSubmitting={isBulkMoveToBinPending}
          onClose={() => {
            if (!isBulkMoveToBinPending) {
              setIsBulkMoveToBinConfirmationOpen(false);
              setCapturedBulkMoveToBin(null);
            }
          }}
          onConfirm={() => {
            void handleConfirmBulkMoveToBin();
          }}
        />
        {isBulkMoveToBinPending && !isBulkMoveToBinConfirmationOpen && moveToBinOperation !== undefined && (
          <div css={moveOutcomeMessageStyles} role="status" aria-live="polite">
            {translate('cells.bulkMoveToBin.moving', {count: moveToBinOperation.targetIds.length})}
          </div>
        )}
        {isBulkMoveToBinNeedsReview && bulkMoveToBinReviewMessageKey !== null && (
          <div css={moveOutcomeMessageStyles} role="alert">
            <span>{translate(bulkMoveToBinReviewMessageKey)}</span>
            <Button
              variant={ButtonVariant.SECONDARY}
              type="button"
              onClick={() => {
                void handleRefreshBulkMoveToBinOutcome();
              }}
              disabled={isRefreshingBulkMoveToBin}
            >
              {translate('cells.bulkMoveToBin.refresh')}
            </Button>
          </div>
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
        {isPermanentDeleteUnresolved && isPermanentDeleteReconciling && (
          <div css={permanentDeleteProgressStyles} role="status" aria-live="polite">
            <SharedDriveUploadSpinnerIcon color="var(--accent-color)" width={16} height={16} aria-hidden="true" />
            <span>{translate(getPermanentDeleteCheckingMessageKey(permanentDeleteReviewReason))}</span>
          </div>
        )}
        {(isPermanentDeleteRejected || moveToBinOperation?.state === 'rejected') && !isPermanentDeleteUnresolved && (
          <div css={permanentDeleteProgressStyles} role="alert">
            {translate('cells.bulkDelete.rejected')}
          </div>
        )}
        {isPermanentDeleteUnresolved && !isPermanentDeleteReconciling && (
          <div css={permanentDeleteProgressStyles} role="alert">
            <span>{translate(getPermanentDeleteReviewMessageKey(permanentDeleteReviewReason))}</span>
            <Button
              variant={ButtonVariant.SECONDARY}
              type="button"
              onClick={() => {
                void handleRefreshAfterPermanentDeleteReview();
              }}
              disabled={isRefreshingPermanentDeleteReview || isPermanentDeleteReconciliationRequestInFlight}
            >
              {translate('cells.bulkDelete.refresh')}
            </Button>
          </div>
        )}
        {isBulkMoveOutcomeUnresolved && (
          <div css={moveOutcomeMessageStyles}>
            <span>
              {moveOutcomeMessage}
              {didBulkMoveOutcomeRefreshFail && (
                <span role="alert">{translate('cells.newItemMenuModalForm.genericError')}</span>
              )}
            </span>
            <Button
              variant={ButtonVariant.SECONDARY}
              type="button"
              onClick={() => {
                void handleRefreshAfterBulkMoveOutcome();
              }}
              disabled={isRefreshingBulkMoveOutcome}
            >
              {translate('cells.bulkMove.refreshDrive')}
            </Button>
            {isBackgroundMoveStatusUnknown && backgroundMoveJobUuids.length > 0 && (
              <Button
                variant={ButtonVariant.SECONDARY}
                type="button"
                onClick={handleRetryBackgroundMoveStatus}
                disabled={isBackgroundMovePending}
              >
                {translate('cells.bulkMove.checkStatus')}
              </Button>
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
