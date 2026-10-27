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

import {useEffect, useRef, type ChangeEvent, type FormEvent, type FunctionComponent, type MouseEvent} from 'react';

import type {RestPerformActionResponse} from 'cells-sdk-ts';
import type {Result} from 'true-myth';

import {CellsModal} from 'Components/conversation/conversationCells/common/cellsModal/cellsModal';
import {CellsNewNodeForm} from 'Components/conversation/conversationCells/common/cellsNewNodeForm/cellsNewNodeForm';
import type {
  SharedDriveMoveItem,
  SharedDriveMoveSummary,
} from 'Components/conversation/conversationCells/sharedDriveUploadStatusContext';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {BulkMoveDestinationSelection} from './useBulkMoveDestinationSelection';

import {CellsFoldersListModalContent} from '../cellsTableColumns/cellsTableRowOptions/cellsMoveNodeModal/cellsFoldersListModalContent/cellsFoldersListModalContent';

interface FolderCreationForm {
  name: string;
  error: string | null;
  isSubmitting: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => Promise<void>;
  handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClear: () => void;
}

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
  isPartialMoveOutcome: boolean;
  isMoveRequestError: boolean;
  isMoveDisabled: boolean;
  isMoveLoading: boolean;
  isBackgroundMovePending: boolean;
  isBackgroundMoveError: boolean;
  isBackgroundMoveStatusUnknown: boolean;
  canRetryBackgroundMoveStatus: boolean;
  onRetryBackgroundMoveStatus: () => void;
  onRefreshAfterBulkMoveOutcome: () => void;
  isRefreshingBulkMoveOutcome: boolean;
  activeModalContent: 'move' | 'create';
  onChangeModalContent: (content: 'move' | 'create') => void;
  canCreateNewFolder: boolean;
  folderCreationForm: FolderCreationForm;
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
  isPartialMoveOutcome,
  isMoveRequestError,
  isMoveDisabled,
  isMoveLoading,
  isBackgroundMovePending,
  isBackgroundMoveError,
  isBackgroundMoveStatusUnknown,
  canRetryBackgroundMoveStatus,
  onRetryBackgroundMoveStatus,
  onRefreshAfterBulkMoveOutcome,
  isRefreshingBulkMoveOutcome,
  activeModalContent,
  onChangeModalContent,
  canCreateNewFolder,
  folderCreationForm,
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
      <CellsModal.Header>
        {translate(
          activeModalContent === 'create' ? 'cells.moveNodeModal.createTitle' : 'cells.moveNodeModal.moveTitle',
        )}
      </CellsModal.Header>
      {activeModalContent === 'move' ? (
        <>
          <CellsFoldersListModalContent
            conversationName={conversationName}
            destination={{
              ...destination,
              onChangeModalContent: canCreateNewFolder ? onChangeModalContent : undefined,
            }}
            getCurrentPathFromFolder={path => {
              return path;
            }}
          />
          {isMoveOutcomeUnresolved && !isBackgroundMoveError && !isBackgroundMoveStatusUnknown && (
            <div role="alert">
              <p>
                {isMoveRequestError
                  ? translate('cells.newItemMenuModalForm.genericError')
                  : translate(
                      isPartialMoveOutcome ? 'cells.bulkMove.partialMoveWarning' : 'cells.bulkMove.outcomeUnresolved',
                    )}
              </p>
              <button type="button" onClick={onRefreshAfterBulkMoveOutcome} disabled={isRefreshingBulkMoveOutcome}>
                {translate('cells.bulkMove.refreshDrive')}
              </button>
            </div>
          )}
          {isBackgroundMoveError && (
            <div role="alert">
              <p>{translate('cells.bulkMove.moveNeedsReview')}</p>
              <button type="button" onClick={onRefreshAfterBulkMoveOutcome} disabled={isRefreshingBulkMoveOutcome}>
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
              <button type="button" onClick={onRefreshAfterBulkMoveOutcome} disabled={isRefreshingBulkMoveOutcome}>
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
        </>
      ) : (
        <>
          <CellsNewNodeForm
            label={translate('cells.newItemMenuModal.labelFolder')}
            placeholder={translate('cells.newItemMenuModal.placeholderFolder')}
            onSubmit={folderCreationForm.handleSubmit}
            inputValue={folderCreationForm.name}
            onChange={folderCreationForm.handleChange}
            onClear={folderCreationForm.handleClear}
            error={folderCreationForm.error}
            isOpen={isOpen}
          />
          <CellsModal.Actions>
            <CellsModal.SecondaryButton
              onClick={() => {
                return onChangeModalContent('move');
              }}
            >
              {translate('cells.newItemMenuModal.secondaryAction')}
            </CellsModal.SecondaryButton>
            <CellsModal.PrimaryButton
              onClick={folderCreationForm.handleSubmit}
              isDisabled={folderCreationForm.isSubmitting}
            >
              {translate('cells.newItemMenuModal.primaryAction')}
            </CellsModal.PrimaryButton>
          </CellsModal.Actions>
        </>
      )}
    </CellsModal>
  );
};
