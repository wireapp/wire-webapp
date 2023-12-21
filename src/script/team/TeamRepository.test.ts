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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {FeatureList, FeatureStatus} from '@wireapp/api-client/lib/team/feature/';
import {Permissions} from '@wireapp/api-client/lib/team/member';

import {randomUUID} from 'crypto';

import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {TeamState} from 'src/script/team/TeamState';
import {UserState} from 'src/script/user/UserState';

import {TeamEntity} from './TeamEntity';
import {TeamMemberEntity} from './TeamMemberEntity';
import {TeamService} from './TeamService';

import {AssetRepository} from '../assets/AssetRepository';
import {ROLE} from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';

function buildConnectionRepository() {
  const team = new TeamEntity(randomUUID());
  const userState = new UserState();
  const selfUser = new User('self-id', 'self-domain');
  selfUser.teamId = team.id;
  selfUser.isMe = true;
  selfUser.teamRole(ROLE.NONE);
  userState.self(selfUser);

  const teamState = new TeamState(userState);
  teamState.team(team);
  const userRepository = {} as UserRepository;
  const assetRepository = {} as AssetRepository;
  const teamService = new TeamService({} as any);
  return [
    new TeamRepository(userRepository, assetRepository, teamService, userState, teamState),
    {userState, teamState, userRepository, assetRepository, teamService},
  ] as const;
}

describe('TeamRepository', () => {
  const teams_data = {
    teams: [
      {
        binding: true,
        creator: '9ca1bf41-42cd-4ee4-b54e-99e8dcc9d375',
        icon_key: '',
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
      {user: randomUUID(), permissions: {copy: Permissions.DEFAULT, self: Permissions.DEFAULT}},
      {user: randomUUID(), permissions: {copy: Permissions.DEFAULT, self: Permissions.DEFAULT}},
    ],
  };

  describe('getTeam()', () => {
    it('returns the team entity', async () => {
      const [teamRepo, {teamService}] = buildConnectionRepository();
      jest.spyOn(teamService, 'getTeamById').mockResolvedValue(team_metadata);

      jest.spyOn(teamRepo, 'getSelfMember').mockResolvedValue(new TeamMemberEntity(randomUUID()));

      const team_et = await teamRepo.getTeam();
      const [team_data] = teams_data.teams;

      expect(team_et.creator).toEqual(team_data.creator);
      expect(team_et.id).toEqual(team_data.id);
    });
  });

  describe('getAllTeamMembers()', () => {
    it('returns team member entities', async () => {
      const [teamRepo, {teamService}] = buildConnectionRepository();
      jest.spyOn(teamService, 'getAllTeamMembers').mockResolvedValue({hasMore: false, members: team_members.members});
      const entities = await teamRepo['getAllTeamMembers'](team_metadata.id);
      expect(entities.length).toEqual(team_members.members.length);
      expect(entities[0].userId).toEqual(team_members.members[0].user);
      expect(entities[0].permissions).toEqual(team_members.members[0].permissions);
    });
  });

  describe('sendAccountInfo', () => {
    it('does not crash when there is no team logo', async () => {
      const [teamRepo] = buildConnectionRepository();

      expect(teamRepo['teamState'].isTeam()).toBe(true);

      const accountInfo = await teamRepo.sendAccountInfo(true);

      expect(accountInfo.picture).toBeUndefined();
    });
  });

  describe('getTeamSupportedProtocols', () => {
    it('returns team supported protocols from mls feature config', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedTeamProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: mockedTeamProtocols}, status: FeatureStatus.ENABLED},
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual(mockedTeamProtocols);
    });

    it('returns proteus if mls feature is disabled', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedTeamProtocols = [ConversationProtocol.PROTEUS, ConversationProtocol.MLS];

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: mockedTeamProtocols}, status: FeatureStatus.DISABLED},
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([ConversationProtocol.PROTEUS]);
    });

    it('returns proteus if mls feature does not exist in team features', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: undefined,
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([ConversationProtocol.PROTEUS]);
    });

    it('returns proteus if supported protocols field does not exist on mls feature', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: undefined}, status: FeatureStatus.ENABLED},
      } as unknown as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([ConversationProtocol.PROTEUS]);
    });

    it('returns proteus if supported protocols on mls feature config is an empty list', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: []}, status: FeatureStatus.ENABLED},
      } as unknown as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([ConversationProtocol.PROTEUS]);
    });
  });
});
