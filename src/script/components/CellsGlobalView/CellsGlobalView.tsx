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

import {useCallback, useMemo} from 'react';

import {container} from 'tsyringe';

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {wrapperStyles} from './CellsGlobalView.styles';
import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {useGetAllCellsFiles} from './useGetAllCellsFiles/useGetAllCellsFiles';
import {useSearchCellsFiles} from './useSearchCellsFiles/useSearchCellsFiles';

interface CellsGlobalViewProps {
  cellsRepository?: CellsRepository;
}

export const CellsGlobalView = ({cellsRepository = container.resolve(CellsRepository)}: CellsGlobalViewProps) => {
  const {files, status: filesStatus, clearAll} = useCellsStore();
  const {refresh} = useGetAllCellsFiles({cellsRepository});
  const {
    searchValue,
    searchResults,
    status: searchStatus,
    handleSearch,
    handleClearSearch,
  } = useSearchCellsFiles({
    cellsRepository,
  });

  const handleRefresh = useCallback(async () => {
    clearAll();
    await refresh();
  }, [refresh, clearAll]);

  const handleDeleteFile = useCallback(
    async (uuid: string) => {
      await cellsRepository.deleteFile({uuid});
      void refresh();
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refresh],
  );

  const filteredFiles = useMemo(() => {
    if (!searchValue || !searchResults.length) {
      return files;
    }
    return files.filter(file => searchResults.includes(file.id));
  }, [files, searchValue, searchResults]);

  const emptySearchResults = searchStatus === 'success' && !searchResults.length;

  return (
    <div css={wrapperStyles}>
      <CellsHeader
        searchValue={searchValue}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onRefresh={handleRefresh}
        searchStatus={searchStatus}
      />
      {emptySearchResults && (
        <CellsStateInfo
          heading={t('cellsGlobalView.emptySearchResultsHeading')}
          description={t('cellsGlobalView.emptySearchResultsDescription')}
        />
      )}
      {filesStatus === 'success' && !emptySearchResults && (
        <CellsTable files={filteredFiles} cellsRepository={cellsRepository} onDeleteFile={handleDeleteFile} />
      )}
      {filesStatus === 'idle' && !filteredFiles.length && (
        <CellsStateInfo
          heading={t('cellsGlobalView.noFilesHeading')}
          description={t('cellsGlobalView.noFilesDescription')}
        />
      )}
      {filesStatus === 'loading' && <CellsLoader />}
      {filesStatus === 'error' && (
        <CellsStateInfo
          heading={t('cellsGlobalView.errorHeading')}
          description={t('cellsGlobalView.errorDescription')}
        />
      )}
    </div>
  );
};
