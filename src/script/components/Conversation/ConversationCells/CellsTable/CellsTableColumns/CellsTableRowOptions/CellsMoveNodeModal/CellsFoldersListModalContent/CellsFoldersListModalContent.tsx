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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CellItem} from 'Components/Conversation/ConversationCells/common/cellFile/cellFile';
import {CellsBreadcrumbs} from 'Components/Conversation/ConversationCells/common/CellsBreadcrumbs/CellsBreadcrumbs';
import {getBreadcrumbsFromPath} from 'Components/Conversation/ConversationCells/common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
import {getCellsApiPath} from 'Components/Conversation/ConversationCells/common/getCellsApiPath/getCellsApiPath';
import {openBreadcrumb} from 'Components/Conversation/ConversationCells/common/openBreadcrumb/openBreadcrumb';
import {CellsRepository} from 'src/script/cells/CellsRepository';

import {CellsCreateNewFolderHint} from './CellsCreateNewFolderHint/CellsCreateNewFolderHint';
import {CellsFolderList} from './CellsFolderList/CellsFolderList';
import {CellsFolderListEmpty} from './CellsFolderListEmpty/CellsFolderListEmpty';
import {CellsFolderListLoading} from './CellsFolderListLoading/CellsFolderListLoading';
import {breadcrumbsWrapperStyles, listWrapperStyles} from './CellsFoldersListModalContent.styles';
import {CellsMoveActions} from './CellsMoveActions/CellsMoveActions';
import {useMoveCellsNode} from './useMoveCellNode/useMoveCellsNode';

interface CellsFoldersListModalContentProps {
  nodeToMove: CellItem;
  items: Array<{id: string; name: string; path: string}>;

  status: 'idle' | 'loading' | 'success' | 'error';

  shouldShowLoadingSpinner: boolean;

  conversationQualifiedId: QualifiedId;

  conversationName: string;

  cellsRepository: CellsRepository;

  currentPath: string;
  onPathChange: (path: string) => void;
  onChangeModalContent: (content: 'move' | 'create') => void;
  onClose: () => void;
}

export const CellsFoldersListModalContent = ({
  nodeToMove,
  items,
  status,
  shouldShowLoadingSpinner,
  conversationQualifiedId,
  conversationName,
  cellsRepository,
  currentPath,
  onPathChange,
  onChangeModalContent,
  onClose,
}: CellsFoldersListModalContentProps) => {
  const {moveNode, status: moveNodeStatus} = useMoveCellsNode({cellsRepository});

  const breadcrumbs = getBreadcrumbsFromPath({baseCrumb: `${conversationName} files`, currentPath});

  const nodeToMoveParent = nodeToMove.path.split('/').slice(0, -1).join('/');
  const targetPath = getCellsApiPath({conversationQualifiedId, currentPath});
  const movingDisabled = nodeToMoveParent === targetPath;

  const shouldDisplayEmptyItems = status === 'success' && !items.length;

  const handleMove = async () => {
    await moveNode({
      currentPath: nodeToMove.path,
      targetPath,
    });
    onClose();
    openBreadcrumb({
      conversationQualifiedId,
      path: currentPath,
    });
  };

  const handleFolderNavigate = (path: string) => {
    const newPath = path.split('/').slice(1).join('/');
    onPathChange(newPath);
  };

  const handleBreadcrumbClick = (item: {name: string}) => {
    const path = breadcrumbs.find(crumb => crumb.name === item.name)?.path ?? '';
    onPathChange(path);
  };

  return (
    <>
      <div css={breadcrumbsWrapperStyles}>
        <CellsBreadcrumbs items={breadcrumbs} maxNotCombinedItems={3} onItemClick={handleBreadcrumbClick} />
      </div>
      <div css={listWrapperStyles}>
        {shouldShowLoadingSpinner && <CellsFolderListLoading />}
        {shouldDisplayEmptyItems && <CellsFolderListEmpty />}
        {!shouldShowLoadingSpinner && !shouldDisplayEmptyItems && (
          <CellsFolderList items={items} onNavigate={handleFolderNavigate} />
        )}
      </div>
      <CellsCreateNewFolderHint onCreate={() => onChangeModalContent('create')} />
      <CellsMoveActions
        onCancel={onClose}
        onMove={handleMove}
        moveDisabled={movingDisabled}
        moveLoading={moveNodeStatus === 'loading'}
      />
    </>
  );
};
