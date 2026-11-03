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

import {useMemo} from 'react';

import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/componentUtil';
import {sortUsersByPriority} from 'Util/stringUtil';

import type {User} from '../../../../repositories/entity/User';
import {TeamState} from '../../../../repositories/team/TeamState';
import {UserState} from '../../../../repositories/user/userState';

export const useMeetingParticipants = (): {users: User[]} => {
  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);

  const {isTeam, teamMembers} = useKoSubscribableChildren(teamState, ['isTeam', 'teamMembers']);
  const {connectedUsers} = useKoSubscribableChildren(userState, ['connectedUsers']);

  const users = useMemo(() => {
    const contacts = isTeam ? teamMembers.toSorted(sortUsersByPriority) : connectedUsers;

    return contacts.filter(user => {
      return user.isAvailable();
    });
  }, [connectedUsers, isTeam, teamMembers]);

  return {users};
};
