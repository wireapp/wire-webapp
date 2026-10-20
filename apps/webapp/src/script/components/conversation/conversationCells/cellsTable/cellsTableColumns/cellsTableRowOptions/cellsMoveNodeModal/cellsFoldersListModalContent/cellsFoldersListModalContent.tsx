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

import {isNonEmptyArray} from '@sindresorhus/is';

import {CellsBreadcrumbs} from 'Components/conversation/conversationCells/common/cellsBreadcrumbs/cellsBreadcrumbs';
import {getBreadcrumbsFromPath} from 'Components/conversation/conversationCells/common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {CellsCreateNewFolderHint} from './cellsCreateNewFolderHint/cellsCreateNewFolderHint';
import {CellsFolderList} from './cellsFolderList/cellsFolderList';
import {CellsFolderListEmpty} from './cellsFolderListEmpty/cellsFolderListEmpty';
import {CellsFolderListLoading} from './cellsFolderListLoading/cellsFolderListLoading';
import {breadcrumbsWrapperStyles, listWrapperStyles} from './cellsFoldersListModalContent.styles';

interface CellsFoldersListModalContentProps {
  conversationName: string;
  destination: {
    folders: {id: string; name: string; path: string}[];
    status: 'idle' | 'loading' | 'success' | 'error';
    shouldShowLoadingSpinner: boolean;
    currentPath: string;
    handlePathChange: (path: string) => void;
    onChangeModalContent?: (content: 'move' | 'create') => void;
    handleDestinationSelect?: (path: string) => void;
    selectedDestinationPath?: string;
    disabledDestinationPaths?: readonly string[];
    disabledDestinationLabels?: Readonly<Record<string, string>>;
  };
  getCurrentPathFromFolder?: (path: string) => string;
}

export const CellsFoldersListModalContent = ({
  conversationName,
  destination: {
    folders: items,
    status,
    shouldShowLoadingSpinner,
    currentPath,
    handlePathChange: onPathChange,
    onChangeModalContent,
    handleDestinationSelect: onSelectDestination,
    selectedDestinationPath,
    disabledDestinationPaths,
    disabledDestinationLabels,
  },
  getCurrentPathFromFolder,
}: CellsFoldersListModalContentProps) => {
  const {translate} = useApplicationContext();
  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: translate('cells.breadcrumb.files', {conversationName}),
    currentPath,
    recycleBinLabel: translate('cells.recycleBin.breadcrumb'),
  });

  const shouldDisplayEmptyItems = status === 'success' && !isNonEmptyArray(items);
  const shouldDisplayFolders = status === 'success' && isNonEmptyArray(items);
  const shouldDisplayLoading = ['idle', 'loading'].includes(status);

  const handleFolderNavigate = (path: string) => {
    const newPath = getCurrentPathFromFolder?.(path) ?? path.split('/').slice(1).join('/');
    onPathChange(newPath);
  };

  const handleBreadcrumbClick = (item: {name: string}) => {
    const path =
      breadcrumbs.find(crumb => {
        return crumb.name === item.name;
      })?.path ?? '';
    onPathChange(path);
  };

  return (
    <>
      <div css={breadcrumbsWrapperStyles}>
        <CellsBreadcrumbs items={breadcrumbs} maxNotCombinedItems={3} onItemClick={handleBreadcrumbClick} />
      </div>
      <div css={listWrapperStyles} aria-busy={status === 'loading'}>
        {shouldDisplayLoading &&
          (shouldShowLoadingSpinner ? (
            <CellsFolderListLoading />
          ) : (
            <p role="status">{translate('cells.moveNodeModal.loading')}</p>
          ))}
        {status === 'error' && <p role="alert">{translate('cells.newItemMenuModalForm.genericError')}</p>}
        {shouldDisplayEmptyItems && <CellsFolderListEmpty />}
        {shouldDisplayFolders && (
          <CellsFolderList
            items={items}
            onNavigate={handleFolderNavigate}
            onSelectDestination={onSelectDestination}
            selectedDestinationPath={selectedDestinationPath}
            disabledDestinationPaths={disabledDestinationPaths}
            disabledDestinationLabels={disabledDestinationLabels}
          />
        )}
      </div>
      {onChangeModalContent !== undefined && (
        <CellsCreateNewFolderHint
          onCreate={() => {
            return onChangeModalContent('create');
          }}
        />
      )}
    </>
  );
};
