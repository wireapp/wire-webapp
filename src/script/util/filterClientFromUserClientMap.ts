/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import type {QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation';
import {isQualifiedUserClients} from '@wireapp/core/lib/util';

export const removeClientFromUserClientMap = (
  userMap: QualifiedUserClients | UserClients,
  clientToExclude: {domain?: string; userId: string; clientId: string},
) => {
  if (isQualifiedUserClients(userMap)) {
    const {domain, userId} = clientToExclude;
    if (domain && userMap[domain] && userMap[domain][userId]) {
      userMap[domain][userId] = userMap[domain][userId].filter(clientId => clientId !== clientToExclude.clientId);
    }
    return userMap;
  }

  const {userId} = clientToExclude;
  if (userMap[userId]) {
    userMap[userId] = userMap[userId].filter(clientId => clientId !== clientToExclude.clientId);
  }

  return userMap;
};
