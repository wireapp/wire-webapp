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
import {QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {isQualifiedIdArray} from '../../../../util';

const preKeyBundleToUserClients = (users: UserPreKeyBundleMap): UserClients => {
  return Object.entries(users).reduce<UserClients>((acc, [userId, clientsObj]) => {
    acc[userId] = Object.keys(clientsObj);
    return acc;
  }, {});
};

/**
 * Will generate a prekey bundle for specific users.
 * If a QualifiedId array is given the bundle will contain all the clients from those users fetched from the server.
 * If a QualifiedUserClients is provided then only the clients in the payload will be targeted (which could generate a ClientMismatch when sending messages)
 *
 * @param {QualifiedId[]|QualifiedUserClients} userIds - Targeted users.
 * @returns {Promise<QualifiedUserPreKeyBundleMap}
 */
interface GetQualifiedPreKeyBundleMapParams {
  apiClient: APIClient;
  userIds?: QualifiedId[] | QualifiedUserClients;
}
const getQualifiedPreKeyBundle = async ({
  apiClient,
  userIds,
}: GetQualifiedPreKeyBundleMapParams): Promise<QualifiedUserPreKeyBundleMap> => {
  type Target = {id: QualifiedId; clients?: string[]};
  let targets: Target[] = [];

  if (userIds) {
    if (isQualifiedIdArray(userIds)) {
      targets = userIds.map(id => ({id}));
    } else {
      targets = Object.entries(userIds).reduce<Target[]>((accumulator, [domain, userClients]) => {
        for (const userId in userClients) {
          accumulator.push({id: {id: userId, domain}, clients: userClients[userId]});
        }
        return accumulator;
      }, []);
    }
  }

  const preKeys = await Promise.all(
    targets.map(async ({id: userId, clients}) => {
      const prekeyBundle = await apiClient.api.user.getUserPreKeys(userId);
      // We filter the clients that should not receive the message (if a QualifiedUserClients was given as parameter)
      const userClients = clients
        ? prekeyBundle.clients.filter(client => clients.includes(client.client))
        : prekeyBundle.clients;
      return {user: userId, clients: userClients};
    }),
  );

  return preKeys.reduce<QualifiedUserPreKeyBundleMap>((bundleMap, qualifiedPrekey) => {
    bundleMap[qualifiedPrekey.user.domain] ||= {};
    for (const client of qualifiedPrekey.clients) {
      bundleMap[qualifiedPrekey.user.domain][qualifiedPrekey.user.id] ||= {};
      bundleMap[qualifiedPrekey.user.domain][qualifiedPrekey.user.id][client.client] = client.prekey;
    }
    return bundleMap;
  }, {});
};

export {getQualifiedPreKeyBundle, preKeyBundleToUserClients};
