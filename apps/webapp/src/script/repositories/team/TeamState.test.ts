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

import {UserType} from '@wireapp/api-client/lib/user';

import {randomUUID} from 'crypto';

import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {translateForTest} from 'Util/test/translateForTest';

import {TeamEntity} from './TeamEntity';
import {TeamState} from './TeamState';

function createTeamMember(id: string, domain: string, teamId: string, type: UserType = UserType.REGULAR): User {
  const user = new User(id, domain, translateForTest);
  user.teamId = teamId;
  user.type = type;
  return user;
}

describe('TeamState', () => {
  describe('teamMembers', () => {
    it('excludes the self user, users outside the team, and app-type users', () => {
      const domain = 'example.com';
      const team = new TeamEntity(randomUUID());
      const userState = new UserState();

      const selfUser = createTeamMember('self-id', domain, team.id as string);
      selfUser.isMe = true;
      userState.self(selfUser);

      const teamState = new TeamState(userState);
      teamState.team(team);

      const regularMember = createTeamMember('member-id', domain, team.id as string);
      // Apps resolved into the shared userState.users() cache (e.g. by TeamRepository.loadTeamAppsAndCollaborators)
      // must never leak into teamMembers/teamUsers - they were never legitimately selectable team members.
      const appMember = createTeamMember('app-id', domain, team.id as string, UserType.APP);
      const outsideTeamMember = createTeamMember('outside-id', domain, randomUUID());

      userState.users([selfUser, regularMember, appMember, outsideTeamMember]);

      const teamMembers = teamState.teamMembers();

      expect(teamMembers.map(user => user.id)).toEqual([regularMember.id]);
    });
  });

  describe('teamApps and teamCollaborators', () => {
    it('default to empty arrays and can be written to directly (populated by TeamRepository.loadTeamAppsAndCollaborators)', () => {
      const userState = new UserState();
      userState.self(createTeamMember('self-id', 'example.com', randomUUID()));
      const teamState = new TeamState(userState);

      expect(teamState.teamApps()).toEqual([]);
      expect(teamState.teamCollaborators()).toEqual([]);

      const app = createTeamMember('app-id', 'example.com', randomUUID(), UserType.APP);
      const collaborator = createTeamMember('collaborator-id', 'example.com', randomUUID());

      teamState.teamApps([app]);
      teamState.teamCollaborators([collaborator]);

      expect(teamState.teamApps()).toEqual([app]);
      expect(teamState.teamCollaborators()).toEqual([collaborator]);
    });
  });
});
