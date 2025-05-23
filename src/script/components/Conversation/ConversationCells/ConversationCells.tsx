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
import {useGetAllCellsNodes} from './useGetAllCellsNodes/useGetAllCellsNodes';

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
  const {getNodes, status: nodesStatus, getPagination, clearAll, removeNode} = useCellsStore();

  const conversationId = conversationQualifiedId.id;

  const {refresh, setOffset} = useGetAllCellsNodes({cellsRepository, conversationQualifiedId});

  const nodes = getNodes({conversationId});
  const pagination = getPagination({conversationId});

  const {loaderHeight, updateHeight} = useCellsLoaderSize({
    nodes,
  });

  const {goToPage, getPaginationProps} = useCellsPagination({
    pagination,
    conversationId,
    setOffset,
    currentNodesCount: nodes.length,
  });

  const isLoading = nodesStatus === 'loading';
  const isError = nodesStatus === 'error';
  const isSuccess = nodesStatus === 'success';
  const hasNodes = !!nodes.length;

  const deleteFileFailedNotification = useAppNotification({
    message: t('cells.deleteModal.error'),
  });

  const handleDeleteNode = useCallback(
    async (uuid: string) => {
      try {
        removeNode({conversationId, nodeId: uuid});
        await cellsRepository.deleteNode({uuid});
      } catch (error) {
        deleteFileFailedNotification.show();
        console.error(error);
      }
    },
    // cellsRepository is not a dependency because it's a singleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, removeNode, deleteFileFailedNotification],
  );

  const handleRefresh = useCallback(async () => {
    clearAll({conversationId});
    await refresh();
  }, [refresh, clearAll, conversationId]);

  const emptyView = !isError && !hasNodes;

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
          nodes={isLoading ? [] : nodes}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          conversationName={conversationName}
          onDeleteNode={handleDeleteNode}
          onUpdateBodyHeight={updateHeight}
        />
      )}
      {!isLoading && emptyView && (
        <CellsStateInfo heading={t('cells.noFiles.heading')} description={t('cells.noFiles.description')} />
      )}
      {isLoading && <CellsLoader minHeight={loaderHeight} />}
      {isError && <CellsStateInfo heading={t('cells.error.heading')} description={t('cells.error.description')} />}
      {!emptyView && <CellsPagination {...getPaginationProps()} goToPage={goToPage} />}
    </div>
  );
};
