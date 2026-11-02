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

import {Button, ButtonVariant, TrashIcon} from '@wireapp/react-ui-kit';

import type {CellsRepository} from 'Repositories/cells/cellsRepository';
import {driveBulkActionsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  actionStyles,
  confirmationContentStyles,
  confirmationTextStyles,
  emptyBinButtonStyles,
  statusStyles,
} from './cellsEmptyBinAction.styles';
import {isEmptyBinRootPath} from './emptyBinAction';

import type {
  BinOperation,
  CellsBinOperationController,
} from '../../common/cellsBinOperations/cellsBinOperationController';
import {useCellsBinOperationView} from '../../common/cellsBinOperations/useCellsBinOperationView';
import {CellsModal} from '../../common/cellsModal/cellsModal';
import {
  CELLS_ACTION,
  useCellsActionPermissions,
} from '../../common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

interface CellsEmptyBinActionProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  getCurrentCellsPath: () => string;
  onRefreshAfterEmptyBinOutcome: () => Promise<boolean>;
  onEmptyBinSubmitted: () => void;
}

interface CapturedBinView {
  readonly drive: QualifiedId;
  readonly path: string;
  readonly scopeKey: string;
}

type EmptyBinStatus =
  'submitting' | 'processing' | 'completed' | 'partial' | 'failed' | 'unknown' | 'rejected' | 'lookup-error';

const reportedSubmittedOperations = new WeakMap<CellsBinOperationController, Set<number>>();

const getEmptyBinStatus = (operation: BinOperation | undefined): EmptyBinStatus | undefined => {
  if (operation === undefined) {
    return undefined;
  }

  if (operation.state === 'submitting' || operation.state === 'processing' || operation.state === 'completed') {
    return operation.state;
  }

  if (operation.state === 'rejected') {
    return operation.targetIds.length > 0 ? 'rejected' : 'lookup-error';
  }

  switch (operation.reason) {
    case 'partial':
      return 'partial';
    case 'job-failed':
      return 'failed';
    case 'request-failed':
    case 'status-unknown':
    case 'timed-out':
    default:
      return 'unknown';
  }
};

