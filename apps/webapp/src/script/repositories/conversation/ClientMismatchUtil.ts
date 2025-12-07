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

import type {MessageSendingStatus, QualifiedUserClients, UserClients} from '@wireapp/api-client/lib/conversation/';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {flattenUserMap} from '@wireapp/core/lib/conversation/message/UserClientsUtil';
import {isQualifiedUserClients} from '@wireapp/core/lib/util';
import {difference, intersection} from 'underscore';

import {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/QualifiedId';

type UserClient = {clients: string[]; userId: QualifiedId};

type ClientDiff = {
  /** List of clients that do not exist on backend anymore  */
  deletedClients: UserClient[];
  /** List users that do not have any clients left (only computed if a user list is given as input) */
  emptyUsers: User[];
  /** List of clients that are missing (only the unknown clients if a list of users is given as input) */
  missingClients: UserClient[];
  /** List of users that are missing (only computed if a user list is given as input) */
  missingUserIds: QualifiedId[];
};

/**
 * Extracts missingClients, deletedClients, deletedUsers and missingUsers from a server clients mismatch return.
 * The missingUsers and deletedUsers can only be computed is a list of users is given as input
 *
 * @param clientMismatch The client mismatch returned by the server
 * @param users? A list a users against which to match the mismatch. (if not given will dumbly flatten the given mismatch)
 */
export function extractClientDiff(
  {deleted = {}, redundant = {}, missing = {}}: Partial<MessageSendingStatus>,
  users?: User[],
  defaultDomain: string = '',
): ClientDiff {
  const allDeleted = {...deleted, ...redundant} as QualifiedUserClients;
  const deletedClients = flattenUserMap(allDeleted);
  const missingClients = flattenUserMap(missing);

  const toClientDiff = ({userId, data}: {data: string[]; userId: QualifiedId}) => ({clients: data, userId});

  const clientDiff: ClientDiff = {
    deletedClients: deletedClients.map(toClientDiff),
    emptyUsers: [],
    missingClients: missingClients.map(toClientDiff),
    missingUserIds: [],
  };
  if (!users) {
    return clientDiff;
  }

  const emptyUsers = users
    .filter(user => !user.isMe)
    .filter(user => {
      const userClients = user.devices().map(({id}) => id);
      const userDeletedClients =
        deletedClients.find(({userId}) => matchQualifiedIds(user.qualifiedId, userId))?.data || [];
      const commonDevices = intersection(userClients, userDeletedClients);
      return commonDevices.length === userClients.length;
    });

  const missingUserIds = missingClients
    .filter(({userId}) => !users.some(user => matchQualifiedIds(userId, user.qualifiedId)))
    .map(({userId}) => userId);

  const unknownMissingClients = missingClients
    .map(({userId, data}) => {
      const userDevices =
        users
          .find(user => matchQualifiedIds(user.qualifiedId, userId))
          ?.devices()
          .map(device => device.id) ?? [];
      const unknownDevices = difference(data, userDevices);
      return {data: unknownDevices, userId};
    })
    .filter(({data}) => data.length > 0);

  return {
    ...clientDiff,
    emptyUsers,
    missingClients: unknownMissingClients.map(toClientDiff),
    missingUserIds,
  };
}

type Recipients = UserClients | QualifiedUserClients;

export function findDeletedClients<T extends Recipients>(referenceRecipients: T, localRecipients: T): Recipients {
  const filterKnownClients = (clients: UserClients, knownClients: UserClients) => {
    return Object.entries(clients).reduce<UserClients>((missing, [userId, clients]) => {
      const missingClients = difference(knownClients[userId] || [], clients);
      return missingClients.length ? {...missing, [userId]: missingClients} : missing;
    }, {});
  };

  const filterKnownQualifiedClients = (clients: QualifiedUserClients, knownClients: QualifiedUserClients) => {
    return Object.entries(clients).reduce<QualifiedUserClients>((missing, [domain, userClients]) => {
      const missingUserClients = filterKnownClients(userClients, knownClients[domain]);
      return Object.keys(missingUserClients).length ? {...missing, [domain]: missingUserClients} : missing;
    }, {});
  };

  return isQualifiedUserClients(referenceRecipients)
    ? filterKnownQualifiedClients(referenceRecipients, localRecipients as QualifiedUserClients)
    : filterKnownClients(referenceRecipients, localRecipients as UserClients);
}
