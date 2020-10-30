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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {ConversationRolesList} from '@wireapp/api-client/src/conversation/ConversationRole';
import type {TeamData} from '@wireapp/api-client/src/team/team/TeamData';
import {Availability} from '@wireapp/protocol-messaging';
import {TEAM_EVENT} from '@wireapp/api-client/src/event/TeamEvent';
import type {
  TeamConversationDeleteEvent,
  TeamDeleteEvent,
  TeamEvent,
  TeamMemberJoinEvent,
  TeamMemberLeaveEvent,
  TeamMemberUpdateEvent,
  TeamUpdateEvent,
} from '@wireapp/api-client/src/event';

import {Logger, getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {loadDataUrl} from 'Util/util';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Environment} from 'Util/Environment';

import {TeamMapper} from './TeamMapper';
import {TeamEntity} from './TeamEntity';
import {roleFromTeamPermissions, ROLE} from '../user/UserPermission';

import {IntegrationMapper} from '../integration/IntegrationMapper';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {User} from '../entity/User';
import {TeamService} from './TeamService';
import {ROLE as TEAM_ROLE} from '../user/UserPermission';
import {UserRepository} from '../user/UserRepository';
import {EventRepository} from '../event/EventRepository';
import {TeamMemberEntity} from './TeamMemberEntity';
import {ServiceEntity} from '../integration/ServiceEntity';
import {AssetRepository} from '../assets/AssetRepository';
import {Runtime} from '@wireapp/commons';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';
import {TeamState} from './TeamState';

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
  private readonly logger: Logger;
  readonly teamService: TeamService;
  private readonly teamMapper: TeamMapper;
  private readonly userRepository: UserRepository;
  private readonly assetRepository: AssetRepository;

  constructor(
    teamService: TeamService,
    userRepository: UserRepository,
    assetRepository: AssetRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('TeamRepository');

    this.teamMapper = new TeamMapper();
    this.teamService = teamService;
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

    amplify.subscribe(WebAppEvents.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent.bind(this));
    amplify.subscribe(WebAppEvents.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  getRoleBadge = (userId: string): string => {
    return this.isExternal(userId) ? t('rolePartner') : '';
  };

  isExternal = (userId: string): boolean => {
    return this.teamState.memberRoles()[userId] === ROLE.PARTNER;
  };

  isSelfConnectedTo = (userId: string): boolean => {
    return (
      this.teamState.memberRoles()[userId] !== ROLE.PARTNER ||
      this.teamState.memberInviters()[userId] === this.userState.self().id
    );
  };

  initTeam = async (): Promise<void> => {
    const team = await this.getTeam();
    if (this.userState.self().teamId) {
      await this.updateTeamMembers(team);
    }
    this.scheduleFetchTeamInfo();
  };

  scheduleFetchTeamInfo = (): void => {
    window.setInterval(async () => {
      try {
        await this.getTeam();
      } catch (error) {
        this.logger.error(error);
      }
    }, TIME_IN_MILLIS.DAY);
  };

  getTeam = async (): Promise<TeamEntity> => {
    const selfTeamId = this.userState.self().teamId;
    const teamData = selfTeamId ? await this.getTeamById() : await this.getBindingTeam();

    const teamEntity = teamData ? this.teamMapper.mapTeamFromObject(teamData, this.teamState.team()) : new TeamEntity();
    this.teamState.team(teamEntity);
    if (selfTeamId) {
      await this.getSelfMember(selfTeamId);
    }
    // doesn't need to be awaited because it publishes the account info over amplify.
    this.sendAccountInfo();
    return teamEntity;
  };

  async getTeamMember(teamId: string, userId: string): Promise<TeamMemberEntity> {
    const memberResponse = await this.teamService.getTeamMember(teamId, userId);
    return this.teamMapper.mapMemberFromObject(memberResponse);
  }

  async getSelfMember(teamId: string): Promise<TeamMemberEntity> {
    const memberEntity = await this.getTeamMember(teamId, this.userState.self().id);
    this.teamMapper.mapRole(this.userState.self(), memberEntity.permissions);
    return memberEntity;
  }

  async getAllTeamMembers(teamId: string): Promise<TeamMemberEntity[] | void> {
    const {members, hasMore} = await this.teamService.getAllTeamMembers(teamId);
    if (!hasMore && members.length) {
      return this.teamMapper.mapMemberFromArray(members);
    }
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

  async getWhitelistedServices(teamId: string): Promise<ServiceEntity[]> {
    const {services: servicesData} = await this.teamService.getWhitelistedServices(teamId);
    return IntegrationMapper.mapServicesFromArray(servicesData);
  }

  onTeamEvent(eventJson: any, source: typeof EventRepository.SOURCE): void {
    const type = eventJson.type;

    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» Team Event: '${type}' (Source: ${source})`, logObject);

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
        this.onMemberUpdate(eventJson);
        break;
      }
      case TEAM_EVENT.UPDATE: {
        this.onUpdate(eventJson);
        break;
      }
      case TEAM_EVENT.CONVERSATION_CREATE:
      default: {
        this.onUnhandled(eventJson);
      }
    }
  }

  async sendAccountInfo(isDesktop: true): Promise<AccountInfo>;
  async sendAccountInfo(isDesktop?: false): Promise<void>;
  async sendAccountInfo(isDesktop = Runtime.isDesktopApp()): Promise<AccountInfo | void> {
    if (isDesktop) {
      const imageResource = this.teamState.isTeam()
        ? this.teamState.team().getIconResource()
        : this.userState.self().previewPictureResource();
      let imageDataUrl;

      if (imageResource) {
        const imageBlob = imageResource ? await this.assetRepository.load(imageResource) : undefined;
        imageDataUrl = imageBlob ? await loadDataUrl(imageBlob) : undefined;
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

      this.logger.info('Publishing account info', accountInfo);
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
    const mappedMembers = this.teamMapper.mapMemberFromArray(members);
    memberIds = mappedMembers.map(member => member.userId);

    if (!append) {
      this.teamState.memberRoles({});
      this.teamState.memberInviters({});
    }
    this.updateMemberRoles(mappedMembers);

    const selfId = this.userState.self().id;
    const includesSelfId = memberIds.includes(selfId);
    if (includesSelfId) {
      memberIds = memberIds.filter(id => id !== selfId);
      const selfMember = mappedMembers.find(({userId}) => userId === selfId);
      this.teamMapper.mapRole(this.userState.self(), selfMember.permissions);
    }

    const userEntities = await this.userRepository.getUsersById(memberIds);
    if (append) {
      const knownUserIds = teamEntity.members().map(({id}) => id);
      const newUserEntities = userEntities.filter(({id}) => !knownUserIds.includes(id));
      teamEntity.members.push(...newUserEntities);
    } else {
      teamEntity.members(userEntities);
    }
  }

  async updateTeamMembers(teamEntity: TeamEntity): Promise<void> {
    const teamMembers = await this.getAllTeamMembers(teamEntity.id);
    if (teamMembers) {
      this.teamState.memberRoles({});
      this.teamState.memberInviters({});
      this.updateMemberRoles(teamMembers);

      const memberIds = teamMembers
        .filter(memberEntity => {
          const isSelfUser = memberEntity.userId === this.userState.self().id;

          if (isSelfUser) {
            this.teamMapper.mapRole(this.userState.self(), memberEntity.permissions);
          }

          return !isSelfUser;
        })
        .map(memberEntity => memberEntity.userId);

      const userEntities = await this.userRepository.getUsersById(memberIds);
      teamEntity.members(userEntities);
    }
  }

  private addUserToTeam(userEntity: User): void {
    const members = this.teamState.team().members;

    if (!members().find(member => member.id === userEntity.id)) {
      members.push(userEntity);
    }
  }

  private getTeamById(): Promise<TeamData> {
    return this.teamService.getTeamById(this.userState.self().teamId);
  }

  private getBindingTeam(): Promise<TeamData | void> {
    return this.teamService.getTeams().then(({teams}) => {
      const [team] = teams;
      if (team && team.binding) {
        return team;
      }
      return undefined;
    });
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
    amplify.publish(WebAppEvents.CONVERSATION.DELETE, conversationId);
  }

  private _onMemberJoin(eventJson: TeamMemberJoinEvent): void {
    const {
      data: {user: userId},
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.teamState.team().id === teamId;
    const isOtherUser = this.userState.self().id !== userId;

    if (isLocalTeam && isOtherUser) {
      this.userRepository.getUserById(userId).then(userEntity => this.addUserToTeam(userEntity));
      this.getTeamMember(teamId, userId).then(member => this.updateMemberRoles(member));
    }
  }

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
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, teamId, userId, new Date(time).toISOString());
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
      this.getTeamMember(teamId, userId).then(member => this.updateMemberRoles(member));
    }
  }

  private updateMemberRoles(memberEntities: TeamMemberEntity | TeamMemberEntity[] = []): void {
    const memberArray = [].concat(memberEntities);

    const memberRoles = memberArray.reduce((accumulator, member) => {
      accumulator[member.userId] = member.permissions ? roleFromTeamPermissions(member.permissions) : ROLE.INVALID;
      return accumulator;
    }, this.teamState.memberRoles());

    const memberInvites = memberArray.reduce((accumulator, member) => {
      accumulator[member.userId] = member.invitedBy;
      return accumulator;
    }, this.teamState.memberInviters());

    const supportsLegalHold = memberArray.some(member => member.hasOwnProperty('legalholdStatus'));
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
}
