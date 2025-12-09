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

import {FileLoader} from 'Components/FileFullscreenModal/FileLoader/FileLoader';
import {handleEscDown} from 'Util/KeyboardUtil';

import {FileHistoryContent} from './FileHistoryContent';
import {FileHistoryHeader} from './FileHistoryHeader';
import {fileHistoryModalWrapperCss, fileVersionRestoreModalWrapperCss} from './FileHistoryModal.styles';
import {FileRestoreConfirmContent} from './FileRestoreConfirmContent';
import {useFileHistoryModal} from './hooks/useFileHistoryModal';
import {useFileVersions} from './hooks/useFileVersions';

import {ModalComponent} from '../ModalComponent';

export const FileHistoryModal = () => {
  const {isOpen, hideModal, nodeUuid, onRestore} = useFileHistoryModal();
  const {
    fileVersions,
    isLoading,
    handleDownload,
    fileInfo,
    toBeRestoredVersionId,
    setToBeRestoredVersionId,
    handleRestore,
  } = useFileVersions(nodeUuid, hideModal, onRestore);

  return (
    <ModalComponent
      id="file-history-modal"
      wrapperCSS={toBeRestoredVersionId ? fileVersionRestoreModalWrapperCss : fileHistoryModalWrapperCss}
      isShown={isOpen}
      onClosed={hideModal}
      data-uie-name="file-history-modal"
      onKeyDown={event => handleEscDown(event, hideModal)}
    >
      {toBeRestoredVersionId ? (
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
              isLoading={isLoading}
              handleDownload={handleDownload}
              handleRestore={setToBeRestoredVersionId}
            />
          )}
        </>
      )}
    </ModalComponent>
  );
};
