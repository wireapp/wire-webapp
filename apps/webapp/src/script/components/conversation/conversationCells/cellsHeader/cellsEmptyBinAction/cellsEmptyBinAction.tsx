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

import {useCallback, useEffect, useRef, useState, type FunctionComponent} from 'react';

import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {Maybe, maybe} from 'true-myth';

import {
  actionStyles,
  confirmationContentStyles,
  confirmationTextStyles,
  emptyBinButtonStyles,
  statusStyles,
} from './cellsEmptyBinAction.styles';
import {emptyBin, isEmptyBinRootPath} from './emptyBinAction';
import {getEmptyBinStatusKind, type EmptyBinStatus} from './getEmptyBinStatusKind';

import {driveBulkActionsFeatureToggleName} from '../../../../../featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from '../../../../../page/rootProvider';
import type {CellsRepository} from '../../../../../repositories/cells/cellsRepository';
import {TrashIcon} from '../../../../../uiKit/dataDisplay/icon/trashIcon';
import {Button, ButtonVariant} from '../../../../../uiKit/inputs/button/button';
import {
  getCellsBackgroundActionEvidence,
  observeCellsBackgroundActionJobs,
} from '../../common/cellsBackgroundActionPolling/cellsBackgroundActionJobs';
import {CellsModal} from '../../common/cellsModal/cellsModal';
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from '../../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {useBulkActionStatusReporter} from '../../useBulkActionStatusReporter';

const BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS = 1000;
const BACKGROUND_DELETE_STATUS_RETRY_BACKOFF_FACTOR = 2;
const MAX_BACKGROUND_DELETE_STATUS_RETRIES = 5;

interface CellsEmptyBinActionProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  getCurrentCellsPath: () => string;
  onRefreshAfterEmptyBinOutcome: () => Promise<boolean>;
  onEmptyBinSubmitted: () => void;
  onInProgressChange: (isInProgress: boolean) => void;
}

