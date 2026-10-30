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

import {isNonEmptyString} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {JobsTaskStatus, RestActionStatus} from 'cells-sdk-ts';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {actionStyles, statusStyles} from './cellsEmptyBinAction.styles';
import {emptyBin} from './emptyBinAction';
import {getEmptyBinOutcome} from './emptyBinStatus';

import {CellsModal} from '../../common/cellsModal/cellsModal';
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from '../../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';
import {isRootRecycleBinPath as isCurrentRecycleBinRootPath} from '../../common/recycleBin/recycleBin';

const BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS = 1000;
const BACKGROUND_DELETE_STATUS_RETRY_BACKOFF_FACTOR = 2;
const MAX_BACKGROUND_DELETE_STATUS_RETRIES = 5;

type EmptyBinStatus =
  'idle' | 'submitting' | 'processing' | 'completed' | 'partial' | 'failed' | 'unknown' | 'lookup-error';

interface CellsEmptyBinActionProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  isRootRecycleBinPath: boolean;
  onRefreshAfterEmptyBinOutcome: () => Promise<boolean>;
  onEmptyBinSubmitted: () => void;
}

export const CellsEmptyBinAction: FunctionComponent<CellsEmptyBinActionProps> = ({
  cellsRepository,
  conversationQualifiedId,
  isRootRecycleBinPath,
  onRefreshAfterEmptyBinOutcome,
  onEmptyBinSubmitted,
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

  const isFeatureEnabled = isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const canEmptyBin = isFeatureEnabled && isRootRecycleBinPath && canPerformCellsAction(CELLS_ACTION.DELETE);
  const scopeKey = `${conversationQualifiedId.id}@${conversationQualifiedId.domain}`;
  const initialScopeKey = useRef(scopeKey).current;
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;
  const canEmptyBinRef = useRef(canEmptyBin);
  canEmptyBinRef.current = canEmptyBin;
  const isAtBinRootRef = useRef(isRootRecycleBinPath);
  isAtBinRootRef.current = isRootRecycleBinPath;
  const isSameBinView = useCallback((): boolean => {
    return (
      isMounted.current &&
      currentScopeKey.current === initialScopeKey &&
      isAtBinRootRef.current &&
      isCurrentRecycleBinRootPath()
    );
  }, [initialScopeKey]);
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

    let isActive = true;
    let timeout: ReturnType<typeof clock.setTimeout> | undefined;
    let retryCount = 0;

    const finishWithReview = async (outcome: 'partial' | 'failed' | 'unknown'): Promise<void> => {
      if (!isActive) {
        return;
      }

      setStatus(outcome);
      setRequiresReview(true);
      await refreshAfterOutcome();
    };

    const scheduleNextCheck = (delay: number): void => {
      timeout = clock.setTimeout(() => {
        void checkBackgroundDeleteStatus();
      }, delay);
    };

    const checkBackgroundDeleteStatus = async (): Promise<void> => {
      const results = await Promise.all(
        backgroundJobUuids.map(async jobUuid => {
          try {
            return await cellsRepository.getBackgroundActionInfo({name: 'delete', jobUuid});
          } catch {
            return undefined;
          }
        }),
      );
      if (!isActive) {
        return;
      }

      const statuses = results.map(result => {
        return result?.Status;
      });
      if (
        statuses.some(status => {
          return status === undefined || status === JobsTaskStatus.Unknown;
        })
      ) {
        if (retryCount >= MAX_BACKGROUND_DELETE_STATUS_RETRIES) {
          await finishWithReview('unknown');
          return;
        }

        retryCount += 1;
        scheduleNextCheck(
          BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS * BACKGROUND_DELETE_STATUS_RETRY_BACKOFF_FACTOR ** (retryCount - 1),
        );
        return;
      }

      retryCount = 0;
      const outcome = getEmptyBinOutcome(statuses);
      if (outcome === 'processing') {
        scheduleNextCheck(BACKGROUND_DELETE_STATUS_POLL_INTERVAL_MS);
        return;
      }

      setBackgroundJobUuids([]);
      if (outcome === 'completed') {
        setStatus('completed');
        setRequiresReview(false);
        await refreshAfterOutcome();
        return;
      }

      await finishWithReview(outcome);
    };

    void checkBackgroundDeleteStatus();

    return () => {
      isActive = false;
      if (timeout !== undefined) {
        clock.clearTimeout(timeout);
      }
    };
  }, [backgroundJobUuids, cellsRepository, clock, refreshAfterOutcome, status]);

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

      const deleteJobs = response.BackgroundActions?.filter(action => {
        return action.Name === 'delete' && isNonEmptyString(action.JobUuid);
      });
      const jobUuids = [
        ...new Set(
          deleteJobs?.map(action => {
            return action.JobUuid;
          }) ?? [],
        ),
      ];
      const backgroundActions = response.BackgroundActions ?? [];
      const allJobsFinished =
        backgroundActions.length > 0 &&
        backgroundActions.every(action => {
          return (
            action.Name === 'delete' && isNonEmptyString(action.JobUuid) && action.Status === JobsTaskStatus.Finished
          );
        });

      if (response.Status === RestActionStatus.Performed && (backgroundActions.length === 0 || allJobsFinished)) {
        setStatus('completed');
        setRequiresReview(false);
        await refreshAfterOutcome();
        return;
      }

      if (jobUuids.length > 0) {
        setBackgroundJobUuids(jobUuids);
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

  return (
    <div css={actionStyles}>
      <Button
        variant={ButtonVariant.TERTIARY}
        type="button"
        disabled={isSubmitting || status === 'processing' || requiresReview}
        onClick={() => {
          setIsConfirmationOpen(true);
        }}
      >
        {translate('cells.emptyBin.button')}
      </Button>

      {status !== 'idle' && (
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
        <p>{translate('cells.emptyBin.description')}</p>
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
