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

import {CellsBreadcrumbs} from 'Components/Conversation/ConversationCells/common/CellsBreadcrumbs/CellsBreadcrumbs';
import {getBreadcrumbsFromPath} from 'Components/Conversation/ConversationCells/common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';

import {CellsCreateNewFolderHint} from './CellsCreateNewFolderHint/CellsCreateNewFolderHint';
import {CellsFolderList} from './CellsFolderList/CellsFolderList';
import {CellsFolderListEmpty} from './CellsFolderListEmpty/CellsFolderListEmpty';
import {CellsFolderListLoading} from './CellsFolderListLoading/CellsFolderListLoading';
import {breadcrumbsWrapperStyles, listWrapperStyles} from './CellsFoldersListModalContent.styles';

interface CellsFoldersListModalContentProps {
  items: Array<{id: string; name: string; path: string}>;
  status: 'idle' | 'loading' | 'success' | 'error';
  shouldShowLoadingSpinner: boolean;
  conversationName: string;
  currentPath: string;
  onPathChange: (path: string) => void;
  onChangeModalContent: (content: 'move' | 'create') => void;
}

export const CellsFoldersListModalContent = ({
  items,
  status,
  shouldShowLoadingSpinner,
  conversationName,
  currentPath,
  onPathChange,
  onChangeModalContent,
}: CellsFoldersListModalContentProps) => {
  const breadcrumbs = getBreadcrumbsFromPath({baseCrumb: `${conversationName} files`, currentPath});

  const shouldDisplayEmptyItems = status === 'success' && !items.length;

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
    </>
  );
};
