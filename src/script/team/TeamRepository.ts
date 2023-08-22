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

import {ConversationRolesList, ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import type {
  TeamConversationDeleteEvent,
  TeamDeleteEvent,
  TeamEvent,
  TeamMemberJoinEvent,
  TeamMemberLeaveEvent,
  TeamMemberUpdateEvent,
  TeamUpdateEvent,
} from '@wireapp/api-client/lib/event';
import {TEAM_EVENT} from '@wireapp/api-client/lib/event/TeamEvent';
import type {FeatureList} from '@wireapp/api-client/lib/team/feature/';
import {FeatureStatus, FEATURE_KEY, SelfDeletingTimeout} from '@wireapp/api-client/lib/team/feature/';
import type {TeamData} from '@wireapp/api-client/lib/team/team/TeamData';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Environment} from 'Util/Environment';
import {replaceLink, t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {formatDuration, TIME_IN_MILLIS} from 'Util/TimeUtil';
import {loadDataUrl} from 'Util/util';

import {TeamEntity} from './TeamEntity';
import {TeamMapper} from './TeamMapper';
import {TeamMemberEntity} from './TeamMemberEntity';
import {TeamService} from './TeamService';
import {TeamState} from './TeamState';

import {AssetRepository} from '../assets/AssetRepository';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import {User} from '../entity/User';
import {EventSource} from '../event/EventSource';
import {NOTIFICATION_HANDLING_STATE} from '../event/NotificationHandlingState';
import {IntegrationMapper} from '../integration/IntegrationMapper';
import {ServiceEntity} from '../integration/ServiceEntity';
import {MLSMigrationStatus, getMLSMigrationStatus} from '../mls/MLSMigration/migrationStatus';
import {ROLE, ROLE as TEAM_ROLE, roleFromTeamPermissions} from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

export interface AccountInfo {
  accentID: number;
  availability?: Availability.Type;
  name: string;
  picture?: string;
  teamID?: string;
  teamRole: TEAM_ROLE;
  userID: string;
}

export class TeamRepository {
  private static readonly LOCAL_STORAGE_FEATURE_CONFIG_KEY = 'FEATURE_CONFIG_KEY';
  private readonly logger: Logger;
  private readonly teamMapper: TeamMapper;
  private readonly userRepository: UserRepository;
  private readonly assetRepository: AssetRepository;

  constructor(
    userRepository: UserRepository,
    assetRepository: AssetRepository,
    readonly teamService: TeamService = new TeamService(),
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('TeamRepository');

    this.teamMapper = new TeamMapper();
    this.assetRepository = assetRepository;
    this.userRepository = userRepository;

    this.userRepository.getTeamMembersFromUsers = this.getTeamMembersFromUsers;
    this.teamState.teamMembers.subscribe(() => this.userRepository.mapGuestStatus());

    this.isSelfConnectedTo = userId => {
      return (
        this.teamState.memberRoles()[userId] !== ROLE.PARTNER ||
        this.teamState.memberInviters()[userId] === this.userState.self().id
      );
    };

    amplify.subscribe(WebAppEvents.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent);
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.updateTeamConfig);
    amplify.subscribe(WebAppEvents.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  readonly getRoleBadge = (userId: string): string => {
    return this.teamState.isExternal(userId) ? t('rolePartner') : '';
  };

  readonly isSelfConnectedTo = (userId: string): boolean => {
    return (
      this.teamState.memberRoles()[userId] !== ROLE.PARTNER ||
      this.teamState.memberInviters()[userId] === this.userState.self().id
    );
  };

  initTeam = async (
    teamId?: string,
  ): Promise<{team: TeamEntity; members: QualifiedId[]} | {team: undefined; members: never[]}> => {
    const team = await this.getTeam();
    await this.updateFeatureConfig();
    if (!teamId) {
      return {team: undefined, members: []};
    }
    const members = await this.loadTeamMembers(team);
    this.scheduleTeamRefresh();
    return {team, members};
  };

  private async updateFeatureConfig() {
    this.teamState.teamFeatures(await this.teamService.getAllTeamFeatures());
    return this.teamState.teamFeatures();
  }

  private readonly scheduleTeamRefresh = (): void => {
    window.setInterval(async () => {
      try {
        await this.getTeam();
        await this.updateFeatureConfig();
      } catch (error) {
        this.logger.error(error);
      }
    }, TIME_IN_MILLIS.DAY);
  };

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
    this.teamMapper.mapRole(this.userState.self(), memberEntity.permissions);
    return memberEntity;
  }

  private async getAllTeamMembers(teamId: string): Promise<TeamMemberEntity[]> {
    const {members, hasMore} = await this.teamService.getAllTeamMembers(teamId);
    if (!hasMore && members.length) {
      return this.teamMapper.mapMembers(members);
    }
    return [];
  }

  async conversationHasGuestLinkEnabled(conversationId: string): Promise<boolean> {
    return this.teamService.conversationHasGuestLink(conversationId);
  }

  getTeamMembersFromUsers = async (users: User[]): Promise<void> => {
    const selfTeamId = this.userState.self().teamId;
    if (!selfTeamId) {
      return;
    }
    const knownMemberIds = this.teamState.teamMembers().map(member => member.id);
    const teamUsers = users.filter(user => user.teamId === selfTeamId);
    const newTeamMembers = teamUsers.filter(user => !knownMemberIds.includes(user.id));
    const newTeamMemberIds = newTeamMembers.map(({id}) => id);
    await this.updateTeamMembersByIds(this.teamState.team(), newTeamMemberIds, true);
  };

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

  readonly onTeamEvent = async (eventJson: any, source: EventSource): void => {
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
        this.onDelete(eventJson);
        break;
      }
      case TEAM_EVENT.MEMBER_JOIN: {
        this._onMemberJoin(eventJson);
        break;
      }
      case TEAM_EVENT.MEMBER_LEAVE: {
        this.onMemberLeave(eventJson);
        break;
      }
      case TEAM_EVENT.MEMBER_UPDATE: {
        await this.onMemberUpdate(eventJson);
        break;
      }
      case TEAM_EVENT.UPDATE: {
        this.onUpdate(eventJson);
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

      this.logger.log('Publishing account info', accountInfo);
      amplify.publish(WebAppEvents.TEAM.INFO, accountInfo);
      return accountInfo;
    }
  }

  async updateTeamMembersByIds(teamEntity: TeamEntity, memberIds: string[] = [], append = false): Promise<void> {
    const teamId = teamEntity.id;
    if (!teamId) {
      return;
    }

    const members = await this.teamService.getTeamMembersByIds(teamId, memberIds);
    const mappedMembers = this.teamMapper.mapMembers(members);
    const selfId = this.userState.self().id;
    memberIds = mappedMembers.map(member => member.userId).filter(id => id !== selfId);

    if (!append) {
      this.teamState.memberRoles({});
      this.teamState.memberInviters({});
    }
    const userEntities = await this.userRepository.getUsersById(
      memberIds.map(memberId => ({domain: this.teamState.teamDomain(), id: memberId})),
    );

    if (append) {
      const knownUserIds = teamEntity.members().map(({id}) => id);
      const newUserEntities = userEntities.filter(({id}) => !knownUserIds.includes(id));
      teamEntity.members.push(...newUserEntities);
    } else {
      teamEntity.members(userEntities);
    }
    this.updateMemberRoles(teamEntity, mappedMembers);
  }

  private async loadTeamMembers(teamEntity: TeamEntity): Promise<QualifiedId[]> {
    const teamMembers = await this.getAllTeamMembers(teamEntity.id);
    this.teamState.memberRoles({});
    this.teamState.memberInviters({});

    this.updateMemberRoles(teamEntity, teamMembers);
    return teamMembers
      .filter(({userId}) => userId !== this.userState.self().id)
      .map(memberEntity => ({domain: this.teamState.teamDomain() ?? '', id: memberEntity.userId}));
  }

  private addUserToTeam(userEntity: User): void {
    const members = this.teamState.team().members;

    if (!members().find(member => member.id === userEntity.id)) {
      members.push(userEntity);
    }
  }

  private getTeamById(teamId: string): Promise<TeamData> {
    return this.teamService.getTeamById(teamId);
  }

  private onDelete(eventJson: TeamDeleteEvent | TeamMemberLeaveEvent): void {
    const {team: teamId} = eventJson;
    if (this.teamState.isTeam() && this.teamState.team().id === teamId) {
      this.teamState.isTeamDeleted(true);
      window.setTimeout(() => {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
  }

  private onDeleteConversation(eventJson: TeamConversationDeleteEvent) {
    const {
      data: {conv: conversationId},
    } = eventJson;
    amplify.publish(WebAppEvents.CONVERSATION.DELETE, {domain: '', id: conversationId});
  }

  private _onMemberJoin(eventJson: TeamMemberJoinEvent): void {
    const {
      data: {user: userId},
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.teamState.team().id === teamId;
    const isOtherUser = this.userState.self().id !== userId;

    if (isLocalTeam && isOtherUser) {
      this.userRepository
        .getUserById({domain: this.userState.self().domain, id: userId})
        .then(userEntity => this.addUserToTeam(userEntity));
      this.getTeamMember(teamId, userId).then(member => this.updateMemberRoles(this.teamState.team(), [member]));
    }
  }

  private readonly updateTeamConfig = async (handlingNotifications: NOTIFICATION_HANDLING_STATE): Promise<void> => {
    const shouldFetchConfig = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (shouldFetchConfig) {
      const featureConfigList = await this.updateFeatureConfig();
      this.handleConfigUpdate(featureConfigList);
    }
  };

  private readonly onFeatureConfigUpdate = async (
    _event: TeamEvent & {name: FEATURE_KEY},
    source: EventSource,
  ): Promise<void> => {
    if (source !== EventSource.WEBSOCKET) {
      // Ignore notification stream events
      return;
    }
    // When we receive a `feature-config.update` event, we will refetch the entire feature config
    const featureConfigList = await this.updateFeatureConfig();
    this.handleConfigUpdate(featureConfigList);
  };

  private readonly handleConfigUpdate = (featureConfigList: FeatureList) => {
    const previousConfig = this.loadPreviousFeatureConfig();

    if (previousConfig) {
      this.handleAudioVideoFeatureChange(previousConfig, featureConfigList);
      this.handleFileSharingFeatureChange(previousConfig, featureConfigList);
      this.handleSelfDeletingMessagesFeatureChange(previousConfig, featureConfigList);
      this.handleConferenceCallingFeatureChange(previousConfig, featureConfigList);
      this.handleGuestLinkFeatureChange(previousConfig, featureConfigList);
    }
    this.saveFeatureConfig(featureConfigList);
  };

  private readonly handleFileSharingFeatureChange = (
    {fileSharing: previousConfig}: FeatureList,
    {fileSharing: newConfig}: FeatureList,
  ) => {
    const hasFileSharingChanged = previousConfig?.status && previousConfig.status !== newConfig?.status;
    const hasChangedToEnabled = newConfig?.status === FeatureStatus.ENABLED;

    if (hasFileSharingChanged) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          htmlMessage: hasChangedToEnabled
            ? t('featureConfigChangeModalFileSharingDescriptionItemFileSharingEnabled')
            : t('featureConfigChangeModalFileSharingDescriptionItemFileSharingDisabled'),
          title: t('featureConfigChangeModalFileSharingHeadline', {brandName: Config.getConfig().BRAND_NAME}),
        },
      });
    }
  };

  private readonly handleGuestLinkFeatureChange = (
    {conversationGuestLinks: previousConfig}: FeatureList,
    {conversationGuestLinks: newConfig}: FeatureList,
  ) => {
    const hasGuestLinkChanged = previousConfig?.status && previousConfig?.status !== newConfig?.status;
    const hasGuestLinkChangedToEnabled = newConfig?.status === FeatureStatus.ENABLED;

    if (hasGuestLinkChanged) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          htmlMessage: hasGuestLinkChangedToEnabled
            ? t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksEnabled')
            : t('featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksDisabled'),
          title: t('featureConfigChangeModalConversationGuestLinksHeadline'),
        },
      });
    }
  };

  private readonly handleSelfDeletingMessagesFeatureChange = (
    {selfDeletingMessages: previousState}: FeatureList,
    {selfDeletingMessages: newState}: FeatureList,
  ) => {
    if (!previousState?.status) {
      return;
    }
    const previousTimeout = previousState?.config?.enforcedTimeoutSeconds * 1000;
    const newTimeout = (newState?.config?.enforcedTimeoutSeconds ?? 0) * 1000;
    const previousStatus = previousState.status;
    const newStatus = newState?.status;

    const hasTimeoutChanged = previousTimeout !== newTimeout;
    const isEnforced = newTimeout > SelfDeletingTimeout.OFF;
    const hasStatusChanged = previousStatus !== newStatus;
    const hasFeatureChanged = hasStatusChanged || hasTimeoutChanged;
    const isFeatureEnabled = newStatus === FeatureStatus.ENABLED;

    if (hasFeatureChanged) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          htmlMessage: isFeatureEnabled
            ? isEnforced
              ? t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnforced', {
                  timeout: formatDuration(newTimeout).text,
                })
              : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled')
            : t('featureConfigChangeModalSelfDeletingMessagesDescriptionItemDisabled'),
          title: t('featureConfigChangeModalSelfDeletingMessagesHeadline', {
            brandName: Config.getConfig().BRAND_NAME,
          }),
        },
      });
    }
  };

  private readonly handleAudioVideoFeatureChange = (
    {videoCalling: previousConfig}: FeatureList,
    {videoCalling: newConfig}: FeatureList,
  ) => {
    const hasVideoCallingChanged = previousConfig?.status && previousConfig.status !== newConfig?.status;
    const hasChangedToEnabled = newConfig?.status === FeatureStatus.ENABLED;

    if (hasVideoCallingChanged) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          htmlMessage: hasChangedToEnabled
            ? t('featureConfigChangeModalAudioVideoDescriptionItemCameraEnabled')
            : t('featureConfigChangeModalAudioVideoDescriptionItemCameraDisabled'),
          title: t('featureConfigChangeModalAudioVideoHeadline', {brandName: Config.getConfig().BRAND_NAME}),
        },
      });
    }
  };

  private readonly handleConferenceCallingFeatureChange = (
    {conferenceCalling: previousConfig}: FeatureList,
    {conferenceCalling: newConfig}: FeatureList,
  ) => {
    if (previousConfig?.status && previousConfig.status !== newConfig?.status) {
      const hasChangedToEnabled = newConfig?.status === FeatureStatus.ENABLED;
      if (hasChangedToEnabled) {
        const replaceEnterprise = replaceLink(
          Config.getConfig().URL.PRICING,
          'modal__text__read-more',
          'read-more-pricing',
        );
        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
          text: {
            htmlMessage: t(
              'featureConfigChangeModalConferenceCallingEnabled',
              {brandName: Config.getConfig().BRAND_NAME},
              replaceEnterprise,
            ),
            title: t('featureConfigChangeModalConferenceCallingTitle', {brandName: Config.getConfig().BRAND_NAME}),
          },
        });
      }
    }
  };

  private readonly loadPreviousFeatureConfig = (): FeatureList | void => {
    const featureConfigs: {[selfId: string]: FeatureList} = JSON.parse(
      window.localStorage.getItem(TeamRepository.LOCAL_STORAGE_FEATURE_CONFIG_KEY) ?? '{}',
    );
    if (featureConfigs && featureConfigs[this.userState.self().id]) {
      return featureConfigs[this.userState.self().id];
    }
  };

  private readonly saveFeatureConfig = (featureConfigList: FeatureList): void =>
    window.localStorage.setItem(
      TeamRepository.LOCAL_STORAGE_FEATURE_CONFIG_KEY,
      JSON.stringify({[this.userState.self().id]: featureConfigList}),
    );

  private onMemberLeave(eventJson: TeamMemberLeaveEvent): void {
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

      this.teamState.team().members.remove(member => member.id === userId);
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, teamId, {domain: '', id: userId}, new Date(time).toISOString());
    }
  }

  private async onMemberUpdate(eventJson: TeamMemberUpdateEvent): Promise<void> {
    const {
      data: {permissions, user: userId},
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.teamState.team().id === teamId;
    const isSelfUser = this.userState.self().id === userId;

    if (isLocalTeam && isSelfUser) {
      const memberEntity = permissions ? {permissions} : await this.getTeamMember(teamId, userId);
      this.teamMapper.mapRole(this.userState.self(), memberEntity.permissions);
      await this.sendAccountInfo();
    }
    if (isLocalTeam && !isSelfUser) {
      const member = await this.getTeamMember(teamId, userId);
      this.updateMemberRoles(this.teamState.team(), [member]);
    }
  }

  private updateMemberRoles(team: TeamEntity, members: TeamMemberEntity[] = []): void {
    members.forEach(member => {
      const user = team.members().find(({id}) => member.userId === id);
      if (user) {
        this.teamMapper.mapRole(user, member.permissions);
      }
    });

    const memberRoles = members.reduce((accumulator, member) => {
      accumulator[member.userId] = member.permissions ? roleFromTeamPermissions(member.permissions) : ROLE.INVALID;
      return accumulator;
    }, this.teamState.memberRoles());

    const memberInvites = members.reduce((accumulator, member) => {
      accumulator[member.userId] = member.invitedBy;
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

  private onUpdate(eventJson: TeamUpdateEvent): void {
    const {data: teamData, team: teamId} = eventJson;

    if (this.teamState.team().id === teamId) {
      this.teamMapper.updateTeamFromObject(teamData, this.teamState.team());
      this.sendAccountInfo();
    }
  }

  public getTeamSupportedProtocols(): ConversationProtocol[] {
    const mlsFeature = this.teamState.teamFeatures().mls;

    if (!mlsFeature || mlsFeature.status === FeatureStatus.DISABLED) {
      return [ConversationProtocol.PROTEUS];
    }

    return mlsFeature.config.supportedProtocols;
  }

  public getTeamMLSMigrationStatus(): MLSMigrationStatus {
    const mlsMigrationFeature = this.teamState.teamFeatures().mlsMigration;

    return getMLSMigrationStatus(mlsMigrationFeature);
  }
}
