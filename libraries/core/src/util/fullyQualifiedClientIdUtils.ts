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

import {QualifiedUserClientMap} from '@wireapp/api-client/lib/client';

type UserId = string;
type ClientId = string;
type Domain = string;
export type ClientIdStringType = `${UserId}:${ClientId}@${Domain}`;
export type ParsedFullyQualifiedId = {user: UserId; client: ClientId; domain: Domain};

export const constructFullyQualifiedClientId = (
  userId: UserId,
  clientId: ClientId,
  domain: Domain,
): ClientIdStringType => `${userId}:${clientId}@${domain}`;

export const parseFullQualifiedClientId = (qualifiedId: string): ParsedFullyQualifiedId => {
  const regexp = /([a-zA-Z0-9\-]+):([a-zA-Z0-9\-]+)@([a-zA-Z0-9\-.]+)/;
  const [, user, client, domain] = qualifiedId.match(regexp) ?? [];
  if (!user || !client || !domain) {
    throw new Error(`given client fully qualified ID is corrupted (${qualifiedId})`);
  }
  return {user, client, domain};
};

export const mapQualifiedUserClientIdsToFullyQualifiedClientIds = (qualifiedUserMap: QualifiedUserClientMap) => {
  return Object.entries(qualifiedUserMap).flatMap(([domain, users]) => {
    const clients = Object.entries(users);
    return clients.flatMap(([userId, clients]) =>
      clients.map(client => constructFullyQualifiedClientId(userId, client.id, domain)),
    );
  });
};
