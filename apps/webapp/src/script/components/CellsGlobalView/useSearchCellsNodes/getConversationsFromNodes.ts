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

import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {RestNode} from 'cells-sdk-ts';

import {ConversationRepository} from 'Repositories/conversation/conversationRepository';

export const getConversationsFromNodes = async ({
  nodes,
  conversationRepository,
}: {
  nodes?: RestNode[];
  conversationRepository: ConversationRepository;
}) => {
  if (nodes === undefined || nodes.length === 0) {
    return [];
  }

  const conversationRequests = nodes.map(node => {
    return conversationRepository.getConversationById(parseQualifiedId(node.ContextWorkspace?.Uuid ?? ''));
  });

  return Promise.all(conversationRequests);
};
