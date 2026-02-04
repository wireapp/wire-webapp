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

import {useAppNotification} from 'Components/AppNotification';
import {useCellsStore} from 'Components/Conversation/ConversationCells/common/useCellsStore/useCellsStore';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

const logger = getLogger('useDeleteNode');

interface UseDeleteNodeProps {
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
}

export const useDeleteNode = ({conversationQualifiedId, cellsRepository}: UseDeleteNodeProps) => {
  const {removeNode} = useCellsStore();

  const deleteFileFailedNotification = useAppNotification({
    message: t('cells.deleteModal.error'),
  });

  return {
    deleteNode: async ({uuid, permanently = false}: {uuid: string; permanently?: boolean}) => {
      try {
        removeNode({conversationId: conversationQualifiedId.id, nodeId: uuid});
        await cellsRepository.deleteNode({uuid, permanently});
      } catch (error) {
        deleteFileFailedNotification.show();
        logger.development.error('Failed to delete node', error);
      }
    },
  };
};
