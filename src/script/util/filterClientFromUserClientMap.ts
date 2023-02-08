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

export const filterClientsFromUserClientMap = (
  userMap: QualifiedUserClients | UserClients,
  clientsToExclude: string[],
) => {
  if (isQualifiedUserClients(userMap)) {
    return Object.keys(userMap).reduce<QualifiedUserClients>((acc, domain) => {
      const userClients = userMap[domain];
      const filteredUserClients = Object.keys(userClients).reduce<UserClients>((acc, userId) => {
        const clients = userClients[userId];
        const filteredClients = clients.filter(clientId => !clientsToExclude.includes(clientId));
        if (filteredClients.length) {
          acc[userId] = filteredClients;
        }
        return acc;
      }, {});
      if (Object.keys(filteredUserClients).length) {
        acc[domain] = filteredUserClients;
      }
      return acc;
    }, {});
  }

  return Object.keys(userMap).reduce<UserClients>((acc, userId) => {
    const clients = userMap[userId];
    const filteredClients = clients.filter(clientId => !clientsToExclude.includes(clientId));
    if (filteredClients.length) {
      acc[userId] = filteredClients;
    }
    return acc;
  }, {});
};
