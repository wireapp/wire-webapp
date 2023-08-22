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

import {TEAM_EVENT} from '@wireapp/api-client/lib/event/TeamEvent';
import {FeatureStatus, FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';
import {Permissions} from '@wireapp/api-client/lib/team/member';
import {amplify} from 'amplify';

import {randomUUID} from 'crypto';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {TeamState} from 'src/script/team/TeamState';
import {UserState} from 'src/script/user/UserState';

import {TeamEntity} from './TeamEntity';
import {TeamMemberEntity} from './TeamMemberEntity';
import {TeamService} from './TeamService';

import {AssetRepository} from '../assets/AssetRepository';
import {EventSource} from '../event/EventSource';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
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
  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.TEAM.EVENT_FROM_BACKEND);
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
    amplify.unsubscribeAll(WebAppEvents.TEAM.UPDATE_INFO);
  });

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

  describe('feature-config.update event handling', () => {
    let modalShowSpy: jest.SpyInstance;

    beforeEach(() => {
      modalShowSpy = jest.spyOn(PrimaryModal, 'show');
      modalShowSpy.mockClear();
      localStorage.clear();
    });

    it('silently update the local state if no previous state was set', async () => {
      const [teamRepository, {teamService}] = buildConnectionRepository();

      jest.spyOn(teamService, 'getAllTeamFeatures').mockResolvedValue({
        [FEATURE_KEY.FILE_SHARING]: {
          status: FeatureStatus.ENABLED,
        },
      });

      teamRepository['onTeamEvent']({type: TEAM_EVENT.FEATURE_CONFIG_UPDATE}, EventSource.WEBSOCKET);
      expect(modalShowSpy).not.toHaveBeenCalled();
    });

    it.each([
      [FEATURE_KEY.FILE_SHARING, 'featureConfigChangeModalFileSharingDescriptionItemFileSharingEnabled'],
      [FEATURE_KEY.VIDEO_CALLING, 'featureConfigChangeModalAudioVideoDescriptionItemCameraEnabled'],
      [FEATURE_KEY.SELF_DELETING_MESSAGES, 'featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled'],
      [FEATURE_KEY.CONFERENCE_CALLING, 'featureConfigChangeModalConferenceCallingEnabled'],
      [
        FEATURE_KEY.CONVERSATION_GUEST_LINKS,
        'featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksEnabled',
      ],
    ] as const)(
      'shows a modal when an update was made to a property that has local value for %s',

      async (feature, expectedString) => {
        const baseConfig = {
          [FEATURE_KEY.FILE_SHARING]: {
            status: FeatureStatus.DISABLED,
          },
          [FEATURE_KEY.VIDEO_CALLING]: {
            status: FeatureStatus.DISABLED,
          },
          [FEATURE_KEY.SELF_DELETING_MESSAGES]: {
            status: FeatureStatus.DISABLED,
            config: {enforcedTimeoutSeconds: 0},
          },
          [FEATURE_KEY.CONFERENCE_CALLING]: {
            status: FeatureStatus.DISABLED,
          },
          [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: {
            status: FeatureStatus.DISABLED,
          },
        };
        const [teamRepository, {teamService}] = buildConnectionRepository();

        jest
          .spyOn(teamService, 'getAllTeamFeatures')
          .mockResolvedValueOnce({
            ...baseConfig,
          })
          .mockResolvedValueOnce({
            ...baseConfig,
            [feature]: {
              ...baseConfig[feature],
              status: FeatureStatus.ENABLED,
            },
          });

        // Tigger a sync end to start fetching the feature config and storing it locally
        await teamRepository['updateTeamConfig'](NOTIFICATION_HANDLING_STATE.WEB_SOCKET);

        await teamRepository['onTeamEvent']({type: TEAM_EVENT.FEATURE_CONFIG_UPDATE}, EventSource.WEBSOCKET);

        expect(modalShowSpy).toHaveBeenCalledTimes(1);
        expect(modalShowSpy).toHaveBeenCalledWith(PrimaryModal.type.ACKNOWLEDGE, {
          text: expect.objectContaining({
            htmlMessage: expectedString,
          }),
        });
      },
    );
  });
});
