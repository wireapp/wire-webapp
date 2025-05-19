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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsPagination} from './CellsPagination/CellsPagination';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {wrapperStyles} from './ConversationCells.styles';
import {useCellsLoaderSize} from './useCellsLoaderSize/useCellsLoaderSize';
import {useCellsPagination} from './useCellsPagination/useCellsPagination';
import {useGetAllCellsFiles} from './useGetAllCellsFiles/useGetAllCellsFiles';

interface ConversationCellsProps {
  cellsRepository?: CellsRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
}

export const ConversationCells = ({
  cellsRepository = container.resolve(CellsRepository),
  conversationQualifiedId,
  conversationName,
}: ConversationCellsProps) => {
  const {getFiles, status: filesStatus, getPagination, clearAll, removeFile} = useCellsStore();

  const conversationId = conversationQualifiedId.id;

  const {refresh, setOffset} = useGetAllCellsFiles({cellsRepository, conversationQualifiedId});

  const files = getFiles({conversationId});
  const pagination = getPagination({conversationId});

  const {loaderHeight, updateHeight} = useCellsLoaderSize({
    files,
  });

  const {goToPage, getPaginationProps} = useCellsPagination({
    pagination,
    conversationId,
    setOffset,
    currentFilesCount: files.length,
  });

  const isLoading = filesStatus === 'loading';
  const isError = filesStatus === 'error';
  const isSuccess = filesStatus === 'success';
  const hasFiles = !!files.length;

  const deleteFileFailedNotification = useAppNotification({
    message: t('cellsGlobalView.deleteModalError'),
  });

  const handleDeleteFile = useCallback(
    async (uuid: string) => {
      try {
        removeFile({conversationId, fileId: uuid});
        await cellsRepository.deleteNode({uuid});
      } catch (error) {
        deleteFileFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, removeFile, deleteFileFailedNotification],
  );

  const handleRefresh = useCallback(async () => {
    clearAll({conversationId});
    await refresh();
  }, [refresh, clearAll, conversationId]);

  const emptyView = !isError && !hasFiles;

  return (
    <div css={wrapperStyles}>
      <CellsHeader
        onRefresh={handleRefresh}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
        cellsRepository={cellsRepository}
      />
      {(isSuccess || isLoading) && (
        <CellsTable
          files={isLoading ? [] : files}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          onDeleteFile={handleDeleteFile}
          onUpdateBodyHeight={updateHeight}
        />
      )}
      {!isLoading && emptyView && (
        <CellsStateInfo
          heading={t('cellsGlobalView.noFilesHeading')}
          description={t('cellsGlobalView.noFilesDescription')}
        />
      )}
      {isLoading && <CellsLoader minHeight={loaderHeight} />}
      {isError && (
        <CellsStateInfo
          heading={t('cellsGlobalView.errorHeading')}
          description={t('cellsGlobalView.errorDescription')}
        />
      )}
      {!emptyView && <CellsPagination {...getPaginationProps()} goToPage={goToPage} />}
    </div>
  );
};
