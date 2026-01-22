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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

export function constructClientId(userId: QualifiedId, clientId: string): string {
  const id = typeof userId === 'string' ? userId : userId.id;
  const baseId = `${id}@${clientId}`;
  return userId.domain ? `${userId.domain}@${baseId}` : baseId;
}

/**
 * Splits an ID into user ID, client ID & domain (if any).
 */
export function parseClientId(id: string): {clientId: string; domain?: string; userId: string} {
  // see https://regex101.com/r/c8FtCw/1
  const regex = /((?<domain>.+)@)?(?<userId>.+)@(?<clientId>.+)$/g;
  const match = regex.exec(id);
  const {domain, userId, clientId} = match?.groups || {};
  return {clientId, domain, userId};
}
