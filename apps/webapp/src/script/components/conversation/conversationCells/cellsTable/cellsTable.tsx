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

import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {createPortal} from 'react-dom';
import {Maybe, maybe} from 'true-myth';

import {ArrowIcon, Button, ButtonVariant, CloseIcon, TrashIcon, UploadIcon} from '@wireapp/react-ui-kit';

import {bulkMoveReducer} from './bulkMoveState';
import {CellsBulkMovePreviewModal} from './cellsBulkMovePreviewModal/cellsBulkMovePreviewModal';
import {normalizeCellsPath} from './cellsBulkMovePreviewModal/normalizeCellsPath';
import {CellsBulkMoveToBinConfirmationModal} from './cellsBulkMoveToBinConfirmationModal';
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
  tableActionsCellStyles,
  tableCellRow,
  tableCellStyles,
  selectedTableCellRowStyles,
  selectionActionsStyles,
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
  getDriveDragNodes,
  hasSameSelection,
  INTERNAL_DRIVE_DRAG_TYPE,
  type CapturedDriveDrag,
} from './getDriveDragNodes';
import {getPermanentDeleteStatusKind} from './getPermanentDeleteStatusKind';
import {resolveRestoreTargets} from './restoreBinSelection/resolveRestoreTargets';
import {showBulkRestoreModal} from './restoreBinSelection/showBulkRestoreModal';
import {useBulkRestore} from './restoreBinSelection/useBulkRestore';
import {usePermanentDeleteReconciliation} from './usePermanentDeleteReconciliation';

