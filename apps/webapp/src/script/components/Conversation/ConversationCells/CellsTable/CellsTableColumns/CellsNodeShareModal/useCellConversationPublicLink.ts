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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {useCellPublicLink} from 'src/script/components/Cells/common/useCellPublicLink/useCellPublicLink';

import {useCellsStore} from '../../../common/useCellsStore/useCellsStore';

interface UseCellConversationPublicLinkParams {
  uuid: string;
  conversationId: string;
  cellsRepository: CellsRepository;
}

export const useCellConversationPublicLink = ({
  uuid,
  conversationId,
  cellsRepository,
}: UseCellConversationPublicLinkParams) => {
  const {getNodes, setPublicLink} = useCellsStore();
  const nodes = getNodes({conversationId});
  const node = nodes.find(n => n.id === uuid);
  return useCellPublicLink({
    uuid,
    node,
    cellsRepository,
    setPublicLink: data => setPublicLink({conversationId, nodeId: uuid, data}),
    refreshLinkDataAfterUpdate: true,
  });
};
