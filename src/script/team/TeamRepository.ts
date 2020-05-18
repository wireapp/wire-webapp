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

import ko from 'knockout';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {ConversationRolesList} from '@wireapp/api-client/dist/conversation/ConversationRole';
import type {TeamData} from '@wireapp/api-client/dist/team/team/TeamData';
import {TEAM_EVENT} from '@wireapp/api-client/dist/event/TeamEvent';
import type {
  TeamConversationDeleteEvent,
  TeamDeleteEvent,
  TeamEvent,
  TeamMemberJoinEvent,
  TeamMemberLeaveEvent,
  TeamMemberUpdateEvent,
  TeamUpdateEvent,
} from '@wireapp/api-client/dist/event';

import {Logger, getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';
import {loadDataUrl} from 'Util/util';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {TeamMapper} from './TeamMapper';
import {TeamEntity} from './TeamEntity';
import {roleFromTeamPermissions, ROLE} from '../user/UserPermission';

import {IntegrationMapper} from '../integration/IntegrationMapper';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {SuperProperty} from '../tracking/SuperProperty';
import type {User} from '../entity/User';
import type {TeamService} from './TeamService';
import type {ROLE as TEAM_ROLE} from '../user/UserPermission';
import type {UserRepository} from '../user/UserRepository';
import type {EventRepository} from '../event/EventRepository';
import type {TeamMemberEntity} from './TeamMemberEntity';
import type {ServiceEntity} from '../integration/ServiceEntity';

export interface AccountInfo {
  accentID: number;
  name: string;
  picture?: string | ArrayBuffer;
  teamID?: string;
  teamRole: TEAM_ROLE;
  userID: string;
}

export class TeamRepository {
  private readonly isTeamDeleted: ko.Observable<boolean>;
  private readonly logger: Logger;
  private readonly memberInviters: ko.Observable<any>;
  private readonly memberRoles: ko.Observable<any>;
  private readonly supportsLegalHold: ko.Observable<boolean>;
  private readonly teamMapper: TeamMapper;
  readonly teamMembers: ko.PureComputed<User[]>;
  private readonly teamName: ko.PureComputed<string>;
  readonly teamUsers: ko.PureComputed<User[]>;
  private readonly userRepository: UserRepository;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly selfUser: ko.Observable<User>;
  readonly team: ko.Observable<TeamEntity>;
  readonly teamService: TeamService;
  readonly teamSize: ko.PureComputed<number>;

  constructor(teamService: TeamService, userRepository: UserRepository) {
    this.logger = getLogger('TeamRepository');

    this.teamMapper = new TeamMapper();
    this.teamService = teamService;
    this.userRepository = userRepository;

    this.selfUser = this.userRepository.self;

    this.team = ko.observable();

    this.isTeam = ko.pureComputed(() => !!this.team()?.id);
    this.isTeamDeleted = ko.observable(false);

    /** Note: this does not include the self user */
    this.teamMembers = ko.pureComputed(() => (this.isTeam() ? this.team().members() : []));
    this.memberRoles = ko.observable({});
    this.memberInviters = ko.observable({});

    this.isSelfConnectedTo = userId => {
      return this.memberRoles()[userId] !== ROLE.PARTNER || this.memberInviters()[userId] === this.selfUser().id;
    };

    this.teamName = ko.pureComputed(() => (this.isTeam() ? this.team().name() : this.selfUser().name()));
    this.teamSize = ko.pureComputed(() => (this.isTeam() ? this.teamMembers().length + 1 : 0));
    this.teamUsers = ko.pureComputed(() => {
      return this.teamMembers()
        .concat(this.userRepository.connected_users())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort(sortUsersByPriority);
    });

    this.supportsLegalHold = ko.observable(false);

    this.teamMembers.subscribe(() => this.userRepository.mapGuestStatus());
    this.teamSize.subscribe(teamSize => {
      amplify.publish(WebAppEvents.ANALYTICS.SUPER_PROPERTY, SuperProperty.TEAM.SIZE, teamSize);
    });

    this.userRepository.isTeam = this.isTeam;
    this.userRepository.teamMembers = this.teamMembers;
    this.userRepository.teamUsers = this.teamUsers;
    this.userRepository.getTeamMembersFromUsers = this.getTeamMembersFromUsers;

    amplify.subscribe(WebAppEvents.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent.bind(this));
    amplify.subscribe(WebAppEvents.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  getRoleBadge = (userId: string): string => {
    return this.isExternal(userId) ? t('rolePartner') : '';
  };

  isExternal = (userId: string): boolean => {
    return this.memberRoles()[userId] === ROLE.PARTNER;
  };

  isSelfConnectedTo = (userId: string): boolean => {
    return this.memberRoles()[userId] !== ROLE.PARTNER || this.memberInviters()[userId] === this.selfUser().id;
  };

  initTeam = async (): Promise<void> => {
    const team = await this.getTeam();
    if (this.selfUser().teamId) {
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
    const selfTeamId = this.selfUser().teamId;
    const teamData = selfTeamId ? await this.getTeamById() : await this.getBindingTeam();

    const teamEntity = teamData ? this.teamMapper.mapTeamFromObject(teamData, this.team()) : new TeamEntity();
    this.team(teamEntity);
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
    const memberEntity = await this.getTeamMember(teamId, this.selfUser().id);
    this.teamMapper.mapRole(this.selfUser(), memberEntity.permissions);
    return memberEntity;
  }

  async getAllTeamMembers(teamId: string): Promise<TeamMemberEntity[] | void> {
    const {members, hasMore} = await this.teamService.getAllTeamMembers(teamId);
    if (!hasMore && members.length) {
      return this.teamMapper.mapMemberFromArray(members);
    }
  }

  getTeamMembersFromUsers = async (users: User[]): Promise<void> => {
    const selfTeamId = this.selfUser().teamId;
    if (!selfTeamId) {
      return;
    }
    const knownMemberIds = this.teamMembers().map(member => member.id);
    const teamUsers = users.filter(user => user.teamId === selfTeamId);
    const newTeamMembers = teamUsers.filter(user => !knownMemberIds.includes(user.id));
    const newTeamMemberIds = newTeamMembers.map(({id}) => id);
    await this.updateTeamMembersByIds(this.team(), newTeamMemberIds, true);
  };

  async filterExternals(users: User[]): Promise<User[]> {
    const teamId = this.team()?.id;
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
    return this.teamService.getTeamConversationRoles(this.team().id);
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
  async sendAccountInfo(isDesktop = Environment.desktop): Promise<AccountInfo | void> {
    if (isDesktop) {
      const imageResource = this.isTeam() ? this.team().getIconResource() : this.selfUser().previewPictureResource();
      let imageDataUrl;

      if (imageResource) {
        const imageBlob = imageResource ? await imageResource.load() : undefined;
        imageDataUrl = imageBlob ? await loadDataUrl(imageBlob) : undefined;
      }

      const accountInfo = {
        accentID: this.selfUser().accent_id(),
        name: this.teamName(),
        picture: imageDataUrl,
        teamID: this.team() ? this.team().id : undefined,
        teamRole: this.selfUser().teamRole(),
        userID: this.selfUser().id,
      };

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

    const members = await this.teamService.getTeamMembersByIds(teamEntity.id, memberIds);
    const mappedMembers = this.teamMapper.mapMemberFromArray(members);
    memberIds = mappedMembers.map(member => member.userId);

    if (!append) {
      this.memberRoles({});
      this.memberInviters({});
    }
    this.updateMemberRoles(mappedMembers);

    const selfId = this.selfUser().id;
    const includesSelfId = memberIds.includes(selfId);
    if (includesSelfId) {
      memberIds = memberIds.filter(id => id !== selfId);
      const selfMember = mappedMembers.find(({userId}) => userId === selfId);
      this.teamMapper.mapRole(this.selfUser(), selfMember.permissions);
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
      this.memberRoles({});
      this.memberInviters({});
      this.updateMemberRoles(teamMembers);

      const memberIds = teamMembers
        .filter(memberEntity => {
          const isSelfUser = memberEntity.userId === this.selfUser().id;

          if (isSelfUser) {
            this.teamMapper.mapRole(this.selfUser(), memberEntity.permissions);
          }

          return !isSelfUser;
        })
        .map(memberEntity => memberEntity.userId);

      const userEntities = await this.userRepository.getUsersById(memberIds);
      teamEntity.members(userEntities);
    }
  }

  private addUserToTeam(userEntity: User): void {
    const members = this.team().members;

    if (!members().find(member => member.id === userEntity.id)) {
      members.push(userEntity);
    }
  }

  private getTeamById(): Promise<TeamData> {
    return this.teamService.getTeamById(this.selfUser().teamId);
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
    if (this.isTeam() && this.team().id === teamId) {
      this.isTeamDeleted(true);
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
    const isLocalTeam = this.team().id === teamId;
    const isOtherUser = this.selfUser().id !== userId;

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
    const isLocalTeam = this.team().id === teamId;

    if (isLocalTeam) {
      const isSelfUser = this.selfUser().id === userId;
      if (isSelfUser) {
        return this.onDelete(eventJson);
      }

      this.team().members.remove(member => member.id === userId);
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, teamId, userId, new Date(time).toISOString());
    }
  }

  private async onMemberUpdate(eventJson: TeamMemberUpdateEvent): Promise<void> {
    const {
      data: {permissions, user: userId},
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.team().id === teamId;
    const isSelfUser = this.selfUser().id === userId;

    if (isLocalTeam && isSelfUser) {
      const memberEntity = permissions ? {permissions} : await this.getTeamMember(teamId, userId);
      this.teamMapper.mapRole(this.selfUser(), memberEntity.permissions);
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
    }, this.memberRoles());

    const memberInvites = memberArray.reduce((accumulator, member) => {
      accumulator[member.userId] = member.invitedBy;
      return accumulator;
    }, this.memberInviters());

    const supportsLegalHold = memberArray.some(member => member.hasOwnProperty('legalholdStatus'));
    this.supportsLegalHold(supportsLegalHold);
    this.memberRoles(memberRoles);
    this.memberInviters(memberInvites);
  }

  private onUnhandled(eventJson: TeamEvent): void {
    this.logger.log(`Received '${eventJson.type}' event from backend which is not yet handled`, eventJson);
  }

  private onUpdate(eventJson: TeamUpdateEvent): void {
    const {data: teamData, team: teamId} = eventJson;

    if (this.team().id === teamId) {
      this.teamMapper.updateTeamFromObject(teamData, this.team());
      this.sendAccountInfo();
    }
  }
}
