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

import type {QualifiedUserClients} from '@wireapp/api-client/src/conversation/QualifiedUserClients';
import type {QualifiedId} from '@wireapp/api-client/src/user/QualifiedId';

export function isStringArray(obj: any): obj is string[] {
  return Array.isArray(obj) && typeof obj[0] === 'string';
}

export function isQualifiedIdArray(obj: any): obj is QualifiedId[] {
  return Array.isArray(obj) && typeof obj[0] === 'object' && typeof obj[0]['domain'] === 'string';
}

export function isQualifiedUserClients(obj: any): obj is QualifiedUserClients {
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
