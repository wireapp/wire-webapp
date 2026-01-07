/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {APIClient} from '@wireapp/api-client/lib/APIClient';
import {QualifiedUserClientMap} from '@wireapp/api-client/lib/client';
import {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {getConversationQualifiedMembers} from '../../../conversation/ConversationService/Utility/getConversationQualifiedMembers';
import {flattenUserMap, nestUsersList} from '../../../conversation/message/UserClientsUtil';
import {isQualifiedUserClients} from '../../../util';

function toQualifiedUserClients(publicClients: QualifiedUserClientMap): QualifiedUserClients {
  const userList = flattenUserMap(publicClients).map(({userId, data: clientInfo}) => ({
    userId,
    data: clientInfo.map(client => client.id),
  }));
  return nestUsersList(userList);
}

interface GetRecipientsForConversationQualifiedParams {
  apiClient: APIClient;
  conversationId: QualifiedId;
  userIds?: QualifiedId[] | QualifiedUserClients;
}

const getRecipientsForConversation = async ({
  apiClient,
  conversationId,
  userIds,
}: GetRecipientsForConversationQualifiedParams): Promise<QualifiedUserClients> => {
  if (isQualifiedUserClients(userIds)) {
    return userIds;
  }

  const hasTargetUsers = userIds && Object.keys(userIds).length > 0;
  const recipientIds = hasTargetUsers
    ? userIds
    : await getConversationQualifiedMembers({apiClient: apiClient, conversationId});
  const allClients = await apiClient.api.user.postListClients({qualified_users: recipientIds});
  return toQualifiedUserClients(allClients.qualified_user_map);
};

export {getRecipientsForConversation};
