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

import {useCallback} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {loadMoreWrapperStyles, wrapperStyles} from './CellsGlobalView.styles';
import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useSearchCellsNodes} from './useSearchCellsNodes/useSearchCellsNodes';

interface CellsGlobalViewProps {
  cellsRepository?: CellsRepository;
}

export const CellsGlobalView = ({cellsRepository = container.resolve(CellsRepository)}: CellsGlobalViewProps) => {
  const {nodes, status: filesStatus, removeNode, pagination} = useCellsStore();

  const {searchValue, handleSearch, handleClearSearch, handleReload, increasePageSize} = useSearchCellsNodes({
    cellsRepository,
  });

  const deleteFileFailedNotification = useAppNotification({
    message: t('cellsGlobalView.deleteModalError'),
  });

  const handleDeleteNode = useCallback(
    async (uuid: string) => {
      try {
        removeNode(uuid);
        await cellsRepository.deleteNode({uuid});
      } catch (error) {
        deleteFileFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteFileFailedNotification, removeNode],
  );

  const handleRefresh = useCallback(async () => {
    await handleReload();
  }, [handleReload]);

  const isLoading = filesStatus === 'loading';
  const isFetchingMore = filesStatus === 'fetchingMore';
  const isError = filesStatus === 'error';
  const isSuccess = filesStatus === 'success';
  const hasFiles = !!nodes.length;
  const emptySearchResults = searchValue && filesStatus === 'success' && !nodes.length;

  const showTable = (isSuccess || (pagination && isFetchingMore)) && !emptySearchResults;
  const showNoFiles = !isLoading && !isFetchingMore && !isError && !hasFiles && !emptySearchResults;
  const showLoader = isFetchingMore && nodes && nodes.length > 0;

  const showLoadMore =
    !isLoading &&
    !isFetchingMore &&
    !emptySearchResults &&
    isSuccess &&
    pagination &&
    pagination.currentPage < pagination.totalPages;

  return (
    <div css={wrapperStyles}>
      <CellsHeader
        searchValue={searchValue}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onRefresh={handleRefresh}
        searchStatus={filesStatus}
      />
      {emptySearchResults && (
        <CellsStateInfo
          heading={t('cellsGlobalView.emptySearchResultsHeading')}
          description={t('cellsGlobalView.emptySearchResultsDescription')}
        />
      )}
      {showTable && <CellsTable nodes={nodes} cellsRepository={cellsRepository} onDeleteNode={handleDeleteNode} />}
      {showNoFiles && (
        <CellsStateInfo
          heading={t('cellsGlobalView.noFilesHeading')}
          description={t('cellsGlobalView.noFilesDescription')}
        />
      )}
      {showLoader && <CellsLoader />}
      {isError && (
        <CellsStateInfo
          heading={t('cellsGlobalView.errorHeading')}
          description={t('cellsGlobalView.errorDescription')}
        />
      )}
      {showLoadMore && (
        <div css={loadMoreWrapperStyles}>
          <Button variant={ButtonVariant.TERTIARY} onClick={increasePageSize}>
            {t('cellsGlobalView.pagination.loadMoreResults')}
          </Button>
        </div>
      )}
    </div>
  );
};
