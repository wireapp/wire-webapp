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

import {useCallback, useEffect} from 'react';

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
import {useSearchCellsFiles} from './useSearchCellsFiles/useSearchCellsFiles';

interface CellsGlobalViewProps {
  cellsRepository?: CellsRepository;
}

export const CellsGlobalView = ({cellsRepository = container.resolve(CellsRepository)}: CellsGlobalViewProps) => {
  const {files, status: filesStatus, removeFile, pagination} = useCellsStore();

  const {searchValue, handleSearch, handleClearSearch, handleReload, pageSize, setPageSize, pageIncrement} =
    useSearchCellsFiles({
      cellsRepository,
    });

  useEffect(() => {
    void handleSearch('');
  }, []);

  const deleteFileFailedNotification = useAppNotification({
    message: t('cellsGlobalView.deleteModalError'),
  });

  const handleDeleteFile = useCallback(
    async (uuid: string) => {
      try {
        removeFile(uuid);
        await cellsRepository.deleteFile({uuid});
      } catch (error) {
        deleteFileFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleRefresh = useCallback(async () => {
    await handleReload();
  }, [handleReload]);

  const isLoading = filesStatus === 'loading';
  const isError = filesStatus === 'error';
  const isSuccess = filesStatus === 'success';
  const hasFiles = !!files.length;
  const emptySearchResults = searchValue && filesStatus === 'success' && !files.length;

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
      {(isSuccess || (pagination && isLoading)) && !emptySearchResults && (
        <CellsTable files={files} cellsRepository={cellsRepository} onDeleteFile={handleDeleteFile} />
      )}
      {!isLoading && !isError && !hasFiles && !emptySearchResults && (
        <CellsStateInfo
          heading={t('cellsGlobalView.noFilesHeading')}
          description={t('cellsGlobalView.noFilesDescription')}
        />
      )}
      {isLoading && <CellsLoader />}
      {isError && (
        <CellsStateInfo
          heading={t('cellsGlobalView.errorHeading')}
          description={t('cellsGlobalView.errorDescription')}
        />
      )}
      {!isLoading &&
        !emptySearchResults &&
        isSuccess &&
        pagination &&
        pagination.currentPage < pagination.totalPages && (
          <div css={loadMoreWrapperStyles}>
            <Button
              variant={ButtonVariant.TERTIARY}
              onClick={() => setPageSize(pageSize + pageIncrement)}
              aria-label={t('cellsGlobalView.pagination.loadMoreResults')}
            >
              {t('cellsGlobalView.pagination.loadMoreResults')}
            </Button>
          </div>
        )}
    </div>
  );
};
