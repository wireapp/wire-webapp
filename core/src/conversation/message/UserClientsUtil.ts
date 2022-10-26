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

import {QualifiedId} from '@wireapp/api-client/lib/user';

type UserClientsContainer<T> = {[userId: string]: T};
type QualifiedUserClientsContainer<T> = {[domain: string]: UserClientsContainer<T>};

export function flattenUserClients<T>(
  userClients: UserClientsContainer<T>,
  domain: string = '',
): {data: T; userId: QualifiedId}[] {
  return Object.entries(userClients).map(([id, data]) => ({data, userId: {domain, id}}));
}

/**
 * Will flatten a container of users=>clients infos to an array
 *
 * @param userClients The UserClients (qualified or not) to flatten
 * @return An array containing the qualified user Ids and the clients info
 */
export function flattenQualifiedUserClients<T = unknown>(
  userClients: QualifiedUserClientsContainer<T>,
): {data: T; userId: QualifiedId}[] {
  return Object.entries(userClients).reduce((ids, [domain, userClients]) => {
    return [...ids, ...flattenUserClients(userClients, domain)];
  }, [] as {data: T; userId: QualifiedId}[]);
}
