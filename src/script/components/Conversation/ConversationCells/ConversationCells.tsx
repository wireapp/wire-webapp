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

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {UserRepository} from 'Repositories/user/UserRepository';
import {t} from 'Util/LocalizerUtil';

import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsPagination} from './CellsPagination/CellsPagination';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {isInRecycleBin} from './common/recycleBin/recycleBin';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {wrapperStyles} from './ConversationCells.styles';
import {useCellsPagination} from './useCellsPagination/useCellsPagination';
import {useGetAllCellsNodes} from './useGetAllCellsNodes/useGetAllCellsNodes';
import {useOnPresignedUrlExpired} from './useOnPresignedUrlExpired/useOnPresignedUrlExpired';

interface ConversationCellsProps {
  cellsRepository?: CellsRepository;
  userRepository?: UserRepository;
  conversationQualifiedId: QualifiedId;
  conversationName: string;
  cellsState: CONVERSATION_CELLS_STATE;
}

export const ConversationCells = ({
  cellsRepository = container.resolve(CellsRepository),
  userRepository = container.resolve(UserRepository),
  conversationQualifiedId,
  conversationName,
  cellsState,
}: ConversationCellsProps) => {
  const {getNodes, status: nodesStatus, getPagination} = useCellsStore();

  const conversationId = conversationQualifiedId.id;
  const isCellsStateReady = cellsState === CONVERSATION_CELLS_STATE.READY;
  const isCellsStatePending = cellsState === CONVERSATION_CELLS_STATE.PENDING;

  const {refresh, setOffset} = useGetAllCellsNodes({
    cellsRepository,
    conversationQualifiedId,
    enabled: isCellsStateReady,
    userRepository,
  });

  const nodes = getNodes({conversationId});
  const pagination = getPagination({conversationId});

  const {goToPage, getPaginationProps} = useCellsPagination({
    pagination,
    conversationId,
    setOffset,
    currentNodesCount: nodes.length,
  });

  useOnPresignedUrlExpired({conversationId, refreshCallback: refresh});

  const isLoading = nodesStatus === 'loading';
  const isError = nodesStatus === 'error';
  const isSuccess = nodesStatus === 'success';

  const hasNodes = !!nodes.length;
  const emptyView = !isError && !hasNodes && isCellsStateReady;

  const isTableVisible = (isSuccess || isLoading) && isCellsStateReady;
  const isLoadingVisible = isLoading && isCellsStateReady;
  const isNoNodesVisible = !isLoading && emptyView && !isInRecycleBin();
  const isPaginationVisible = !emptyView;
  const isEmptyRecycleBin = isInRecycleBin() && emptyView && !isLoading;

  return (
    <div css={wrapperStyles}>
      <CellsHeader
        onRefresh={refresh}
        conversationQualifiedId={conversationQualifiedId}
        conversationName={conversationName}
        cellsRepository={cellsRepository}
      />

      {isTableVisible && (
        <CellsTable
          nodes={isLoading ? [] : nodes}
          cellsRepository={cellsRepository}
          conversationQualifiedId={conversationQualifiedId}
          conversationName={conversationName}
          onRefresh={refresh}
        />
      )}
      {isCellsStatePending && (
        <CellsStateInfo heading={t('cells.pending.heading')} description={t('cells.pending.description')} />
      )}
      {isNoNodesVisible && (
        <CellsStateInfo heading={t('cells.noNodes.heading')} description={t('cells.noNodes.description')} />
      )}
      {isEmptyRecycleBin && <CellsStateInfo description={t('cells.emptyRecycleBin.description')} />}
      {isLoadingVisible && <CellsLoader />}
      {isError && <CellsStateInfo heading={t('cells.error.heading')} description={t('cells.error.description')} />}
      {isPaginationVisible && <CellsPagination {...getPaginationProps()} goToPage={goToPage} />}
    </div>
  );
};
