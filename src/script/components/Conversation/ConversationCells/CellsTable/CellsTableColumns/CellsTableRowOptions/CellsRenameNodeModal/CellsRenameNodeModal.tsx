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

import React from 'react';

import {ModalComponent} from 'Components/Modals/ModalComponent';

import {modalStyles} from './CellsRenameNodeModal.styles';

export const CellsRenameNodeModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      wrapperCSS={modalStyles}
      onKeyDown={event => handleEscDown(event, onClose)}
    >
      <div css={wrapperStyles}>
        <CellsMoveNodeModalHeader
          onClose={onClose}
          title={
            activeModalContent === 'move' ? t('cells.moveNodeModal.moveTitle') : t('cells.moveNodeModal.createTitle')
          }
        />
        {activeModalContent === 'move' ? (
          <CellsFoldersListModalContent
            nodeToMove={nodeToMove}
            items={folders}
            status={status}
            shouldShowLoadingSpinner={shouldShowLoadingSpinner}
            conversationQualifiedId={conversationQualifiedId}
            conversationName={conversationName}
            cellsRepository={cellsRepository}
            currentPath={currentPath}
            onPathChange={setCurrentPath}
            onChangeModalContent={setActiveModalContent}
            onClose={onClose}
          />
        ) : (
          <CellsNewFolderModalContent
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            currentPath={currentPath}
            onRefresh={refresh}
            onChangeModalContent={setActiveModalContent}
          />
        )}
      </div>
    </ModalComponent>
  );
};
