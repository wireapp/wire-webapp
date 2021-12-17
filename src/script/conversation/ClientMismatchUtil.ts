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
import type {
  ClientMismatch,
  MessageSendingStatus,
  UserClients,
  QualifiedUserClients,
} from '@wireapp/api-client/src/conversation/';
import {
  flattenQualifiedUserClients,
  flattenUserClients,
} from '@wireapp/core/src/main/conversation/message/UserClientsUtil';
import {isQualifiedUserClients} from '@wireapp/core/src/main/util';
import {QualifiedId} from '@wireapp/api-client/src/user';
import {User} from '../entity/User';
import {intersection} from 'underscore';
import {matchQualifiedIds} from 'Util/QualifiedId';

type UserClient = {clients: string[]; userId: QualifiedId};

type ClientDiff = {
  deletedClients: UserClient[];
  emptyUsers: User[];
  missingClients: UserClient[];
  missingUserIds: QualifiedId[];
};

export function extractClientDiff(
  {deleted, redundant, missing}: Partial<ClientMismatch> | Partial<MessageSendingStatus>,
  users?: User[],
): ClientDiff {
  const allDeleted = {...deleted, ...redundant} as QualifiedUserClients | UserClients;
  const deletedClients = isQualifiedUserClients(allDeleted)
    ? flattenQualifiedUserClients(allDeleted)
    : flattenUserClients(allDeleted);
  const missingClients = isQualifiedUserClients(missing)
    ? flattenQualifiedUserClients(missing)
    : flattenUserClients(missing);

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

  const emptyUsers = users.filter(user => {
    const userClients = user.devices().map(({id}) => id);
    const userDeletedClients =
      deletedClients.find(({userId}) => matchQualifiedIds(user.qualifiedId, userId))?.data || [];
    const commonDevices = intersection(userClients, userDeletedClients);
    return commonDevices.length === userClients.length;
  });

  const missingUserIds = missingClients
    .filter(({userId}) => !users.some(user => matchQualifiedIds(userId, user.qualifiedId)))
    .map(({userId}) => userId);

  return {
    ...clientDiff,
    emptyUsers,
    missingUserIds,
  };
}
