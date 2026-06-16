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

import type {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {sortUsersByPriority} from 'Util/stringUtil';

export const useScheduleMeetingParticipants = (): {users: User[]} => {
  const userState = container.resolve(UserState);
  const teamState = container.resolve(TeamState);

  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);

  const contacts = useMemo(() => {
    if (!isTeam) {
      return userState.connectedUsers();
    }

    return teamState.teamMembers().toSorted(sortUsersByPriority);
  }, [isTeam, teamState, userState]);

  const users = useMemo(() => contacts.filter(user => user.isAvailable()), [contacts]);

  return {users};
};