export const CellsEmptyBinAction: FunctionComponent<CellsEmptyBinActionProps> = ({
  conversationQualifiedId,
  getCurrentCellsPath,
  onRefreshAfterEmptyBinOutcome,
  onEmptyBinSubmitted,
}: CellsEmptyBinActionProps) => {
  const {clock, isFeatureToggleEnabled, translate} = useApplicationContext();
  const canPerformCellsAction = useCellsActionPermissions();
  const currentCellsPath = getCurrentCellsPath();
  const scopeKey = JSON.stringify([conversationQualifiedId.domain, conversationQualifiedId.id, currentCellsPath]);
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;
  const [confirmation, setConfirmation] = useState<CapturedBinView | null>(null);

  const isFeatureEnabled = isFeatureToggleEnabled(driveBulkActionsFeatureToggleName);
  const canEmptyBin =
    isFeatureEnabled && isEmptyBinRootPath(currentCellsPath) && canPerformCellsAction(CELLS_ACTION.DELETE);

  const isCurrentScope = useCallback((): boolean => {
    return (
      currentScopeKey.current === scopeKey &&
      getCurrentCellsPath() === currentCellsPath &&
      isEmptyBinRootPath(currentCellsPath) &&
      canEmptyBin
    );
  }, [canEmptyBin, currentCellsPath, getCurrentCellsPath, scopeKey]);

  const {controller, operation, isLocked, isRefreshing, refreshFailed, refreshReview} = useCellsBinOperationView({
    drive: conversationQualifiedId,
    path: currentCellsPath,
    clock,
    onRefresh: onRefreshAfterEmptyBinOutcome,
    isCurrentScope,
  });

  const displayedOperation =
    operation?.kind === 'empty-bin' && operation.path === currentCellsPath ? operation : undefined;
  const status = getEmptyBinStatus(displayedOperation);
  const requiresReview = displayedOperation?.state === 'needs-review';
  const isErrorStatus =
    status === 'partial' ||
    status === 'failed' ||
    status === 'unknown' ||
    status === 'rejected' ||
    status === 'lookup-error';

  const isConfirmationCurrent =
    confirmation !== null &&
    confirmation.scopeKey === scopeKey &&
    confirmation.path === currentCellsPath &&
    confirmation.drive.id === conversationQualifiedId.id &&
    confirmation.drive.domain === conversationQualifiedId.domain &&
    canEmptyBin;

  useEffect(() => {
    if (confirmation !== null && !isConfirmationCurrent) {
      setConfirmation(null);
    }
  }, [confirmation, isConfirmationCurrent]);

  useEffect(() => {
    if (
      !canEmptyBin ||
      operation === undefined ||
      operation.kind !== 'empty-bin' ||
      operation.drive.id !== conversationQualifiedId.id ||
      operation.drive.domain !== conversationQualifiedId.domain ||
      operation.path !== currentCellsPath ||
      operation.targetIds.length === 0 ||
      !isCurrentScope()
    ) {
      return;
    }

    let reportedOperationIds = reportedSubmittedOperations.get(controller);
    if (reportedOperationIds === undefined) {
      reportedOperationIds = new Set();
      reportedSubmittedOperations.set(controller, reportedOperationIds);
    }
    if (reportedOperationIds.has(operation.id)) {
      return;
    }
    reportedOperationIds.add(operation.id);
    onEmptyBinSubmitted();
  }, [
    canEmptyBin,
    conversationQualifiedId.domain,
    conversationQualifiedId.id,
    controller,
    currentCellsPath,
    isCurrentScope,
    onEmptyBinSubmitted,
    operation,
  ]);

  const closeConfirmation = (): void => {
    setConfirmation(null);
  };

  const handleConfirm = (): void => {
    if (confirmation === null || !isConfirmationCurrent || isLocked) {
      closeConfirmation();
      return;
    }

    controller.start({
      kind: 'empty-bin',
      drive: confirmation.drive,
      path: confirmation.path,
      targetIds: [],
    });
    closeConfirmation();
  };

  if (!canEmptyBin) {
    return null;
  }

  return (
    <div css={actionStyles}>
      <Button
        variant={ButtonVariant.CANCEL}
        type="button"
        css={emptyBinButtonStyles}
        disabled={isLocked}
        onClick={() => {
          setConfirmation({
            drive: {...conversationQualifiedId},
            path: currentCellsPath,
            scopeKey,
          });
        }}
      >
        <TrashIcon aria-hidden="true" />
        {translate('cells.emptyBin.button')}
      </Button>

      {status !== undefined && (
        <div css={statusStyles} role={isErrorStatus || refreshFailed ? 'alert' : 'status'} aria-live="polite">
          <span>
            {translate(status === 'rejected' ? 'cells.bulkDelete.rejected' : `cells.emptyBin.status.${status}`)}
          </span>
          {refreshFailed && <span>{translate('cells.emptyBin.refreshFailed')}</span>}
          {status === 'unknown' && displayedOperation?.jobUuids.length !== 0 && (
            <Button
              variant={ButtonVariant.TERTIARY}
              type="button"
              disabled={isRefreshing}
              onClick={() => {
                void refreshReview();
              }}
            >
              {translate('cells.emptyBin.checkStatus')}
            </Button>
          )}
          {requiresReview && !(status === 'unknown' && (displayedOperation?.jobUuids.length ?? 0) > 0) && (
            <Button
              variant={ButtonVariant.TERTIARY}
              type="button"
              disabled={isRefreshing}
              onClick={() => {
                void refreshReview();
              }}
            >
              {translate('cells.emptyBin.refreshBin')}
            </Button>
          )}
        </div>
      )}

      <CellsModal isOpen={isConfirmationCurrent} onClose={closeConfirmation}>
        <CellsModal.Header>{translate('cells.emptyBin.title')}</CellsModal.Header>
        <div css={confirmationContentStyles}>
          <p css={confirmationTextStyles}>{translate('cells.emptyBin.description')}</p>
        </div>
        <CellsModal.Actions>
          <CellsModal.SecondaryButton onClick={closeConfirmation}>
            {translate('cells.emptyBin.cancel')}
          </CellsModal.SecondaryButton>
          <CellsModal.PrimaryButton onClick={handleConfirm} isDisabled={isLocked || !isConfirmationCurrent}>
            {translate('cells.emptyBin.confirm')}
          </CellsModal.PrimaryButton>
        </CellsModal.Actions>
      </CellsModal>
    </div>
  );
};
