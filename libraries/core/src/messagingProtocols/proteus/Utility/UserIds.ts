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

import {UserClients, QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {isUserClients, isQualifiedUserClients} from '../../../util';

interface ExtractUserIdsParams {
  userIds?: string[] | UserClients;
}
const extractUserIds = ({userIds}: ExtractUserIdsParams): string[] | undefined => {
  if (isUserClients(userIds)) {
    return Object.keys(userIds);
  }
  return userIds;
};

interface ExtractQualifiedUserIdsParams {
  userIds?: QualifiedId[] | QualifiedUserClients;
}
const extractQualifiedUserIds = ({userIds}: ExtractQualifiedUserIdsParams): QualifiedId[] | undefined => {
  if (isQualifiedUserClients(userIds)) {
    return Object.entries(userIds).reduce<QualifiedId[]>((ids, [domain, userClients]) => {
      return ids.concat(Object.keys(userClients).map(userId => ({domain, id: userId})));
    }, []);
  }
  return userIds;
};

export {extractQualifiedUserIds, extractUserIds};
