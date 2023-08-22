/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {TeamState} from 'src/script/team/TeamState';
import {UserState} from 'src/script/user/UserState';

describe('TeamRepository', () => {
  const teams_data = {
    teams: [
      {
        binding: true,
        creator: '9ca1bf41-42cd-4ee4-b54e-99e8dcc9d375',
        icon_key: null,
        icon: '',
        id: 'e6d3adc5-9140-477a-abc1-8279d210ceab',
        name: 'Wire GmbH',
      },
    ],
    has_more: false,
  };
  const team_metadata = teams_data.teams[0];
  const team_members = {
    members: [
      {user: 'bac6597b-5396-4a6a-8de9-d5aa75c998bf', permissions: 4},
      {user: '74fa64dc-8318-4426-9935-82590ff8aa3e', permissions: 8},
    ],
  };

  describe('getTeam()', () => {
    it('returns the team entity', async () => {
      const userState = new UserState();
      const selfUser = new User('self-id');
      selfUser.teamId = 'e6d3adc5-9140-477a-abc1-8279d210ceab';
      selfUser.isMe = true;
      userState.self(selfUser);
      const teamService = {
        getTeamById: jest.fn(team => Promise.resolve(team_metadata)),
      };
      const teamRepo = new TeamRepository(
        teamService,
        {
          mapGuestStatus: jest.fn(),
        },
        {},
        userState,
        new TeamState(userState),
      );
      jest.spyOn(teamRepo, 'getSelfMember').mockImplementation(team => Promise.resolve(team_members.members[0]));

      const team_et = await teamRepo.getTeam();
      const [team_data] = teams_data.teams;

      expect(team_et.creator).toEqual(team_data.creator);
      expect(team_et.id).toEqual(team_data.id);
    });
  });

  describe('getAllTeamMembers()', () => {
    it('returns team member entities', async () => {
      const userState = new UserState();
      const teamService = {
        getAllTeamMembers: jest.fn(() => Promise.resolve(team_members)),
      };
      const teamRepo = new TeamRepository(teamService, {}, {}, userState, new TeamState(userState));
      const entities = await teamRepo.getAllTeamMembers(team_metadata.id);
      expect(entities.length).toEqual(team_members.members.length);
      expect(entities[0].userId).toEqual(team_members.members[0].user);
      expect(entities[0].permissions).toEqual(team_members.members[0].permissions);
    });
  });

  describe('sendAccountInfo', () => {
    it('does not crash when there is no team logo', async () => {
      const userState = new UserState();
      const selfUser = new User();
      selfUser.isMe = true;
      selfUser.teamRole('z.team.TeamRole.ROLE.NONE');
      userState.self(selfUser);
      const teamState = new TeamState(userState);
      teamState.team({
        id: 'team-id',
        members: () => [],
        getIconResource: () => {},
        name: () => 'teamName',
      });

      const teamRepo = new TeamRepository(
        {}, // TeamService,
        {}, // UserRepository,
        {}, // AssetRepository,
        userState,
        teamState,
      );
      expect(teamRepo.teamState.isTeam()).toBe(true);

      const accountInfo = await teamRepo.sendAccountInfo(true);

      expect(accountInfo.picture).toBeUndefined();
    });
  });
});
