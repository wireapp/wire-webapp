/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {User} from 'Repositories/entity/User';
import {matchQualifiedIds} from 'Util/qualifiedId';

export const computeParticipantDiff = (
  originalUsers: User[],
  selectedUsers: User[],
): {usersToAdd: User[]; userIdsToRemove: QualifiedId[]} => {
  const usersToAdd = selectedUsers.filter(
    selectedUser =>
      !originalUsers.some(originalUser => matchQualifiedIds(originalUser.qualifiedId, selectedUser.qualifiedId)),
  );

  const userIdsToRemove = originalUsers
    .filter(
      originalUser =>
        !selectedUsers.some(selectedUser => matchQualifiedIds(originalUser.qualifiedId, selectedUser.qualifiedId)),
    )
    .map(user => user.qualifiedId);

  return {usersToAdd, userIdsToRemove};
};
