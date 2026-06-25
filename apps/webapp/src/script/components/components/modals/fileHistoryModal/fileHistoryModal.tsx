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

import {FileLoader} from 'Components/fileFullscreenModal/fileLoader/fileLoader';
import {ModalComponent} from 'Components/modals/modalComponent';
import {handleEscDown} from 'Util/keyboardUtil';

import {FileHistoryContent} from './fileHistoryContent';
import {FileHistoryHeader} from './fileHistoryHeader';
import {fileHistoryModalWrapperCss, fileVersionRestoreModalWrapperCss} from './fileHistoryModal.styles';
import {FileRestoreConfirmContent} from './fileRestoreConfirmContent';
import {useFileHistoryModal} from './hooks/useFileHistoryModal';
import {useFileVersions} from './hooks/useFileVersions';

export const FileHistoryModal = () => {
  const {isOpen, hideModal, nodeUuid, onRestore} = useFileHistoryModal();
  const fileHistoryCopy = {
    failedToLoadVersions: 'fileHistoryModal.failedToLoadVersions',
    failedToRestore: 'fileHistoryModal.failedToRestore',
    invalidNodeData: 'fileHistoryModal.invalidNodeData',
  };
  const {
    fileVersions,
    isLoading,
    handleDownload,
    fileInfo,
    toBeRestoredVersionId,
    setToBeRestoredVersionId,
    handleRestore,
  } = useFileVersions(nodeUuid, hideModal, onRestore, fileHistoryCopy);
  const isRestoreFlowOpen = toBeRestoredVersionId !== undefined;

  return (
    <ModalComponent
      id="file-history-modal"
      wrapperCSS={isRestoreFlowOpen ? fileVersionRestoreModalWrapperCss : fileHistoryModalWrapperCss}
      isShown={isOpen}
      onClosed={hideModal}
      data-uie-name="file-history-modal"
      onKeyDown={event => handleEscDown(event, hideModal)}
    >
      {isRestoreFlowOpen ? (
        <FileRestoreConfirmContent
          isLoading={isLoading}
          onClose={() => setToBeRestoredVersionId(undefined)}
          onConfirm={handleRestore}
        />
      ) : (
        <>
          <FileHistoryHeader file={fileInfo} />
          {isLoading ? (
            <FileLoader />
          ) : (
            <FileHistoryContent
              fileVersions={fileVersions}
              handleDownload={handleDownload}
              handleRestore={setToBeRestoredVersionId}
            />
          )}
        </>
      )}
    </ModalComponent>
  );
};
