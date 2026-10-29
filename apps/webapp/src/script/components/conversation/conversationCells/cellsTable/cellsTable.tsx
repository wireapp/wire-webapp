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
  type MouseEvent,
  type ReactElement,
} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';
import {flexRender, getCoreRowModel, type Header, useReactTable} from '@tanstack/react-table';
import {BackendError, StatusCode} from '@wireapp/api-client/lib/http/';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, RestActionStatus, type RestPerformActionResponse} from 'cells-sdk-ts';
import {createPortal} from 'react-dom';
import {Maybe, maybe, task} from 'true-myth';

import {
  ArrowIcon,
  Button,
  ButtonVariant,
  CloseIcon,
  SharedDriveUploadSpinnerIcon,
  UploadIcon,
} from '@wireapp/react-ui-kit';

import {CellsBulkMovePreviewModal} from 'Components/conversation/conversationCells/cellsTable/cellsBulkMovePreviewModal/cellsBulkMovePreviewModal';
import {
  CELLS_ACTION,
  canPerformCellsAction,
  useCellsActionPermissions,
} from 'Components/conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {getCellsFilesPath} from 'Components/conversation/conversationCells/common/getCellsFilesPath/getCellsFilesPath';
import {isInRecycleBin} from 'Components/conversation/conversationCells/common/recycleBin/recycleBin';
import {
  useSharedDriveUploadStatus,
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
  bulkMoveButtonStyles,
  clearSelectionButtonStyles,
  folderDropOverlayDescriptionStyles,
  folderDropOverlayFolderNameStyles,
  folderDropOverlayStyles,
  folderDropOverlayTitleStyles,
  folderDropTargetRowStyles,
  headerCellStyles,
  moveOutcomeMessageStyles,
  permanentDeleteProgressStyles,
  permanentDeleteReloadLinkStyles,
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
const PERMANENT_DELETE_RECONCILIATION_INTERVAL_MS = 1000;
const PERMANENT_DELETE_RECONCILIATION_TIMEOUT_MS = 20_000;
const MAX_PERMANENT_DELETE_RECONCILIATION_ATTEMPTS = 10;
const PERMANENT_DELETE_RECONCILIATION_STORAGE_KEY = 'wire.cells.pendingPermanentDelete';

type PermanentDeleteReviewReason =
  'job-failed' | 'refresh-failed' | 'storage-failed' | 'still-visible' | 'timed-out' | 'request-timeout';
type PermanentDeleteCheckingMessageKey =
  'cells.bulkDelete.checking' | 'cells.bulkDelete.checkingAfterJobFailure' | 'cells.bulkDelete.retryingRefresh';
type PermanentDeleteReviewMessageKey =
  | 'cells.bulkDelete.jobFailed'
  | 'cells.bulkDelete.refreshFailed'
  | 'cells.bulkDelete.requestTimedOut'
  | 'cells.bulkDelete.storageFailed'
  | 'cells.bulkDelete.stillVisible'
  | 'cells.bulkDelete.timedOut';

interface PermanentDeleteReconciliationContext {
  nodeIds: string[];
  scopeKey: string;
  path: string;
  jobUuids: string[];
  hasKnownJobFailure: boolean;
}

const hasSameSelection = (selectedNodeIds: ReadonlySet<string>, nodeIds: readonly string[]): boolean => {
  return (
    selectedNodeIds.size === nodeIds.length &&
    nodeIds.every(nodeId => {
      return selectedNodeIds.has(nodeId);
    })
  );
};

const clearStoredPermanentDeleteReconciliation = (): boolean => {
  try {
    window.sessionStorage.removeItem(PERMANENT_DELETE_RECONCILIATION_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

const storePermanentDeleteReconciliation = (context: PermanentDeleteReconciliationContext): boolean => {
  try {
    window.sessionStorage.setItem(PERMANENT_DELETE_RECONCILIATION_STORAGE_KEY, JSON.stringify(context));
    return true;
  } catch {
    return false;
  }
};

const getStoredPermanentDeleteReconciliation = (
  scopeKey: string,
  path: string,
): PermanentDeleteReconciliationContext | null => {
  let serializedContext: string | null;
  try {
    serializedContext = window.sessionStorage.getItem(PERMANENT_DELETE_RECONCILIATION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (serializedContext === null) {
    return null;
  }

  try {
    const context = JSON.parse(serializedContext) as Partial<PermanentDeleteReconciliationContext>;
    if (
      context.scopeKey !== scopeKey ||
      context.path !== path ||
      !Array.isArray(context.nodeIds) ||
      context.nodeIds.length === 0 ||
      !context.nodeIds.every(isNonEmptyString) ||
      !Array.isArray(context.jobUuids) ||
      !context.jobUuids.every(isNonEmptyString) ||
      typeof context.hasKnownJobFailure !== 'boolean'
    ) {
      return null;
    }

    return {
      nodeIds: context.nodeIds,
      scopeKey: context.scopeKey,
      path: context.path,
      jobUuids: context.jobUuids,
      hasKnownJobFailure: context.hasKnownJobFailure,
    };
  } catch {
    return null;
  }
};

const getPermanentDeleteJobUuids = (response: RestPerformActionResponse): string[] => {
  const jobUuids = response.BackgroundActions?.flatMap(action => {
    return action.Name === 'delete' && isNonEmptyString(action.JobUuid) ? [action.JobUuid] : [];
  });

  return [...new Set(jobUuids ?? [])];
};

const isAuthoritativePermanentDeleteRejection = (error: unknown): boolean => {
  return (
    error instanceof BackendError &&
    error.code !== undefined &&
    error.code >= StatusCode.BAD_REQUEST &&
    error.code < StatusCode.INTERNAL_SERVER_ERROR &&
    error.code !== StatusCode.REQUEST_TIMEOUT
  );
};

const hasPermanentDeleteJobFailure = (response: RestPerformActionResponse): boolean => {
  return (
    response.BackgroundActions?.some(action => {
      return (
        action.Name === 'delete' &&
        (action.Status === JobsTaskStatus.Error || action.Status === JobsTaskStatus.Interrupted)
      );
    }) ?? false
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
    case 'request-timeout':
      return 'cells.bulkDelete.requestTimedOut';
    case 'storage-failed':
      return 'cells.bulkDelete.storageFailed';
    case 'still-visible':
      return 'cells.bulkDelete.stillVisible';
    case 'timed-out':
    default:
      return 'cells.bulkDelete.timedOut';
  }
};

const hasPermanentDeleteCompleted = (response: RestPerformActionResponse): boolean => {
  if (response.Status !== RestActionStatus.Performed) {
    return false;
  }

  const {BackgroundActions: backgroundActions} = response;
  if (backgroundActions === undefined || backgroundActions.length === 0) {
    return true;
  }

  return backgroundActions.every(action => {
    return action.Name === 'delete' && isNonEmptyString(action.JobUuid) && action.Status === JobsTaskStatus.Finished;
  });
};

export const CellsTable = ({
  nodes,
  isNodesLoading,
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
  const currentPermanentDeletePath = getCellsFilesPath();
  const {updateMoveStatus, createMoveStatusId, clearMoveStatus} = useSharedDriveUploadStatus();
  const backgroundMoveSummary = useRef<Maybe<SharedDriveMoveSummary>>(Maybe.nothing());
  const activeMoveStatusId = useRef<Maybe<string>>(Maybe.nothing());
  const canPerformCurrentDriveAction = useCellsActionPermissions();
  const isSelectionEnabled = selectionEnabled && isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(() => {
    return new Set();
  });
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
  const [isPermanentDeletePending, setIsPermanentDeletePending] = useState(false);
  const [isPermanentDeleteRejected, setIsPermanentDeleteRejected] = useState(false);
  const [isPermanentDeleteUnresolved, setIsPermanentDeleteUnresolved] = useState(false);
  const [isRefreshingPermanentDeleteReview, setIsRefreshingPermanentDeleteReview] = useState(false);
  const [isPermanentDeleteReconciling, setIsPermanentDeleteReconciling] = useState(false);
  const [isPermanentDeleteReconciliationRequestInFlight, setIsPermanentDeleteReconciliationRequestInFlight] =
    useState(false);
  const [isWaitingForPermanentDeleteReconciliation, setIsWaitingForPermanentDeleteReconciliation] = useState(false);
  const [permanentDeleteReviewReason, setPermanentDeleteReviewReason] = useState<PermanentDeleteReviewReason | null>(
    null,
  );
  const isPermanentDeletePendingRef = useRef(false);
  const isPermanentDeleteUnresolvedRef = useRef(false);
  const pendingPermanentDeleteNodeIdsRef = useRef<string[]>([]);
  const pendingPermanentDeleteContextRef = useRef<PermanentDeleteReconciliationContext | null>(null);
  const startPermanentDeleteReconciliationRef = useRef<
    ((context: PermanentDeleteReconciliationContext) => void) | null
  >(null);
  const hasRehydratedPermanentDeleteContextRef = useRef(false);
  const permanentDeleteReconciliationGenerationRef = useRef(0);
  const permanentDeleteReconciliationTimeoutRef = useRef<ReturnType<typeof clock.setTimeout> | undefined>(undefined);
  const permanentDeleteReconciliationDeadlineRef = useRef<ReturnType<typeof clock.setTimeout> | undefined>(undefined);
  const permanentDeleteReconciliationRequestInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  selectedNodeIdsRef.current = selectedNodeIds;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const selectionScopeKeyRef = useRef(selectionScopeKey);
  selectionScopeKeyRef.current = selectionScopeKey;
  const canPerformCurrentDriveActionRef = useRef(canPerformCurrentDriveAction);
  canPerformCurrentDriveActionRef.current = canPerformCurrentDriveAction;
  const permanentDeleteModalId = useId();
  const clearPermanentDeleteReconciliationDeadline = useCallback((): void => {
    if (permanentDeleteReconciliationDeadlineRef.current === undefined) {
      return;
    }

    clock.clearTimeout(permanentDeleteReconciliationDeadlineRef.current);
    permanentDeleteReconciliationDeadlineRef.current = undefined;
  }, [clock]);
  const cancelPermanentDeleteReconciliation = useCallback((): void => {
    permanentDeleteReconciliationGenerationRef.current += 1;
    if (permanentDeleteReconciliationTimeoutRef.current !== undefined) {
      clock.clearTimeout(permanentDeleteReconciliationTimeoutRef.current);
      permanentDeleteReconciliationTimeoutRef.current = undefined;
    }
    clearPermanentDeleteReconciliationDeadline();
  }, [clearPermanentDeleteReconciliationDeadline, clock]);
  const [backgroundMoveJobUuids, setBackgroundMoveJobUuids] = useState<string[]>([]);
  const [backgroundMoveStatusId, setBackgroundMoveStatusId] = useState('');
  const [backgroundMoveStatusCheckId, setBackgroundMoveStatusCheckId] = useState(0);

  useEffect(() => {
    cancelPermanentDeleteReconciliation();
    if (isMovePendingRef.current) {
      return cancelPermanentDeleteReconciliation;
    }

    setSelectedNodeIds(new Set());
    setIsBulkMovePreviewOpen(false);
    setIsPermanentDeleteRejected(false);
    isPermanentDeleteUnresolvedRef.current = false;
    pendingPermanentDeleteNodeIdsRef.current = [];
    pendingPermanentDeleteContextRef.current = null;
    setIsPermanentDeleteUnresolved(false);
    setIsPermanentDeleteReconciling(false);
    setIsWaitingForPermanentDeleteReconciliation(false);
    setPermanentDeleteReviewReason(null);

    if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
      removeCurrentModal();
    }
    return cancelPermanentDeleteReconciliation;
  }, [cancelPermanentDeleteReconciliation, permanentDeleteModalId, selectionScopeKey, isSelectionEnabled]);

  useEffect(() => {
    if (!isWaitingForPermanentDeleteReconciliation || isNodesLoading) {
      return;
    }

    const visibleNodeIds = new Set(
      nodes.map(node => {
        return node.id;
      }),
    );
    if (
      pendingPermanentDeleteNodeIdsRef.current.some(nodeId => {
        return visibleNodeIds.has(nodeId);
      })
    ) {
      return;
    }

    cancelPermanentDeleteReconciliation();
    pendingPermanentDeleteNodeIdsRef.current = [];
    pendingPermanentDeleteContextRef.current = null;
    clearStoredPermanentDeleteReconciliation();
    setIsPermanentDeleteRejected(false);
    isPermanentDeleteUnresolvedRef.current = false;
    setIsPermanentDeleteUnresolved(false);
    setIsPermanentDeleteReconciling(false);
    setIsWaitingForPermanentDeleteReconciliation(false);
    setPermanentDeleteReviewReason(null);
    setSelectedNodeIds(new Set());
  }, [cancelPermanentDeleteReconciliation, isNodesLoading, isWaitingForPermanentDeleteReconciliation, nodes]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPermanentDeleteReconciliation();
      if (usePrimaryModalState.getState().currentModalId === permanentDeleteModalId) {
        removeCurrentModal();
      }
    };
  }, [cancelPermanentDeleteReconciliation, permanentDeleteModalId]);

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
    const wasRefreshSuccessful = await onRefreshAfterBulkMoveOutcome();
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
        dispatchMove({type: 'needs-review', reason: 'status-unknown'});
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
        dispatchMove({type: 'needs-review', reason: 'partial'});
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
      dispatchMove({type: 'needs-review', reason: 'failed'});
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
    const hasFinishedMoveJobs =
      response.BackgroundActions !== undefined &&
      response.BackgroundActions.length > 0 &&
      response.BackgroundActions.every(action => {
        return action.Name === 'move' && isNonEmptyString(action.JobUuid) && action.Status === JobsTaskStatus.Finished;
      });
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
    setIsPermanentDeleteRejected(false);
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
      isMountedRef.current &&
      isInRecycleBin() &&
      getCellsFilesPath() === path &&
      selectionScopeKeyRef.current === scopeKey
    );
  };

  const isCurrentPermanentDeleteReconciliation = (
    context: PermanentDeleteReconciliationContext,
    generation: number,
  ): boolean => {
    return (
      permanentDeleteReconciliationGenerationRef.current === generation &&
      isCurrentPermanentDeleteScope(context.scopeKey, context.path)
    );
  };

  const runPermanentDeleteReconciliation = async (
    context: PermanentDeleteReconciliationContext,
    generation: number,
    attempt: number,
  ): Promise<void> => {
    if (!isCurrentPermanentDeleteReconciliation(context, generation)) {
      return;
    }

    permanentDeleteReconciliationRequestInFlightRef.current = true;
    setIsPermanentDeleteReconciliationRequestInFlight(true);
    try {
      const jobResults = await Promise.all(
        context.jobUuids.map(jobUuid => {
          return task.tryOrElse(
            error => {
              return error;
            },
            () => {
              return cellsRepository.getBackgroundActionInfo({name: 'delete', jobUuid});
            },
          );
        }),
      );
      if (!isCurrentPermanentDeleteReconciliation(context, generation)) {
        return;
      }

      const jobStatuses = jobResults.map(result => {
        return result.isOk ? result.value.Status : undefined;
      });
      const hasJobFailure =
        context.hasKnownJobFailure ||
        jobStatuses.some(status => {
          return status === JobsTaskStatus.Error || status === JobsTaskStatus.Interrupted;
        });
      const hasPendingJob = jobStatuses.some(status => {
        return (
          status !== JobsTaskStatus.Finished && status !== JobsTaskStatus.Error && status !== JobsTaskStatus.Interrupted
        );
      });

      setIsWaitingForPermanentDeleteReconciliation(false);
      let wasRefreshSuccessful = false;
      try {
        wasRefreshSuccessful = await onRefreshAfterBulkMoveOutcome();
      } catch {
        wasRefreshSuccessful = false;
      }
      if (!isCurrentPermanentDeleteReconciliation(context, generation)) {
        return;
      }

      if (wasRefreshSuccessful) {
        setIsWaitingForPermanentDeleteReconciliation(true);
      }

      if (!wasRefreshSuccessful) {
        setPermanentDeleteReviewReason('refresh-failed');
      } else if (hasJobFailure) {
        setPermanentDeleteReviewReason('job-failed');
      } else {
        setPermanentDeleteReviewReason(null);
      }

      if (attempt >= MAX_PERMANENT_DELETE_RECONCILIATION_ATTEMPTS) {
        clearPermanentDeleteReconciliationDeadline();
        if (!wasRefreshSuccessful) {
          setPermanentDeleteReviewReason('refresh-failed');
        } else if (hasJobFailure) {
          setPermanentDeleteReviewReason('job-failed');
        } else {
          setPermanentDeleteReviewReason('timed-out');
        }
        setIsPermanentDeleteReconciling(false);
        return;
      }

      const nextContext = {
        ...context,
        jobUuids: hasPendingJob ? context.jobUuids : [],
        hasKnownJobFailure: hasJobFailure,
      };
      permanentDeleteReconciliationTimeoutRef.current = clock.setTimeout(() => {
        permanentDeleteReconciliationTimeoutRef.current = undefined;
        void runPermanentDeleteReconciliation(nextContext, generation, attempt + 1);
      }, PERMANENT_DELETE_RECONCILIATION_INTERVAL_MS);
    } finally {
      permanentDeleteReconciliationRequestInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsPermanentDeleteReconciliationRequestInFlight(false);
      }
    }
  };

  const startPermanentDeleteReconciliation = (context: PermanentDeleteReconciliationContext): void => {
    cancelPermanentDeleteReconciliation();
    const generation = permanentDeleteReconciliationGenerationRef.current;
    pendingPermanentDeleteContextRef.current = context;
    pendingPermanentDeleteNodeIdsRef.current = context.nodeIds;
    isPermanentDeleteUnresolvedRef.current = true;
    setIsPermanentDeleteUnresolved(true);
    setIsPermanentDeleteReconciling(true);
    setIsWaitingForPermanentDeleteReconciliation(false);
    setPermanentDeleteReviewReason(null);
    if (permanentDeleteReconciliationRequestInFlightRef.current) {
      setIsPermanentDeleteReconciling(false);
      setPermanentDeleteReviewReason('request-timeout');
      return;
    }

    permanentDeleteReconciliationDeadlineRef.current = clock.setTimeout(() => {
      permanentDeleteReconciliationDeadlineRef.current = undefined;
      if (!isCurrentPermanentDeleteReconciliation(context, generation)) {
        return;
      }

      cancelPermanentDeleteReconciliation();
      setIsPermanentDeleteReconciling(false);
      setPermanentDeleteReviewReason('request-timeout');
    }, PERMANENT_DELETE_RECONCILIATION_TIMEOUT_MS);
    void runPermanentDeleteReconciliation(context, generation, 1);
  };
  startPermanentDeleteReconciliationRef.current = startPermanentDeleteReconciliation;

  useEffect(() => {
    if (hasRehydratedPermanentDeleteContextRef.current) {
      return;
    }
    hasRehydratedPermanentDeleteContextRef.current = true;

    const context = getStoredPermanentDeleteReconciliation(selectionScopeKey, currentPermanentDeletePath);
    if (context !== null) {
      startPermanentDeleteReconciliationRef.current?.(context);
      return;
    }

    clearStoredPermanentDeleteReconciliation();
  }, [currentPermanentDeletePath, selectionScopeKey]);

  useEffect(() => {
    if (getStoredPermanentDeleteReconciliation(selectionScopeKey, currentPermanentDeletePath) === null) {
      clearStoredPermanentDeleteReconciliation();
    }
  }, [currentPermanentDeletePath, selectionScopeKey]);

  const handlePermanentDelete = async (nodeIds: string[], scopeKey: string, path: string): Promise<void> => {
    if (isPermanentDeletePendingRef.current || isPermanentDeleteUnresolvedRef.current) {
      return;
    }
    if (!isCurrentPermanentDeleteScope(scopeKey, path)) {
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

    isPermanentDeletePendingRef.current = true;
    setIsPermanentDeleteRejected(false);
    setIsPermanentDeletePending(true);

    try {
      const response = await cellsRepository.deleteNodes({uuids: nodeIds, permanently: true});
      if (!isCurrentPermanentDeleteScope(scopeKey, path)) {
        return;
      }

      if (!hasPermanentDeleteCompleted(response)) {
        startPermanentDeleteReconciliation({
          nodeIds,
          scopeKey,
          path,
          jobUuids: getPermanentDeleteJobUuids(response),
          hasKnownJobFailure: hasPermanentDeleteJobFailure(response),
        });
        return;
      }

      setIsPermanentDeleteRejected(false);
      setSelectedNodeIds(currentSelection => {
        return hasSameSelection(currentSelection, nodeIds) ? new Set() : currentSelection;
      });
      onRefresh();
    } catch (error: unknown) {
      console.error(error);
      if (!isCurrentPermanentDeleteScope(scopeKey, path)) {
        return;
      }
      if (isAuthoritativePermanentDeleteRejection(error)) {
        setIsPermanentDeleteRejected(true);
        return;
      }

      startPermanentDeleteReconciliation({nodeIds, scopeKey, path, jobUuids: [], hasKnownJobFailure: false});
    } finally {
      isPermanentDeletePendingRef.current = false;
      if (isMountedRef.current) {
        setIsPermanentDeletePending(false);
      }
    }
  };

  const handleReloadAfterPermanentDeleteTimeout = (event: MouseEvent<HTMLAnchorElement>): void => {
    const context = pendingPermanentDeleteContextRef.current;
    if (context === null || !storePermanentDeleteReconciliation(context)) {
      event.preventDefault();
      setPermanentDeleteReviewReason('storage-failed');
    }
  };

  const handleRefreshAfterPermanentDeleteReview = async (): Promise<void> => {
    if (isRefreshingPermanentDeleteReview || permanentDeleteReconciliationRequestInFlightRef.current) {
      return;
    }

    const scopeKey = selectionScopeKeyRef.current;
    const path = getCellsFilesPath();
    permanentDeleteReconciliationRequestInFlightRef.current = true;
    setIsPermanentDeleteReconciliationRequestInFlight(true);
    setIsRefreshingPermanentDeleteReview(true);
    setIsWaitingForPermanentDeleteReconciliation(false);
    try {
      const wasRefreshSuccessful = await onRefreshAfterBulkMoveOutcome();
      if (!isCurrentPermanentDeleteScope(scopeKey, path)) {
        return;
      }
      if (!wasRefreshSuccessful) {
        setPermanentDeleteReviewReason(previousReason => {
          return previousReason === 'job-failed' ? previousReason : 'refresh-failed';
        });
        return;
      }

      setPermanentDeleteReviewReason(previousReason => {
        return previousReason === 'job-failed' ? previousReason : 'still-visible';
      });
      setIsWaitingForPermanentDeleteReconciliation(true);
    } catch {
      if (isCurrentPermanentDeleteScope(scopeKey, path)) {
        setPermanentDeleteReviewReason(previousReason => {
          return previousReason === 'job-failed' ? previousReason : 'refresh-failed';
        });
      }
    } finally {
      permanentDeleteReconciliationRequestInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsRefreshingPermanentDeleteReview(false);
        setIsPermanentDeleteReconciliationRequestInFlight(false);
      }
    }
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
      selectionEnabled: isSelectionEnabled && !isBulkMoveOutcomeUnresolved && !isPermanentDeleteUnresolved,
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
    !isPermanentDeleteUnresolved &&
    canPerformCurrentDriveAction(CELLS_ACTION.DELETE) &&
    selectedNodes.every(node => {
      return canPerformCellsAction({action: CELLS_ACTION.DELETE, selfUserDriveRole: node.selfUserDriveRole});
    });
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

  const moveOutcomeMessage = moveState.kind === 'needs-review' ? translate(moveStatusMessageKey[moveState.reason]) : '';

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
                  {canPermanentlyDeleteSelection && (
                    <button
                      css={bulkMoveButtonStyles}
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
        {isPermanentDeleteUnresolved && isPermanentDeleteReconciling && (
          <div css={permanentDeleteProgressStyles} role="status" aria-live="polite">
            <SharedDriveUploadSpinnerIcon color="var(--accent-color)" width={16} height={16} aria-hidden="true" />
            <span>{translate(getPermanentDeleteCheckingMessageKey(permanentDeleteReviewReason))}</span>
          </div>
        )}
        {isPermanentDeleteRejected && !isPermanentDeleteUnresolved && (
          <div css={permanentDeleteProgressStyles} role="alert">
            {translate('cells.bulkDelete.rejected')}
          </div>
        )}
        {isPermanentDeleteUnresolved && !isPermanentDeleteReconciling && (
          <div css={permanentDeleteProgressStyles} role="alert">
            <span>{translate(getPermanentDeleteReviewMessageKey(permanentDeleteReviewReason))}</span>
            {permanentDeleteReviewReason === 'request-timeout' ? (
              <a
                href={window.location.href}
                css={permanentDeleteReloadLinkStyles}
                onClick={handleReloadAfterPermanentDeleteTimeout}
              >
                {translate('cells.bulkDelete.reload')}
              </a>
            ) : (
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
            )}
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
