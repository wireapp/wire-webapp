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

type UserMap<T> = {[userId: string]: T};
type QualifiedUserMap<T> = {[domain: string]: UserMap<T>};

/**
 * Will flatten a container of domain=>users=>anything infos to an array
 *
 * @param userMap The qualified UserMap to flatten
 * @return An array containing the qualified user Ids and the clients info
 */
export function flattenUserMap<T = unknown>(userMap: QualifiedUserMap<T>): {data: T; userId: QualifiedId}[] {
  return Object.entries(userMap).reduce(
    (ids, [domain, userClients]) => {
      return [...ids, ...Object.entries(userClients).map(([id, data]) => ({data, userId: {domain, id}}))];
    },
    [] as {data: T; userId: QualifiedId}[],
  );
}

/**
 * Will convert a list of qualified users to a UserMap
 * @param users the list of users to convert
 */
export function nestUsersList<T = unknown>(users: {data: T; userId: QualifiedId}[]): QualifiedUserMap<T> {
  return users.reduce((users, {data, userId: {domain, id}}) => {
    if (!users[domain]) {
      users[domain] = {};
    }
    users[domain][id] = data;
    return users;
  }, {} as QualifiedUserMap<T>);
}
