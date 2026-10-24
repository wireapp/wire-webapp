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

import {useEffect, useRef, type FunctionComponent} from 'react';

import type {RestPerformActionResponse} from 'cells-sdk-ts';
import type {Result} from 'true-myth';

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import type {
  SharedDriveMoveItem,
  SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {BulkMoveDestinationSelection} from './useBulkMoveDestinationSelection';

import {CellsFoldersListModalContent} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/cellsFoldersListModalContent/cellsFoldersListModalContent';

interface CellsBulkMovePreviewPresentationProps {
  isOpen: boolean;
  onClose: () => void;
  conversationName: string;
  destination: BulkMoveDestinationSelection;
  selectedItems: readonly SharedDriveMoveItem[];
  destinationPath: string;
  onMove: () => Promise<Result<RestPerformActionResponse, unknown>>;
  onMoveStart: (summary: SharedDriveMoveSummary) => void;
  onMoveResult: (response: RestPerformActionResponse, summary: SharedDriveMoveSummary) => boolean;
  onMoveError: () => void;
  isMoveOutcomeUnresolved: boolean;
  isMoveRequestError: boolean;
  isMoveDisabled: boolean;
  isMoveLoading: boolean;
  isBackgroundMovePending: boolean;
  isBackgroundMoveError: boolean;
  isBackgroundMoveStatusUnknown: boolean;
  canRetryBackgroundMoveStatus: boolean;
  onRetryBackgroundMoveStatus: () => void;
  onRefresh: () => void;
}

export const CellsBulkMovePreviewPresentation: FunctionComponent<CellsBulkMovePreviewPresentationProps> = ({
  isOpen,
  onClose,
  conversationName,
  destination,
  selectedItems,
  destinationPath,
  onMove,
  onMoveStart,
  onMoveResult,
  onMoveError,
  isMoveOutcomeUnresolved,
  isMoveRequestError,
  isMoveDisabled,
  isMoveLoading,
  isBackgroundMovePending,
  isBackgroundMoveError,
  isBackgroundMoveStatusUnknown,
  canRetryBackgroundMoveStatus,
  onRetryBackgroundMoveStatus,
  onRefresh,
}: CellsBulkMovePreviewPresentationProps) => {
  const {translate} = useApplicationContext();
  const isCurrentDialog = useRef(true);

  useEffect(() => {
    isCurrentDialog.current = true;
    return () => {
      isCurrentDialog.current = false;
    };
  }, []);

  const handleMove = async (): Promise<void> => {
    const moveSummary = {
      items: selectedItems,
      destinationPath: destinationPath.length > 0 ? destinationPath : translate('cells.sharedDrive.title'),
    };
    onMoveStart(moveSummary);
    const moveResult = await onMove();
    if (!isCurrentDialog.current) {
      return;
    }

    if (moveResult.isErr) {
      onMoveError();
      return;
    }

    if (moveResult.isOk) {
      const canCloseAfterMove = onMoveResult(moveResult.value, moveSummary);
      if (canCloseAfterMove) {
        onClose();
      }
    }
  };

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{translate('cells.moveNodeModal.moveTitle')}</CellsModal.Header>
      <CellsFoldersListModalContent
        conversationName={conversationName}
        destination={destination}
        getCurrentPathFromFolder={path => {
          return path;
        }}
      />
      {isMoveOutcomeUnresolved && !isBackgroundMoveError && !isBackgroundMoveStatusUnknown && (
        <div role="alert">
          <p>
            {isMoveRequestError
              ? translate('cells.newItemMenuModalForm.genericError')
              : translate('cells.bulkMove.outcomeUnresolved')}
          </p>
        </div>
      )}
      {isBackgroundMoveError && (
        <div role="alert">
          <p>{translate('cells.bulkMove.moveNeedsReview')}</p>
          <button type="button" onClick={onRefresh}>
            {translate('cells.bulkMove.refreshDrive')}
          </button>
        </div>
      )}
      {isBackgroundMoveStatusUnknown && (
        <div role="alert">
          <p>{translate('cells.bulkMove.statusUnknown')}</p>
          {canRetryBackgroundMoveStatus && (
            <button type="button" onClick={onRetryBackgroundMoveStatus}>
              {translate('cells.bulkMove.checkStatus')}
            </button>
          )}
          <button type="button" onClick={onRefresh}>
            {translate('cells.bulkMove.refreshDrive')}
          </button>
        </div>
      )}
      <CellsModal.Actions>
        {!isBackgroundMovePending && (
          <CellsModal.SecondaryButton onClick={onClose}>
            {translate('cells.moveNodeModal.cancelButton')}
          </CellsModal.SecondaryButton>
        )}
        <CellsModal.PrimaryButton onClick={handleMove} isDisabled={isMoveDisabled}>
          {translate(
            isMoveLoading || isBackgroundMovePending ? 'cells.bulkMove.processing' : 'cells.bulkMove.moveButton',
          )}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
