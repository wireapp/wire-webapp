/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {QualifiedUserClients, UserClients} from '@wireapp/api-client/src/conversation';
import {QualifiedId} from '@wireapp/api-client/src/user';

function isQualifiedUserClients(obj: any): obj is QualifiedUserClients {
  if (typeof obj === 'object') {
    const firstUserClientObject = Object.values(obj)?.[0];
    if (typeof firstUserClientObject === 'object') {
      const firstClientIdArray = Object.values(firstUserClientObject as object)[0];
      if (Array.isArray(firstClientIdArray)) {
        const firstClientId = firstClientIdArray[0];
        return typeof firstClientId === 'string';
      }
    }
  }
  return false;
}

function extractUserIds(userClients: UserClients, domain: string): {clients: string[]; userId: QualifiedId}[] {
  return Object.entries(userClients).map(([id, clients]) => ({clients, userId: {domain, id}}));
}

export function extractUserClientsQualifiedIds(
  userClients: UserClients | QualifiedUserClients,
): {clients: string[]; userId: QualifiedId}[] {
  if (isQualifiedUserClients(userClients)) {
    return Object.entries(userClients).reduce((ids, [domain, userClients]) => {
      return [...ids, ...extractUserIds(userClients, domain)];
    }, [] as {clients: string[]; userId: QualifiedId}[]);
  }
  return extractUserIds(userClients, '');
}