import {driveBulkActionsFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../../../page/rootProvider';
import {CellsRepository} from '../../../../repositories/cells/cellsRepository';
import type {Conversation} from '../../../../repositories/entity/Conversation';
import {CellNode, CellNodeType} from '../../../../types/cellNode';
import {formatBytes} from '../../../../util/util';
import {PrimaryModal, removeCurrentModal, usePrimaryModalState} from '../../../Modals/PrimaryModal';
import {
  getCellsBackgroundActionEvidence,
  observeCellsBackgroundActionJobs,
} from '../common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import {createBulkJobPollingPolicy} from '../common/cellsBackgroundActionPolling/createBulkJobPollingPolicy';
import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from '../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {CellsSortDirection} from '../common/cellsSortIcon/cellsSortIcon';
import {getCellsApiPath} from '../common/getCellsApiPath/getCellsApiPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {isInRecycleBin} from '../common/recycleBin/recycleBin';
import {CellsSortField, SORTABLE_COLUMN_FIELD, toAriaSort} from '../common/useCellsSorting/useCellsSorting';
import {getSharedDriveDroppedFiles} from '../getSharedDriveDroppedFiles';
import {moveStatusMessageKey} from '../sharedDriveMoveStatusMessages';
import {
  useSharedDriveUploadStatus,
  type SharedDriveMoveStatusKind,
  type SharedDriveMoveSummary,
} from '../sharedDriveUploadStatusContext';
import {useBulkActionStatusReporter} from '../useBulkActionStatusReporter';

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
  const ariaSort =
    isSortingEnabled && typeof sortField === 'string' && sortField.length > 0
      ? toAriaSort(getDirectionFor(sortField))
      : undefined;

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

// Selecting rows only makes sense when at least one of these is available, e.g. never for viewers.
const BULK_ACTIONS = [CELLS_ACTION.MOVE, CELLS_ACTION.DELETE, CELLS_ACTION.RESTORE];

interface CapturedBulkMoveToBinSelection {
  nodeIds: string[];
  scopeKey: string;
  summary: SharedDriveMoveSummary;
}

type BulkMoveToBinReviewReason = 'request-failed' | 'partial' | 'job-failed' | 'status-unknown' | 'refresh-failed';

const bulkMoveToBinReviewReasonByStatus: Readonly<
  Partial<Record<SharedDriveMoveStatusKind, BulkMoveToBinReviewReason>>
> = {
  'request-failed': 'request-failed',
  partial: 'partial',
  failed: 'job-failed',
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
  const canPerformAnyBulkAction = BULK_ACTIONS.some(action => {
    return canPerformCurrentDriveAction(action);
  });
  const isSelectionEnabled =
    selectionEnabled && isFeatureToggleEnabled(driveBulkActionsFeatureToggleName) && canPerformAnyBulkAction;
  const activeDriveDrag = useRef<CapturedDriveDrag | null>(null);
  const isDropMoveSubmitting = useRef(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => {
    return new Set();
  });
  const [isBulkMoveToBinConfirmationOpen, setIsBulkMoveToBinConfirmationOpen] = useState(false);
  const [capturedBulkMoveToBin, setCapturedBulkMoveToBin] = useState<CapturedBulkMoveToBinSelection | null>(null);
  const [isBulkMoveToBinPending, setIsBulkMoveToBinPending] = useState(false);
  const [isBulkMoveToBinNeedsReview, setIsBulkMoveToBinNeedsReview] = useState(false);
  const [isRefreshingBulkMoveToBin, setIsRefreshingBulkMoveToBin] = useState(false);
  const [bulkMoveToBinReviewReason, setBulkMoveToBinReviewReason] = useState<BulkMoveToBinReviewReason | null>(null);
  const [backgroundMoveToBinJobUuids, setBackgroundMoveToBinJobUuids] = useState<string[]>([]);
  const isBulkMoveToBinPendingRef = useRef(false);
  const latestSelectionScopeKey = useRef(selectionScopeKey);
  latestSelectionScopeKey.current = selectionScopeKey;
  const previousSelectionScopeKey = useRef(selectionScopeKey);
  const bulkMoveToBinStatusId = useRef<Maybe<string>>(Maybe.nothing());
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
  const permanentDeleteStatusReporter = useBulkActionStatusReporter('permanentDelete', () => {
    void handleRefreshAfterPermanentDeleteReview();
  });
  const permanentDelete = usePermanentDeleteReconciliation({
    cellsRepository,
    clock,
    isCurrentScope: (scopeKey, path) => {
      return isInRecycleBin() && getCellsFilesPath() === path && selectionScopeKeyRef.current === scopeKey;
    },
    visibleNodeIds: nodes.map(node => {
      return node.id;
    }),
    isNodesLoading,
    onRefresh,
    onRefreshAndReportSuccess,
    onDeleteCompleted: nodeIds => {
      permanentDeleteStatusReporter.report('completed');
      setSelectedNodeIds(currentSelection => {
        return hasSameSelection(currentSelection, nodeIds) ? new Set() : currentSelection;
      });
    },
    onReconciliationCompleted: () => {
      permanentDeleteStatusReporter.report('completed');
      setSelectedNodeIds(new Set());
    },
    reportError: error => {
      console.error(error);
    },
  });
  const {
    isPending: isPermanentDeletePending,
    isRejected: isPermanentDeleteRejected,
    isUnresolved: isPermanentDeleteUnresolved,
    isReconciling: isPermanentDeleteReconciling,
    isRefreshingReview: isPermanentDeleteRefreshingReview,
    reviewReason: permanentDeleteReviewReason,
    deletePermanently,
    refreshReview: handleRefreshAfterPermanentDeleteReview,
    cancel: cancelPermanentDeleteReconciliation,
    clearRejection: clearPermanentDeleteRejection,
    reset: resetPermanentDeleteReconciliation,
  } = permanentDelete;
  const bulkRestoreModalId = useId();
  const restoreStatusReporter = useBulkActionStatusReporter('restore', () => {
    void bulkRestore.refreshReview();
  });
  const bulkRestore = useBulkRestore({
    cellsRepository,
    clock,
    random,
    conversationQualifiedId,
    isCurrentScope: scopeKey => {
      return isInRecycleBin() && selectionScopeKeyRef.current === scopeKey;
    },
    onRefreshAndReportSuccess,
    onRestoreSettled: () => {
      setSelectedNodeIds(new Set());
    },
    onStatusChange: restoreStatusReporter.report,
    onStatusCleared: restoreStatusReporter.clear,
    reportError: error => {
      console.error(error);
    },
  });
  const {reset: resetBulkRestore} = bulkRestore;
  const setPermanentDeleteReviewing = permanentDeleteStatusReporter.setReviewing;
  useEffect(() => {
    setPermanentDeleteReviewing(isPermanentDeleteRefreshingReview);
  }, [isPermanentDeleteRefreshingReview, setPermanentDeleteReviewing]);
  const setRestoreReviewing = restoreStatusReporter.setReviewing;
  const {isRefreshingReview: isRestoreRefreshingReview} = bulkRestore;
  useEffect(() => {
    setRestoreReviewing(isRestoreRefreshingReview);
  }, [isRestoreRefreshingReview, setRestoreReviewing]);
  const reportPermanentDeleteStatus = permanentDeleteStatusReporter.report;
  const isPermanentDeleteStatusProcessing = permanentDeleteStatusReporter.isProcessing;
  useEffect(() => {
    const permanentDeleteStatusKind = getPermanentDeleteStatusKind({
      isPending: isPermanentDeletePending,
      isRejected: isPermanentDeleteRejected,
      isUnresolved: isPermanentDeleteUnresolved,
      isReconciling: isPermanentDeleteReconciling,
      reviewReason: permanentDeleteReviewReason,
    });
    if (maybe.isJust(permanentDeleteStatusKind)) {
      reportPermanentDeleteStatus(permanentDeleteStatusKind.value);
      return;
    }
    // The reconciliation state was reset (e.g. the user navigated away) before an outcome was known.
    if (isPermanentDeleteStatusProcessing()) {
      reportPermanentDeleteStatus('status-unknown');
    }
  }, [
    isPermanentDeletePending,
    isPermanentDeleteReconciling,
    isPermanentDeleteRejected,
    isPermanentDeleteStatusProcessing,
    isPermanentDeleteUnresolved,
    permanentDeleteReviewReason,
    reportPermanentDeleteStatus,
  ]);
  const [backgroundMoveJobUuids, setBackgroundMoveJobUuids] = useState<string[]>([]);
  const [backgroundMoveStatusId, setBackgroundMoveStatusId] = useState('');
  const [backgroundMoveStatusCheckId, setBackgroundMoveStatusCheckId] = useState(0);

  useEffect(() => {
    const didSelectionScopeChange = previousSelectionScopeKey.current !== selectionScopeKey;
    previousSelectionScopeKey.current = selectionScopeKey;
    activeDriveDrag.current = null;

    if (isMovePendingRef.current) {
      return cancelPermanentDeleteReconciliation;
    }

    if (isBulkMoveToBinPendingRef.current) {
      if (didSelectionScopeChange) {
        setSelectedNodeIds(new Set());
        setIsBulkMoveToBinConfirmationOpen(false);
      }
      return cancelPermanentDeleteReconciliation;
    }

    resetPermanentDeleteReconciliation();
    resetBulkRestore();
    setSelectedNodeIds(new Set());
    setIsBulkMovePreviewOpen(false);
    setIsBulkMoveToBinConfirmationOpen(false);
    setCapturedBulkMoveToBin(null);
    setIsBulkMoveToBinNeedsReview(false);
    setIsRefreshingBulkMoveToBin(false);
    setBulkMoveToBinReviewReason(null);
    setBackgroundMoveToBinJobUuids([]);
    if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
      removeCurrentModal();
    }
    if (usePrimaryModalState.getState().currentModalId === bulkRestoreModalId) {
      removeCurrentModal();
    }
    return cancelPermanentDeleteReconciliation;
  }, [
    bulkRestoreModalId,
    cancelPermanentDeleteReconciliation,
    permanentDeleteModalId,
    resetBulkRestore,
    resetPermanentDeleteReconciliation,
    selectionScopeKey,
    isSelectionEnabled,
  ]);

  useEffect(() => {
    return () => {
      if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
        removeCurrentModal();
      }
      if (usePrimaryModalState.getState().currentModalId === bulkRestoreModalId) {
        removeCurrentModal();
      }
    };
  }, [bulkRestoreModalId, permanentDeleteModalId]);

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
      pollingPolicy: createBulkJobPollingPolicy(random),
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
    activeDriveDrag.current = null;
    clearPermanentDeleteRejection();
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
    return isInRecycleBin() && getCellsFilesPath() === path && selectionScopeKeyRef.current === scopeKey;
  };

  const handleRestoreSelection = (nodeIds: string[], scopeKey: string): void => {
    if (!hasSameSelection(selectedNodeIdsRef.current, nodeIds)) {
      return;
    }

    const selectedIdSet = new Set(nodeIds);
    const currentSelectedNodes = nodesRef.current.filter(node => {
      return selectedIdSet.has(node.id);
    });
    const currentResolution = resolveRestoreTargets({selectedNodes: currentSelectedNodes});
    if (
      currentSelectedNodes.length !== nodeIds.length ||
      !canPerformCurrentDriveActionRef.current(CELLS_ACTION.RESTORE) ||
      !currentResolution.canRestore
    ) {
      return;
    }

    restoreStatusReporter.start(
      currentSelectedNodes.map(node => {
        return {id: node.id, name: node.name, isFolder: node.type === CellNodeType.FOLDER};
      }),
    );
    void bulkRestore.restore(currentResolution.targets, scopeKey);
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

    permanentDeleteStatusReporter.start(
      currentSelectedNodes.map(node => {
        return {id: node.id, name: node.name, isFolder: node.type === CellNodeType.FOLDER};
      }),
    );
    await deletePermanently(nodeIds, scopeKey, path);
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
  const isRowSelectionEnabled =
    isSelectionEnabled &&
    !isBulkMoveOutcomeUnresolved &&
    !isPermanentDeleteUnresolved &&
    !isBulkMoveToBinNeedsReview &&
    !isBulkMoveToBinPending &&
    !bulkRestore.isPending &&
    bulkRestore.reviewReason === null;

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
      selectionEnabled: isRowSelectionEnabled,
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;
  const selectedNodes = nodes.filter(node => {
    return selectedNodeIds.has(node.id);
  });
  const selectedFilesTotalSize =
    selectedNodes.length === selectedNodeIds.size ? getSelectedFilesTotalSize(selectedNodes) : Maybe.nothing();
  const restoreResolution = resolveRestoreTargets({selectedNodes});
  const isBulkRestoreBlocking = bulkRestore.isPending || bulkRestore.reviewReason !== null;
  const canRestoreSelection =
    isSelectionEnabled &&
    selectedNodes.length > 0 &&
    selectedNodes.length === selectedNodeIds.size &&
    isInRecycleBin() &&
    !isBulkRestoreBlocking &&
    !isPermanentDeletePending &&
    !isPermanentDeleteUnresolved &&
    canPerformCurrentDriveAction(CELLS_ACTION.RESTORE) &&
    restoreResolution.canRestore;
  const canPermanentlyDeleteSelection =
    selectedNodes.length > 0 &&
    selectedNodes.length === selectedNodeIds.size &&
    isInRecycleBin() &&
    !isBulkRestoreBlocking &&
    !isPermanentDeleteUnresolved &&
    canPerformCurrentDriveAction(CELLS_ACTION.DELETE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
    });
  const canMoveSelection =
    isSelectionEnabled &&
    selectedNodes.length > 0 &&
    selectedNodes.length === selectedNodeIds.size &&
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

  const resetBulkMoveToBinAfterScopeChange = useCallback((): void => {
    isBulkMoveToBinPendingRef.current = false;
    setIsBulkMoveToBinPending(false);
    setIsBulkMoveToBinNeedsReview(false);
    setIsRefreshingBulkMoveToBin(false);
    setIsBulkMoveToBinConfirmationOpen(false);
    setCapturedBulkMoveToBin(null);
    setSelectedNodeIds(new Set());
    setBackgroundMoveToBinJobUuids([]);
    setBulkMoveToBinReviewReason(null);
  }, []);

  const finishBulkMoveToBinOutcome = useCallback(
    async (captured: CapturedBulkMoveToBinSelection, statusId: string, statusKind: SharedDriveMoveStatusKind) => {
      setIsBulkMoveToBinConfirmationOpen(false);
      setIsRefreshingBulkMoveToBin(true);
      setBackgroundMoveToBinJobUuids([]);

      if (captured.scopeKey !== latestSelectionScopeKey.current || isInRecycleBin()) {
        updateMoveStatus({id: statusId, kind: 'status-unknown', ...captured.summary});
        resetBulkMoveToBinAfterScopeChange();
        return;
      }

      let didRefresh = false;
      try {
        didRefresh = await onRefreshAfterBulkMoveToBinOutcome();
      } catch {
        didRefresh = false;
      }

      if (captured.scopeKey !== latestSelectionScopeKey.current || isInRecycleBin()) {
        updateMoveStatus({id: statusId, kind: 'status-unknown', ...captured.summary});
        resetBulkMoveToBinAfterScopeChange();
        return;
      }

      if (didRefresh) {
        updateMoveStatus({id: statusId, kind: statusKind, ...captured.summary});
        setSelectedNodeIds(new Set());
        setCapturedBulkMoveToBin(null);
        setIsBulkMoveToBinNeedsReview(false);
        setBulkMoveToBinReviewReason(null);
      } else {
        updateMoveStatus({
          id: statusId,
          kind: statusKind === 'completed' ? 'finished-unknown' : statusKind,
          ...captured.summary,
        });
        setIsBulkMoveToBinNeedsReview(true);
        setBulkMoveToBinReviewReason(bulkMoveToBinReviewReasonByStatus[statusKind] ?? 'refresh-failed');
      }

      isBulkMoveToBinPendingRef.current = false;
      setIsBulkMoveToBinPending(false);
      setIsRefreshingBulkMoveToBin(false);
    },
    [onRefreshAfterBulkMoveToBinOutcome, resetBulkMoveToBinAfterScopeChange, updateMoveStatus],
  );

  const handleConfirmBulkMoveToBin = useCallback(async (): Promise<void> => {
    const captured = capturedBulkMoveToBin;
    if (captured === null || isBulkMoveToBinPendingRef.current) {
      return;
    }

    if (!isCapturedBulkMoveToBinSelectionCurrent(captured)) {
      setIsBulkMoveToBinConfirmationOpen(false);
      setCapturedBulkMoveToBin(null);
      return;
    }

    isBulkMoveToBinPendingRef.current = true;
    setIsBulkMoveToBinPending(true);
    setIsBulkMoveToBinConfirmationOpen(false);
    const statusId = createMoveStatusId();
    bulkMoveToBinStatusId.current = Maybe.just(statusId);
    updateMoveStatus({id: statusId, kind: 'processing', ...captured.summary});

    try {
      const response = await cellsRepository.deleteNodes({uuids: captured.nodeIds, permanently: false});
      if (captured.scopeKey !== latestSelectionScopeKey.current || isInRecycleBin()) {
        updateMoveStatus({id: statusId, kind: 'status-unknown', ...captured.summary});
        resetBulkMoveToBinAfterScopeChange();
        return;
      }

      if (response.Status === RestActionStatus.Performed) {
        await finishBulkMoveToBinOutcome(captured, statusId, 'completed');
        return;
      }

      if (response.Status === RestActionStatus.Background) {
        const {jobUuids} = getCellsBackgroundActionEvidence(response, 'delete');
        if (jobUuids.length > 0) {
          setBackgroundMoveToBinJobUuids([...jobUuids]);
          setIsBulkMoveToBinConfirmationOpen(false);
          return;
        }
      }

      await finishBulkMoveToBinOutcome(captured, statusId, 'status-unknown');
    } catch {
      updateMoveStatus({id: statusId, kind: 'request-failed', ...captured.summary});
      await finishBulkMoveToBinOutcome(captured, statusId, 'request-failed');
    }
  }, [
    capturedBulkMoveToBin,
    isCapturedBulkMoveToBinSelectionCurrent,
    createMoveStatusId,
    updateMoveStatus,
    cellsRepository,
    resetBulkMoveToBinAfterScopeChange,
    finishBulkMoveToBinOutcome,
  ]);

  const handleRefreshBulkMoveToBinOutcome = useCallback(async (): Promise<void> => {
    if (capturedBulkMoveToBin === null || isRefreshingBulkMoveToBin || isBulkMoveToBinPendingRef.current) {
      return;
    }

    setIsRefreshingBulkMoveToBin(true);
    let didRefresh = false;
    try {
      didRefresh = await onRefreshAfterBulkMoveToBinOutcome();
    } catch {
      didRefresh = false;
    }

    if (capturedBulkMoveToBin.scopeKey !== latestSelectionScopeKey.current || isInRecycleBin()) {
      resetBulkMoveToBinAfterScopeChange();
      return;
    }

    if (didRefresh) {
      setSelectedNodeIds(new Set());
      setCapturedBulkMoveToBin(null);
      setIsBulkMoveToBinNeedsReview(false);
      setBulkMoveToBinReviewReason(null);
    } else {
      setBulkMoveToBinReviewReason(reason => {
        if (reason === 'request-failed' || reason === 'partial' || reason === 'job-failed') {
          return reason;
        }
        return 'refresh-failed';
      });
    }
    setIsRefreshingBulkMoveToBin(false);
  }, [
    capturedBulkMoveToBin,
    isRefreshingBulkMoveToBin,
    onRefreshAfterBulkMoveToBinOutcome,
    resetBulkMoveToBinAfterScopeChange,
  ]);

  useEffect(() => {
    if (backgroundMoveToBinJobUuids.length === 0 || capturedBulkMoveToBin === null) {
      return undefined;
    }

    if (!maybe.isJust(bulkMoveToBinStatusId.current)) {
      setBulkMoveToBinReviewReason('status-unknown');
      setIsBulkMoveToBinNeedsReview(true);
      isBulkMoveToBinPendingRef.current = false;
      setIsBulkMoveToBinPending(false);
      return undefined;
    }

    const statusId = bulkMoveToBinStatusId.current.value;
    const captured = capturedBulkMoveToBin;

    return observeCellsBackgroundActionJobs({
      cellsRepository,
      actionName: 'delete',
      jobUuids: backgroundMoveToBinJobUuids,
      clock,
      pollingPolicy: createBulkJobPollingPolicy(random),
      isCurrent: () => {
        return true;
      },
      onOutcome: outcome => {
        switch (outcome) {
          case 'all-finished':
            void finishBulkMoveToBinOutcome(captured, statusId, 'completed');
            return;
          case 'mixed-terminal':
            void finishBulkMoveToBinOutcome(captured, statusId, 'partial');
            return;
          case 'all-failed':
            void finishBulkMoveToBinOutcome(captured, statusId, 'failed');
            return;
          case 'check-limit':
          case 'status-unknown':
            void finishBulkMoveToBinOutcome(captured, statusId, 'status-unknown');
        }
      },
    });
  }, [backgroundMoveToBinJobUuids, capturedBulkMoveToBin, cellsRepository, clock, finishBulkMoveToBinOutcome, random]);

  useEffect(() => {
    return () => {
      return onFolderDropTargetChange?.(null);
    };
  }, [onFolderDropTargetChange]);

  useEffect(() => {
    setActiveFolderDropTargetId(null);
    setActiveFolderDropTargetName(null);
  }, [folderDropResetKey]);

  const setActiveFolderDropTarget = (node: CellNode | null, isFileUpload = true): void => {
    setActiveFolderDropTargetId(node?.id ?? null);
    setActiveFolderDropTargetName(isFileUpload ? (node?.name ?? null) : null);
    if (isFileUpload) {
      onFolderDropTargetChange?.(node?.name ?? null);
    }
  };

  const getDriveDragNodesForEvent = (destination: CellNode, event: DragEvent<HTMLElement>): CellNode[] | null => {
    return getDriveDragNodes({
      activeDrag: activeDriveDrag.current,
      dataTransferTypes: Array.from(event.dataTransfer.types),
      selectedNodeIds: selectedNodeIdsRef.current,
      selectionScopeKey: selectionScopeKeyRef.current,
      canMoveSelection,
      destination,
      nodes: nodesRef.current,
      conversationQualifiedId,
    });
  };

  const handleDriveDrop = async (destination: CellNode, event: DragEvent<HTMLTableRowElement>): Promise<void> => {
    const selected = getDriveDragNodesForEvent(destination, event);
    activeDriveDrag.current = null;
    setActiveFolderDropTarget(null, false);
    if (selected === null || isDropMoveSubmitting.current) {
      return;
    }

    isDropMoveSubmitting.current = true;
    const summary: SharedDriveMoveSummary = {
      action: 'move',
      items: selected.map(node => {
        return {id: node.id, name: node.name, isFolder: node.type === CellNodeType.FOLDER};
      }),
      destinationPath: normalizeCellsPath(destination.path, conversationQualifiedId),
    };
    handleBulkMoveStart(summary);
    try {
      const response = await cellsRepository.moveNodes({
        currentPaths: selected.map(node => {
          return node.path;
        }),
        targetPath: getCellsApiPath({conversationQualifiedId, currentPath: summary.destinationPath}),
      });
      handleBulkMoveResult(response, summary);
    } catch {
      handleBulkMoveRequestError();
    } finally {
      isDropMoveSubmitting.current = false;
    }
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
    if (node.type !== CellNodeType.FOLDER || (onDropFilesToFolder === undefined && !canMoveSelection)) {
      return {};
    }

    return {
      onDragEnter: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          if (getDriveDragNodesForEvent(node, event) !== null) {
            preventDefaultFileDrop(event);
            setActiveFolderDropTarget(node, false);
          }
          return;
        }
        if (onDropFilesToFolder === undefined) {
          return;
        }

        preventDefaultFileDrop(event);
        setActiveFolderDropTarget(node);
      },
      onDragOver: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          const isValidTarget = getDriveDragNodesForEvent(node, event) !== null;
          event.dataTransfer.dropEffect = isValidTarget ? 'move' : 'none';
          if (isValidTarget) {
            preventDefaultFileDrop(event);
            setActiveFolderDropTarget(node, false);
          } else if (activeFolderDropTargetId === node.id) {
            setActiveFolderDropTarget(null, false);
          }
          return;
        }
        if (onDropFilesToFolder === undefined) {
          return;
        }

        preventDefaultFileDrop(event);
        event.dataTransfer.dropEffect = 'copy';
        setActiveFolderDropTarget(node);
      },
      onDragLeave: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event) && activeDriveDrag.current === null) {
          return;
        }

        preventDefaultFileDrop(event);
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }

        setActiveFolderDropTarget(null, dragEventContainsFiles(event));
      },
      onDrop: (event: DragEvent<HTMLTableRowElement>): void => {
        if (!dragEventContainsFiles(event)) {
          if (activeDriveDrag.current !== null) {
            preventDefaultFileDrop(event);
            void handleDriveDrop(node, event);
          }
          return;
        }
        if (onDropFilesToFolder === undefined) {
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
                    disabled={isBulkMoveToBinPending || bulkRestore.isPending}
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
                  <div css={selectionActionsStyles}>
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
                    {canRestoreSelection && (
                      <button
                        css={bulkActionButtonStyles}
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => {
                          const nodeIds = selectedNodes.map(node => {
                            return node.id;
                          });
                          showBulkRestoreModal({
                            selectedNodes,
                            targets: restoreResolution.targets,
                            onRestore: () => {
                              handleRestoreSelection(nodeIds, selectionScopeKey);
                            },
                            modalId: bulkRestoreModalId,
                            translate,
                          });
                        }}
                      >
                        {translate('cells.options.restore')}
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
                          const summary: SharedDriveMoveSummary = {
                            action: 'move',
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
                          });
                          setIsBulkMoveToBinConfirmationOpen(true);
                        }}
                      >
                        <TrashIcon width={14} height={14} aria-hidden="true" />
                        {translate('cells.selection.moveToBin')}
                      </button>
                    )}
                  </div>
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
        {isBulkMoveToBinPending && !isBulkMoveToBinConfirmationOpen && capturedBulkMoveToBin !== null && (
          <div css={moveOutcomeMessageStyles} role="status" aria-live="polite">
            {translate('cells.bulkMoveToBin.moving', {count: capturedBulkMoveToBin.nodeIds.length})}
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
                    onClickCapture={event => {
                      if (!isRowSelectionEnabled || (!event.metaKey && !event.ctrlKey)) {
                        return;
                      }

                      const target = event.target;
                      if (!(target instanceof Element)) {
                        return;
                      }
                      const control = target.closest('button, a, input, label, select, textarea');
                      if (control !== null && control.closest('td')?.getAttribute('data-cell') !== labels.name) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleSelection(node.id, !selectedNodeIds.has(node.id));
                    }}
                    draggable={canMoveSelection && selectedNodeIds.has(node.id)}
                    onDragStart={event => {
                      if (!canMoveSelection || !selectedNodeIds.has(node.id)) {
                        event.preventDefault();
                        return;
                      }
                      activeDriveDrag.current = {
                        nodeIds: selectedNodes.map(({id}) => {
                          return id;
                        }),
                        scopeKey: selectionScopeKey,
                      };
                      event.dataTransfer.setData(INTERNAL_DRIVE_DRAG_TYPE, 'move');
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      activeDriveDrag.current = null;
                      setActiveFolderDropTarget(null, false);
                    }}
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
