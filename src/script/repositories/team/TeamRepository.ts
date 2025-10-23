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

import {ConversationProtocol, ConversationRolesList} from '@wireapp/api-client/lib/conversation';
import type {
  TeamConversationDeleteEvent,
  TeamDeleteEvent,
  TeamEvent,
  TeamFeatureConfigurationUpdateEvent,
  TeamMemberLeaveEvent,
} from '@wireapp/api-client/lib/event';
import {TEAM_EVENT} from '@wireapp/api-client/lib/event/TeamEvent';
import {FEATURE_KEY, FeatureList, FeatureStatus} from '@wireapp/api-client/lib/team/feature/';
import type {PermissionsData} from '@wireapp/api-client/lib/team/member/PermissionsData';
import type {TeamData} from '@wireapp/api-client/lib/team/team/TeamData';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Runtime, TypedEventEmitter} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {User} from 'Repositories/entity/User';
import {EventSource} from 'Repositories/event/EventSource';
import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import {IntegrationMapper} from 'Repositories/integration/IntegrationMapper';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {ROLE, ROLE as TEAM_ROLE, roleFromTeamPermissions} from 'Repositories/user/UserPermission';
import {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {Config} from 'src/script/Config';
import {Environment} from 'Util/Environment';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {loadDataUrl} from 'Util/util';

import {TeamEntity} from './TeamEntity';
import {TeamMapper} from './TeamMapper';
import {TeamMemberEntity} from './TeamMemberEntity';
import {TeamService} from './TeamService';
import {TeamState} from './TeamState';

import {scheduleRecurringTask, updateRemoteConfigLogger} from '../../lifecycle/updateRemoteConfigs';
import {getMLSMigrationStatus, MLSMigrationStatus} from '../../mls/MLSMigration/migrationStatus';
import {APIClient} from '../../service/APIClientSingleton';

export const HAS_PERSISTED_SUPPORTED_PROTOCOLS = 'HAS_PERSISTED_SUPPORTED_PROTOCOLS';

interface AccountInfo {
  accentID: number;
  availability?: Availability.Type;
  name: string;
  picture?: string;
  teamID?: string;
  teamRole: TEAM_ROLE;
  userID: string;
}

type Events = {
  featureConfigUpdated: {
    prevFeatureList?: FeatureList;
    newFeatureList: FeatureList;
  };
};

export class TeamRepository extends TypedEventEmitter<Events> {
  private readonly logger: Logger;
  private readonly teamMapper: TeamMapper;
  private readonly userRepository: UserRepository;
  private readonly assetRepository: AssetRepository;
  private backendSupportsMLS: boolean | null = null;

  private hasPersistedSupportedProtocols: boolean = localStorage.getItem(HAS_PERSISTED_SUPPORTED_PROTOCOLS) === 'true';

  constructor(
    userRepository: UserRepository,
    assetRepository: AssetRepository,
    private readonly onMemberDetete: () => Promise<void>,
    readonly teamService: TeamService = new TeamService(),
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    super();
    this.logger = getLogger('TeamRepository');

    this.teamMapper = new TeamMapper();
    this.assetRepository = assetRepository;
    this.userRepository = userRepository;

    this.userRepository.getTeamMembersFromUsers = this.getTeamMembersFromUsers;

    amplify.subscribe(WebAppEvents.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent);
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.updateTeamConfig);
    amplify.subscribe(WebAppEvents.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  getRoleBadge(userId: string): string {
    return this.teamState.isExternal(userId) ? t('rolePartner') : '';
  }

  isSelfConnectedTo(userId: string): boolean {
    return (
      this.teamState.memberRoles()[userId] !== ROLE.PARTNER ||
      this.teamState.memberInviters()[userId] === this.userState.self().id
    );
  }

  private updatePersistedSupportedProtocols() {
    localStorage.setItem(HAS_PERSISTED_SUPPORTED_PROTOCOLS, 'true');
  }

  /**
   * Will init the team configuration and all the team members from the contact list.
   * @param teamId the Id of the team to init
   * @param contacts all the contacts the self user has, team members will be deduced from it.
   */
  async initTeam(
    teamId?: string,
  ): Promise<{team: TeamEntity | undefined; features: FeatureList; members: QualifiedId[]}> {
    const team = await this.getTeam();
    // get the fresh feature config from backend
    const newFeatureList = await this.teamService.getAllTeamFeatures();

    this.teamState.teamFeatures(newFeatureList);

    if (newFeatureList[FEATURE_KEY.MLS]?.config?.supportedProtocols?.includes(ConversationProtocol.MLS)) {
      this.updatePersistedSupportedProtocols();
    }

    if (this.hasPersistedSupportedProtocols && newFeatureList?.[FEATURE_KEY.MLS]?.config.supportedProtocols) {
      newFeatureList[FEATURE_KEY.MLS].config.supportedProtocols = [
        ConversationProtocol.MLS,
        ConversationProtocol.PROTEUS,
      ];
    }

    if (!teamId) {
      return {team: undefined, features: {}, members: []};
    }
    // Subscribe to team members change and update the user role and guest status
    this.teamState.teamMembers.subscribe(members => {
      this.userRepository.mapGuestStatus(members);
      const roles = this.teamState.memberRoles();
      members.forEach(user => {
        if (roles[user.id]) {
          user.teamRole(roles[user.id]);
        }
      });
    });

    const members = await this.loadInitialTeamMembers(teamId);
    await this.scheduleTeamRefresh();
    return {team, features: newFeatureList, members};
  }

  private async updateFeatureConfig(): Promise<{newFeatureList: FeatureList; prevFeatureList?: FeatureList}> {
    const prevFeatureList = this.teamState.teamFeatures();
    const newFeatureList = await this.teamService.getAllTeamFeatures();

    if (
      this.hasPersistedSupportedProtocols &&
      prevFeatureList?.[FEATURE_KEY.MLS]?.config.supportedProtocols &&
      newFeatureList?.[FEATURE_KEY.MLS]?.config.supportedProtocols
    ) {
      prevFeatureList[FEATURE_KEY.MLS].config.supportedProtocols = [
        ConversationProtocol.MLS,
        ConversationProtocol.PROTEUS,
      ];

      newFeatureList[FEATURE_KEY.MLS].config.supportedProtocols = [
        ConversationProtocol.MLS,
        ConversationProtocol.PROTEUS,
      ];
    }

    this.teamState.teamFeatures(newFeatureList);

    this.emit('featureConfigUpdated', {prevFeatureList, newFeatureList});

    if (
      prevFeatureList?.[FEATURE_KEY.MLS]?.status === FeatureStatus.DISABLED &&
      newFeatureList?.[FEATURE_KEY.MLS]?.status === FeatureStatus.ENABLED
    ) {
      this.updatePersistedSupportedProtocols();
      this.showReloadAppModal();
      void this.scheduleReloadAppModal();
    }

    return {
      newFeatureList,
      prevFeatureList,
    };
  }

  private readonly scheduleTeamRefresh = async (): Promise<void> => {
    const updateTeam = async () => {
      try {
        updateRemoteConfigLogger.info('Updating team-settings');
        await this.getTeam();
        await this.updateFeatureConfig();
      } catch (error) {
        this.logger.error(error);
      }
    };

    // We want to poll the latest team data every time the app is focused and every day
    await scheduleRecurringTask({
      every: TIME_IN_MILLIS.DAY,
      task: updateTeam,
      key: 'team-refresh',
      addTaskOnWindowFocusEvent: true,
    });
  };

  private showReloadAppModal = () => {
    const replaceLinkMls = replaceLink(Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE, '', 'learn-more-mls');
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: () => window.location.reload(),
        text: t('mlsWasEnabledReload'),
      },
      text: {
        htmlMessage: t('mlsWasEnabledDescription', undefined, replaceLinkMls),
        title: t('mlsWasEnabledTitle'),
      },
    });
  };

  private readonly scheduleReloadAppModal = async (): Promise<void> => {
    // We want to encourage the user to reload every 5 minutes
    await scheduleRecurringTask({
      every: TIME_IN_MILLIS.MINUTE * 5,
      task: this.showReloadAppModal,
      key: 'reload-app-modal',
    });
  };

  private async getInitialTeamMembers(teamId: string): Promise<TeamMemberEntity[]> {
    const {members} = await this.teamService.getAllTeamMembers(teamId);
    return this.teamMapper.mapMembers(members);
  }

  /**
   * will load the first 2000 team members in order to fill the initial state of the team
   * This way a new user won't end up with an empty list of team members
   * @param teamId
   */
  private async loadInitialTeamMembers(teamId: string): Promise<QualifiedId[]> {
    const teamMembers = await this.getInitialTeamMembers(teamId);
    this.teamState.memberRoles({});
    this.teamState.memberInviters({});

    this.updateMemberRoles(teamMembers);
    return teamMembers
      .filter(({userId}) => userId !== this.userState.self().id)
      .map(memberEntity => ({domain: this.teamState.teamDomain() ?? '', id: memberEntity.userId}));
  }

  async getTeam(): Promise<TeamEntity> {
    const teamId = this.userState.self().teamId;
    const teamData = !!teamId && (await this.getTeamById(teamId));

    const teamEntity = teamData ? this.teamMapper.mapTeamFromObject(teamData, this.teamState.team()) : new TeamEntity();
    this.teamState.team(teamEntity);
    if (teamId) {
      await this.getSelfMember(teamId);
    }
    // doesn't need to be awaited because it publishes the account info over amplify.
    this.sendAccountInfo();
    return teamEntity;
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMemberEntity> {
    const memberResponse = await this.teamService.getTeamMember(teamId, userId);
    return this.teamMapper.mapMember(memberResponse);
  }

  async getSelfMember(teamId: string): Promise<TeamMemberEntity> {
    const memberEntity = await this.getTeamMember(teamId, this.userState.self().id);
    this.updateUserRole(this.userState.self(), memberEntity.permissions);
    return memberEntity;
  }

  async conversationHasGuestLinkEnabled(conversationId: string): Promise<boolean> {
    return this.teamService.conversationHasGuestLink(conversationId);
  }

  private getTeamMembersFromUsers = async (users: User[]): Promise<void> => {
    const selfTeamId = this.userState.self().teamId;
    if (!selfTeamId) {
      return;
    }
    const knownMemberIds = this.teamState.teamMembers().map(member => member.id);
    const teamUsers = users.filter(user => user.teamId === selfTeamId);
    const newTeamMembers = teamUsers.filter(user => !knownMemberIds.includes(user.id));
    const newTeamMemberIds = newTeamMembers.map(({id}) => id);
    await this.updateTeamMembersByIds(selfTeamId, newTeamMemberIds, true);
  };

  public async filterRemoteDomainUsers(users: User[]): Promise<User[]> {
    const isMLS = this.teamState.teamFeatures()?.mls?.config.defaultProtocol === ConversationProtocol.MLS;

    // IF MLS is enabled, THEN return all users
    if (isMLS) {
      return users;
    }

    const domain = this.userState.self()?.domain ?? this.teamState.teamDomain();
    const hasFederatedUsers = users.some(user => user.domain !== domain);

    if (this.backendSupportsMLS === null) {
      const apiClient = container.resolve(APIClient);
      this.backendSupportsMLS = await apiClient.supportsMLS();
    }

    // IF the backend does not support MLS, AND there are federated users, THEN return all users
    if (!this.backendSupportsMLS && hasFederatedUsers) {
      return users;
    }

    // IF the backend supports MLS, AND we use the proteus protocol, THEN filter out federated users
    return users.filter(user => {
      if (user.domain !== domain) {
        this.logger.log(`Filtering out user ${user.id} because of domain mismatch, current protocol is not MLS`);
        return false;
      }
      return true;
    });
  }

  async filterExternals(users: User[]): Promise<User[]> {
    const teamId = this.teamState.team()?.id;
    if (!teamId) {
      return users;
    }
    const userIds = users.map(({id}) => id);
    const members = await this.teamService.getTeamMembersByIds(teamId, userIds);
    return members
      .filter(member => roleFromTeamPermissions(member.permissions) !== ROLE.PARTNER)
      .map(({user}) => users.find(({id}) => id === user));
  }

  getTeamConversationRoles(): Promise<ConversationRolesList> {
    return this.teamService.getTeamConversationRoles(this.teamState.team().id);
  }

  async getWhitelistedServices(teamId: string, domain: string): Promise<ServiceEntity[]> {
    const {services: servicesData} = await this.teamService.getWhitelistedServices(teamId);
    return IntegrationMapper.mapServicesFromArray(servicesData, domain);
  }

  readonly onTeamEvent = async (eventJson: any, source: EventSource): Promise<void> => {
    if (this.teamState.isTeamDeleted()) {
      // We don't want to handle any events after the team has been deleted
      return;
    }

    const type = eventJson.type;

    this.logger.info(`Team Event: '${type}' (Source: ${source})`);

    switch (type) {
      case TEAM_EVENT.CONVERSATION_DELETE: {
        this.onDeleteConversation(eventJson);
        break;
      }
      case TEAM_EVENT.DELETE: {
        await this.onDelete(eventJson);
        break;
      }
      case TEAM_EVENT.MEMBER_LEAVE: {
        await this.onMemberLeave(eventJson);
        break;
      }
      case TEAM_EVENT.FEATURE_CONFIG_UPDATE: {
        await this.onFeatureConfigUpdate(eventJson, source);
        break;
      }
      case TEAM_EVENT.CONVERSATION_CREATE:
      default: {
        this.onUnhandled(eventJson);
      }
    }
  };

  async sendAccountInfo(isDesktop: true): Promise<AccountInfo>;
  async sendAccountInfo(isDesktop?: false): Promise<void>;
  async sendAccountInfo(isDesktop = Runtime.isDesktopApp()): Promise<AccountInfo | void> {
    if (isDesktop) {
      const imageResource = this.teamState.isTeam()
        ? this.teamState.team().getIconResource(this.teamState.teamDomain())
        : this.userState.self().previewPictureResource();
      let imageDataUrl;

      if (imageResource) {
        try {
          const imageBlob = imageResource && (await this.assetRepository.load(imageResource));

          if (imageBlob) {
            imageDataUrl = await loadDataUrl(imageBlob);
          }
        } catch (error) {
          this.logger.warn(`Account image could not be loaded`, error);
        }
      }

      const accountInfo: AccountInfo = {
        accentID: this.userState.self().accent_id(),
        name: this.teamState.teamName(),
        picture: imageDataUrl?.toString(),
        teamID: this.teamState.team() ? this.teamState.team().id : undefined,
        teamRole: this.userState.self().teamRole(),
        userID: this.userState.self().id,
      };

      const [majorVersion, minorVersion] = (Environment.version(true) || '').split('.');

      if (Number(majorVersion) >= 3 && Number(minorVersion) >= 20) {
        accountInfo.availability = this.userState.self().availability();
      }

      this.logger.log('Publishing account info', {...accountInfo, picture: null});
      amplify.publish(WebAppEvents.TEAM.INFO, accountInfo);
      return accountInfo;
    }
  }

  async updateTeamMembersByIds(teamId: string, memberIds: string[] = [], append = false): Promise<void> {
    const members = await this.teamService.getTeamMembersByIds(teamId, memberIds);
    const mappedMembers = this.teamMapper.mapMembers(members);
    const selfId = this.userState.self().id;
    memberIds = mappedMembers.map(member => member.userId).filter(id => id !== selfId);

    if (!append) {
      this.teamState.memberRoles({});
      this.teamState.memberInviters({});
    }

    this.updateMemberRoles(mappedMembers);
  }

  private getTeamById(teamId: string): Promise<TeamData> {
    return this.teamService.getTeamById(teamId);
  }

  private async onDelete(eventJson: TeamDeleteEvent | TeamMemberLeaveEvent) {
    const {team: teamId} = eventJson;
    if (this.teamState.isTeam() && this.teamState.team().id === teamId) {
      this.teamState.isTeamDeleted(true);
      await this.onMemberDetete();
    }
  }

  private onDeleteConversation(eventJson: TeamConversationDeleteEvent) {
    const {
      data: {conv: conversationId},
    } = eventJson;
    amplify.publish(WebAppEvents.CONVERSATION.DELETE, {domain: '', id: conversationId});
  }

  private readonly updateTeamConfig = async (handlingNotifications: NOTIFICATION_HANDLING_STATE): Promise<void> => {
    const shouldFetchConfig = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (shouldFetchConfig) {
      await this.updateFeatureConfig();
    }
  };

  private readonly onFeatureConfigUpdate = async (
    event: TeamFeatureConfigurationUpdateEvent,
    source: EventSource,
  ): Promise<void> => {
    if (source !== EventSource.WEBSOCKET) {
      // Ignore notification stream events
      return;
    }

    // When we receive a `feature-config.update` event, we will refetch the entire feature config
    await this.updateFeatureConfig();
  };

  private async onMemberLeave(eventJson: TeamMemberLeaveEvent) {
    const {
      data: {user: userId},
      team: teamId,
      time,
    } = eventJson;
    const isLocalTeam = this.teamState.team().id === teamId;

    if (isLocalTeam) {
      const isSelfUser = this.userState.self().id === userId;
      if (isSelfUser) {
        return this.onDelete(eventJson);
      }

      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, teamId, {domain: '', id: userId}, new Date(time).toISOString());
    }
  }

  private updateUserRole(user: User, permissions: PermissionsData): void {
    user.teamRole(roleFromTeamPermissions(permissions));
  }

  private updateMemberRoles(members: TeamMemberEntity[] = []): void {
    const memberRoles = members.reduce((accumulator, member) => {
      accumulator[member.userId] = member.permissions ? roleFromTeamPermissions(member.permissions) : ROLE.INVALID;
      return accumulator;
    }, this.teamState.memberRoles());

    const memberInvites = members.reduce((accumulator, member) => {
      if (member.invitedBy) {
        accumulator[member.userId] = member.invitedBy;
      }
      return accumulator;
    }, this.teamState.memberInviters());

    const supportsLegalHold =
      this.teamState.supportsLegalHold() || members.some(member => member.hasOwnProperty('legalholdStatus'));
    this.teamState.supportsLegalHold(supportsLegalHold);
    this.teamState.memberRoles(memberRoles);
    this.teamState.memberInviters(memberInvites);
  }

  private onUnhandled(eventJson: TeamEvent): void {
    this.logger.log(`Received '${eventJson.type}' event from backend which is not yet handled`, eventJson);
  }

  public getTeamSupportedProtocols(): ConversationProtocol[] {
    const mlsFeature = this.teamState.teamFeatures()?.mls;

    if (!mlsFeature || mlsFeature.status === FeatureStatus.DISABLED) {
      return [ConversationProtocol.PROTEUS];
    }

    const teamSupportedProtocols = mlsFeature.config.supportedProtocols;

    if (this.hasPersistedSupportedProtocols && teamSupportedProtocols?.length > 0) {
      return [...new Set([...teamSupportedProtocols, ConversationProtocol.MLS])];
    }

    // For old teams (created on some older backend versions) supportedProtocols field might not exist or be empty,
    // we fallback to proteus in this case.
    return teamSupportedProtocols && teamSupportedProtocols.length > 0
      ? teamSupportedProtocols
      : [ConversationProtocol.PROTEUS];
  }

  public readonly getTeamMLSMigrationStatus = (): MLSMigrationStatus => {
    const mlsMigrationFeature = this.teamState.teamFeatures()?.mlsMigration;

    return getMLSMigrationStatus(mlsMigrationFeature);
  };
}