export const CellsEmptyBinAction: FunctionComponent<CellsEmptyBinActionProps> = ({
  cellsRepository,
  conversationQualifiedId,
  getCurrentCellsPath,
  onRefreshAfterEmptyBinOutcome,
  onEmptyBinSubmitted,
  onInProgressChange,
}: CellsEmptyBinActionProps) => {
  const {clock, isFeatureToggleEnabled, translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<EmptyBinStatus>('idle');
  const [requiresReview, setRequiresReview] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [backgroundJobUuids, setBackgroundJobUuids] = useState<string[]>([]);
  const requestPending = useRef(false);
  const isMounted = useRef(false);
  const statusReporter = useBulkActionStatusReporter('emptyBin');

  const isFeatureEnabled = isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const currentCellsPath = getCurrentCellsPath();
  const isAtBinRoot = isEmptyBinRootPath(currentCellsPath);
  const canEmptyBin = isFeatureEnabled && isAtBinRoot && canPerformCellsAction(CELLS_ACTION.DELETE);
  const scopeKey = `${conversationQualifiedId.id}@${conversationQualifiedId.domain}`;
  const initialScopeKey = useRef(scopeKey).current;
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;
  const canEmptyBinRef = useRef(canEmptyBin);
  canEmptyBinRef.current = canEmptyBin;
  const isSameBinView = useCallback((): boolean => {
    return (
      isMounted.current && currentScopeKey.current === initialScopeKey && isEmptyBinRootPath(getCurrentCellsPath())
    );
  }, [getCurrentCellsPath, initialScopeKey]);
  const isCurrentScope = useCallback((): boolean => {
    return isSameBinView() && canEmptyBinRef.current;
  }, [isSameBinView]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!canEmptyBin) {
      setIsConfirmationOpen(false);
    }
  }, [canEmptyBin]);

  const {report: reportStatus, clear: clearStatus, isProcessing: isStatusProcessing} = statusReporter;
  useEffect(() => {
    const statusKind = getEmptyBinStatusKind({status, refreshFailed});
    if (maybe.isNothing(statusKind)) {
      clearStatus();
      return;
    }
    reportStatus(statusKind.value);
  }, [clearStatus, refreshFailed, reportStatus, status]);

  useEffect(() => {
    return () => {
      // Leaving while the outcome is unknown must not leave the popup stuck on progress.
      if (isStatusProcessing()) {
        reportStatus('status-unknown');
      }
    };
  }, [isStatusProcessing, reportStatus]);

  const isInProgress = status === 'submitting' || status === 'processing' || requiresReview;
  useEffect(() => {
    onInProgressChange(isInProgress);
    // Leaving the Bin view must not keep the parent's lock (e.g. disabled row selection) on other views.
    return () => {
      onInProgressChange(false);
    };
  }, [isInProgress, onInProgressChange]);

  const refreshAfterOutcome = useCallback(async (): Promise<boolean> => {
    if (!isSameBinView()) {
      return false;
    }

    try {
      const wasRefreshSuccessful = await onRefreshAfterEmptyBinOutcome();
      if (isMounted.current && !wasRefreshSuccessful) {
        setRefreshFailed(true);
      }
      return wasRefreshSuccessful;
    } catch {
      if (isMounted.current) {
        setRefreshFailed(true);
      }
      return false;
    }
  }, [isSameBinView, onRefreshAfterEmptyBinOutcome]);

  useEffect(() => {
    if (status !== 'processing' || backgroundJobUuids.length === 0) {
      return undefined;
    }

    return observeCellsBackgroundActionJobs({
      cellsRepository,
      actionName: 'delete',
      jobUuids: backgroundJobUuids,
      clock,
      pollingPolicy: {
        pollIntervalMs: BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS,
        maxUnknownRetries: MAX_BACKGROUND_DELETE_STATUS_RETRIES,
        maxPollAttempts: Maybe.nothing(),
        getUnknownRetryDelay: retryIndex => {
          return (
            BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS * BACKGROUND_DELETE_STATUS_RETRY_BACKOFF_FACTOR ** retryIndex
          );
        },
      },
      isCurrent: isCurrentScope,
      onOutcome: outcome => {
        if (outcome === 'all-finished') {
          setBackgroundJobUuids([]);
          setStatus('completed');
          setRequiresReview(false);
          void refreshAfterOutcome();
          return;
        }

        if (outcome === 'mixed-terminal') {
          setBackgroundJobUuids([]);
          setStatus('partial');
          setRequiresReview(true);
          void refreshAfterOutcome();
          return;
        }

        if (outcome === 'all-failed') {
          setBackgroundJobUuids([]);
          setStatus('failed');
          setRequiresReview(true);
          void refreshAfterOutcome();
          return;
        }

        setStatus('unknown');
        setRequiresReview(true);
        void refreshAfterOutcome();
      },
    });
  }, [
    backgroundJobUuids,
    canEmptyBin,
    cellsRepository,
    clock,
    currentCellsPath,
    isCurrentScope,
    refreshAfterOutcome,
    scopeKey,
    status,
  ]);

  if (!canEmptyBin) {
    return null;
  }

  const closeConfirmation = (): void => {
    if (!isSubmitting) {
      setIsConfirmationOpen(false);
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (requestPending.current || requiresReview || !isCurrentScope()) {
      setIsConfirmationOpen(false);
      return;
    }

    requestPending.current = true;
    setIsSubmitting(true);
    setIsConfirmationOpen(false);
    statusReporter.start([]);
    setStatus('submitting');
    setRefreshFailed(false);

    let deleteRequestStarted = false;
    try {
      const response = await emptyBin({
        cellsRepository,
        conversationQualifiedId,
        onDeleteStarted: () => {
          if (!isCurrentScope()) {
            throw new Error('The current Bin scope changed before submission.');
          }

          onEmptyBinSubmitted();
          deleteRequestStarted = true;
        },
      });
      if (!isSameBinView()) {
        return;
      }

      const actionEvidence = getCellsBackgroundActionEvidence(response, 'delete');
      if (actionEvidence.hasCompleted) {
        setStatus('completed');
        setRequiresReview(false);
        await refreshAfterOutcome();
        return;
      }

      if (actionEvidence.jobUuids.length > 0) {
        setBackgroundJobUuids([...actionEvidence.jobUuids]);
        setStatus('processing');
        return;
      }

      setStatus('unknown');
      setRequiresReview(true);
      await refreshAfterOutcome();
    } catch {
      if (!isSameBinView()) {
        return;
      }

      setStatus(deleteRequestStarted ? 'unknown' : 'lookup-error');
      setRequiresReview(deleteRequestStarted);
      if (deleteRequestStarted) {
        await refreshAfterOutcome();
      }
    } finally {
      requestPending.current = false;
      if (isMounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleReview = async (): Promise<void> => {
    const wasRefreshSuccessful = await refreshAfterOutcome();
    if (wasRefreshSuccessful && isMounted.current) {
      setRequiresReview(false);
      setBackgroundJobUuids([]);
      setStatus('idle');
      setRefreshFailed(false);
    }
  };

  const handleRetryStatusCheck = (): void => {
    if (backgroundJobUuids.length === 0) {
      return;
    }

    setStatus('processing');
  };

  const statusMessage = status === 'idle' ? '' : translate(`cells.emptyBin.status.${status}`);
  const isErrorStatus = ['partial', 'failed', 'unknown', 'lookup-error'].includes(status) || refreshFailed;
  // Progress and outcomes live in the status popup; only show inline what the user has to act on.
  const isActionRequired = requiresReview || (status === 'unknown' && backgroundJobUuids.length > 0);

  return (
    <div css={actionStyles}>
      <Button
        variant={ButtonVariant.CANCEL}
        type="button"
        css={emptyBinButtonStyles}
        disabled={isSubmitting || status === 'processing' || requiresReview}
        onClick={() => {
          setIsConfirmationOpen(true);
        }}
      >
        <TrashIcon aria-hidden="true" />
        {translate('cells.emptyBin.button')}
      </Button>

      {isActionRequired && (
        <div css={statusStyles} role={isErrorStatus ? 'alert' : 'status'} aria-live="polite">
          <span>{statusMessage}</span>
          {refreshFailed && <span>{translate('cells.emptyBin.refreshFailed')}</span>}
          {status === 'unknown' && backgroundJobUuids.length > 0 && (
            <Button variant={ButtonVariant.TERTIARY} type="button" onClick={handleRetryStatusCheck}>
              {translate('cells.emptyBin.checkStatus')}
            </Button>
          )}
          {requiresReview && backgroundJobUuids.length === 0 && (
            <Button
              variant={ButtonVariant.TERTIARY}
              type="button"
              onClick={() => {
                return void handleReview();
              }}
            >
              {translate('cells.emptyBin.refreshBin')}
            </Button>
          )}
        </div>
      )}

      <CellsModal isOpen={isConfirmationOpen} onClose={closeConfirmation}>
        <CellsModal.Header>{translate('cells.emptyBin.title')}</CellsModal.Header>
        <div css={confirmationContentStyles}>
          <p css={confirmationTextStyles}>{translate('cells.emptyBin.description')}</p>
        </div>
        <CellsModal.Actions>
          <CellsModal.SecondaryButton onClick={closeConfirmation}>
            {translate('cells.emptyBin.cancel')}
          </CellsModal.SecondaryButton>
          <CellsModal.PrimaryButton
            onClick={() => {
              return void handleConfirm();
            }}
            isDisabled={isSubmitting}
          >
            {translate('cells.emptyBin.confirm')}
          </CellsModal.PrimaryButton>
        </CellsModal.Actions>
      </CellsModal>
    </div>
  );
};
