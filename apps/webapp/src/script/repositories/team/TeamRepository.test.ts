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

import {CollaboratorPermission, TeamCollaborator} from '@wireapp/api-client/lib/team';
import {FeatureList, FEATURE_STATUS, CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team/feature/';
import {QualifiedId, UserType} from '@wireapp/api-client/lib/user';

import {randomUUID} from 'crypto';

import {AssetRepository} from 'Repositories/assets/assetRepository';
import {User} from 'Repositories/entity/User';
import {ROLE} from 'Repositories/user/userPermission';
import {UserRepository} from 'Repositories/user/userRepository';
import {UserState} from 'Repositories/user/userState';

import {TeamEntity} from './TeamEntity';
import {TeamMemberEntity} from './TeamMemberEntity';
import {TeamRepository} from './TeamRepository';
import {TeamService} from './TeamService';
import {TeamState} from './TeamState';
import {translateForTest} from 'Util/test/translateForTest';

function buildConnectionRepository() {
  const team = new TeamEntity(randomUUID());
  const userState = new UserState();
  const selfUser = new User('self-id', 'self-domain', translateForTest);
  selfUser.teamId = team.id;
  selfUser.isMe = true;
  selfUser.teamRole(ROLE.NONE);
  userState.self(selfUser);

  const teamState = new TeamState(userState);
  teamState.team(team);
  const userRepository = {} as UserRepository;
  const assetRepository = {} as AssetRepository;
  const teamService = new TeamService({} as any);
  const onMemberDeleted = jest.fn();
  const translate = jest.fn((translationKey: string) => `translated:${translationKey}`);
  return [
    new TeamRepository(userRepository, assetRepository, onMemberDeleted, teamService, translate, userState, teamState),
    {userState, teamState, userRepository, assetRepository, teamService, translate},
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

  const services_data: {has_more: boolean; services: any[]} = {has_more: false, services: []};

  describe('getTeam()', () => {
    it('returns the team entity', async () => {
      const [teamRepo, {teamService}] = buildConnectionRepository();
      jest.spyOn(teamService, 'getTeamById').mockResolvedValue(team_metadata);
      jest.spyOn(teamService, 'getWhitelistedServices').mockResolvedValue(services_data);
      jest.spyOn(teamRepo, 'getSelfMember').mockResolvedValue(new TeamMemberEntity(randomUUID()));

      const team_et = await teamRepo.getTeam();
      const [team_data] = teams_data.teams;

      expect(team_et.creator).toEqual(team_data.creator);
      expect(team_et.id).toEqual(team_data.id);
    });
  });

  describe('initTeam', () => {
    it('updates team feature config from backend', async () => {
      const [teamRepo, {teamService, teamState}] = buildConnectionRepository();
      jest.spyOn(teamService, 'getTeamById').mockResolvedValue(team_metadata);
      jest.spyOn(teamService, 'getWhitelistedServices').mockResolvedValue(services_data);
      jest.spyOn(teamRepo, 'getSelfMember').mockResolvedValue(new TeamMemberEntity(randomUUID()));

      const localFeatures = {
        mls: {
          config: {supportedProtocols: [CONVERSATION_PROTOCOL.PROTEUS]},
          status: FEATURE_STATUS.ENABLED,
        },
      } as FeatureList;

      teamState.teamFeatures(localFeatures);

      const featuresFromBackend = {
        mls: {
          config: {supportedProtocols: [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS]},
          status: FEATURE_STATUS.ENABLED,
        },
      } as FeatureList;

      jest.spyOn(teamService, 'getAllTeamFeatures').mockResolvedValue(featuresFromBackend);

      teamRepo.on('featureConfigUpdated', update => {
        expect(update.prevFeatureList).toEqual(localFeatures);
        expect(update.newFeatureList).toEqual(featuresFromBackend);
        expect(teamState.teamFeatures()).toEqual(featuresFromBackend);
      });

      await teamRepo.initTeam();

      expect(teamState.teamFeatures()).toEqual(featuresFromBackend);
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

      const mockedTeamProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: mockedTeamProtocols}, status: FEATURE_STATUS.ENABLED},
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual(mockedTeamProtocols);
    });

    it('returns proteus if mls feature is disabled', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedTeamProtocols = [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MLS];

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: mockedTeamProtocols}, status: FEATURE_STATUS.DISABLED},
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([CONVERSATION_PROTOCOL.PROTEUS]);
    });

    it('returns proteus if mls feature does not exist in team features', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: undefined,
      } as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([CONVERSATION_PROTOCOL.PROTEUS]);
    });

    it('returns proteus if supported protocols field does not exist on mls feature', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: undefined}, status: FEATURE_STATUS.ENABLED},
      } as unknown as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([CONVERSATION_PROTOCOL.PROTEUS]);
    });

    it('returns proteus if supported protocols on mls feature config is an empty list', async () => {
      const [teamRepo, {teamState}] = buildConnectionRepository();

      const mockedFeatureList = {
        mls: {config: {supportedProtocols: []}, status: FEATURE_STATUS.ENABLED},
      } as unknown as FeatureList;

      teamState.teamFeatures(mockedFeatureList);

      const protocols = teamRepo.getTeamSupportedProtocols();

      expect(protocols).toEqual([CONVERSATION_PROTOCOL.PROTEUS]);
    });
  });

  describe('getRoleBadge', () => {
    it('uses the injected translate function', () => {
      const [teamRepo, {teamState, translate}] = buildConnectionRepository();

      teamState.memberRoles({'external-user': ROLE.PARTNER});
      teamState.memberInviters({});

      expect(teamRepo.getRoleBadge('external-user')).toBe('translated:rolePartner');
      expect(translate).toHaveBeenCalledWith('rolePartner');
    });
  });

  describe('loadTeamAppsAndCollaborators', () => {
    function createResolvedUser(id: string, domain: string, type: UserType = UserType.REGULAR): User {
      const user = new User(id, domain, translateForTest);
      user.type = type;
      return user;
    }

    it('merges team-owned apps with app-type collaborators (deduped by qualifiedId), and puts human collaborators in teamCollaborators', async () => {
      const [teamRepo, {teamState, teamService, userRepository, userState}] = buildConnectionRepository();
      const teamId = teamState.team().id as string;
      const domain = teamState.teamDomain();
      const selfId = userState.self().id;

      // Team-owned app, returned raw by GET /teams/:tid/apps and mapped via userRepository.userMapper
      const ownedApp = createResolvedUser('owned-app-id', domain, UserType.APP);
      // App-type collaborator that duplicates the owned app above - must be deduped, not double-added
      const duplicateAppCollaborator = createResolvedUser('owned-app-id', domain, UserType.APP);
      // App-type collaborator that is not otherwise a team-owned app - must be added to teamApps
      const newAppCollaborator = createResolvedUser('collab-app-id', domain, UserType.APP);
      // Human collaborator - must land in teamCollaborators, not teamApps
      const humanCollaborator = createResolvedUser('collab-human-id', domain, UserType.REGULAR);

      const rawAppsFromBackend = [{id: 'owned-app-id'}] as any[];
      const collaboratorsFromBackend: TeamCollaborator[] = [
        {user: 'owned-app-id', team: teamId, permissions: [CollaboratorPermission.CREATE_TEAM_CONVERSATION]},
        {user: 'collab-app-id', team: teamId, permissions: [CollaboratorPermission.CREATE_TEAM_CONVERSATION]},
        {user: 'collab-human-id', team: teamId, permissions: [CollaboratorPermission.IMPLICIT_CONNECTION]},
        // The self user may legitimately be a collaborator entry - it must never be resolved/re-added
        {user: selfId, team: teamId, permissions: [CollaboratorPermission.IMPLICIT_CONNECTION]},
      ];

      jest.spyOn(teamService, 'getApps').mockResolvedValue(rawAppsFromBackend as any);
      jest.spyOn(teamService, 'getCollaborators').mockResolvedValue(collaboratorsFromBackend);

      userRepository.userMapper = {mapUsersFromJson: jest.fn().mockReturnValue([ownedApp])} as any;
      const getUsersByIdMock = jest
        .fn()
        .mockResolvedValue([duplicateAppCollaborator, newAppCollaborator, humanCollaborator]);
      userRepository.getUsersById = getUsersByIdMock;

      await teamRepo.loadTeamAppsAndCollaborators(teamId);

      // Self is excluded before resolving collaborator ids into profiles
      const requestedIds = getUsersByIdMock.mock.calls[0][0] as QualifiedId[];
      expect(requestedIds).toEqual([
        {domain, id: 'owned-app-id'},
        {domain, id: 'collab-app-id'},
        {domain, id: 'collab-human-id'},
      ]);

      const teamApps = teamState.teamApps();
      expect(teamApps).toHaveLength(2);
      expect(teamApps).toEqual(expect.arrayContaining([ownedApp, newAppCollaborator]));
      expect(teamApps).not.toContain(duplicateAppCollaborator);

      expect(teamState.teamCollaborators()).toEqual([humanCollaborator]);
    });

    it('resolves nothing when the team has no apps or collaborators', async () => {
      const [teamRepo, {teamState, teamService, userRepository}] = buildConnectionRepository();
      const teamId = teamState.team().id as string;

      jest.spyOn(teamService, 'getApps').mockResolvedValue([]);
      jest.spyOn(teamService, 'getCollaborators').mockResolvedValue([]);
      userRepository.userMapper = {mapUsersFromJson: jest.fn().mockReturnValue([])} as any;
      userRepository.getUsersById = jest.fn().mockResolvedValue([]);

      await teamRepo.loadTeamAppsAndCollaborators(teamId);

      expect(teamState.teamApps()).toEqual([]);
      expect(teamState.teamCollaborators()).toEqual([]);
    });
  });
});
