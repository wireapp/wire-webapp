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

import {useAppNotification} from 'Components/AppNotification/AppNotification';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {CellsHeader} from './CellsHeader/CellsHeader';
import {CellsLoader} from './CellsLoader/CellsLoader';
import {CellsStateInfo} from './CellsStateInfo/CellsStateInfo';
import {CellsTable} from './CellsTable/CellsTable';
import {useCellsStore} from './common/useCellsStore/useCellsStore';
import {wrapperStyles} from './ConversationCells.styles';
import {useGetAllCellsFiles} from './useGetAllCellsFiles/useGetAllCellsFiles';

interface ConversationCellsProps {
  cellsRepository?: CellsRepository;
  conversationId: string;
}

export const ConversationCells = ({
  cellsRepository = container.resolve(CellsRepository),
  conversationId,
}: ConversationCellsProps) => {
  const {files, status: filesStatus, clearAll, removeFile} = useCellsStore();
  const {refresh} = useGetAllCellsFiles({cellsRepository, conversationId});

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
    [refresh],
  );

  const handleRefresh = useCallback(async () => {
    clearAll();
    await refresh();
  }, [refresh, clearAll]);

  return (
    <div css={wrapperStyles}>
      <CellsHeader onRefresh={handleRefresh} />
      {filesStatus === 'success' && !!files.length && (
        <CellsTable files={files} cellsRepository={cellsRepository} onDeleteFile={handleDeleteFile} />
      )}
      {!['loading', 'error'].includes(filesStatus) && !files.length && (
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
