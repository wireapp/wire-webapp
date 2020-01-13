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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';
import {t} from 'Util/LocalizerUtil';
import {loadDataUrl} from 'Util/util';
import {sortByPriority} from 'Util/StringUtil';

import {TeamMapper} from './TeamMapper';
import {TeamService} from './TeamService';
import {TeamEntity} from './TeamEntity';
import {roleFromTeamPermissions, ROLE} from '../user/UserPermission';

import {BackendEvent} from '../event/Backend';
import {WebAppEvents} from '../event/WebApp';
import {IntegrationMapper} from '../integration/IntegrationMapper';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {SuperProperty} from '../tracking/SuperProperty';

export class TeamRepository {
  /**
   * @param {BackendClient} backendClient - Client for the API calls
   * @param {UserRepository} userRepository - Repository for all user interactions
   */
  constructor(backendClient, userRepository) {
    this.logger = getLogger('TeamRepository');

    this.teamMapper = new TeamMapper();
    this.teamService = new TeamService(backendClient);
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

    this.getRoleBadge = userId => (this.isExternal(userId) ? t('rolePartner') : '');

    this.isExternal = userId => this.memberRoles()[userId] === ROLE.PARTNER;

    this.teamName = ko.pureComputed(() => (this.isTeam() ? this.team().name() : this.selfUser().name()));
    this.teamSize = ko.pureComputed(() => (this.isTeam() ? this.teamMembers().length + 1 : 0));
    this.teamUsers = ko.pureComputed(() => {
      return this.teamMembers()
        .concat(this.userRepository.connected_users())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort((userA, userB) => sortByPriority(userA.first_name(), userB.first_name()));
    });

    this.supportsLegalHold = ko.observable(false);

    this.teamMembers.subscribe(() => this.userRepository.mapGuestStatus());
    this.teamSize.subscribe(teamSize => {
      amplify.publish(WebAppEvents.ANALYTICS.SUPER_PROPERTY, SuperProperty.TEAM.SIZE, teamSize);
    });

    this.userRepository.isTeam = this.isTeam;
    this.userRepository.teamMembers = this.teamMembers;
    this.userRepository.teamUsers = this.teamUsers;

    amplify.subscribe(WebAppEvents.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent.bind(this));
    amplify.subscribe(WebAppEvents.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  getTeam = async () => {
    const teamData = this.selfUser().teamId ? await this._getTeamById() : await this._getBindingTeam();

    if (teamData) {
      const teamEntity = this.teamMapper.mapTeamFromObject(teamData);
      this.team(teamEntity);
      await this.updateTeamMembers(teamEntity);
    } else {
      this.team(new TeamEntity());
    }
    // doesn't need to be awaited because it publishes the account info over amplify.
    this.sendAccountInfo();
    return this.team();
  };

  getTeamMember(teamId, userId) {
    return this.teamService
      .getTeamMember(teamId, userId)
      .then(memberResponse => this.teamMapper.mapMemberFromObject(memberResponse));
  }

  getTeamMembers(teamId) {
    return this.teamService.getTeamMembers(teamId).then(({members}) => {
      if (members.length) {
        return this.teamMapper.mapMemberFromArray(members);
      }
    });
  }

  getTeamConversationRoles() {
    return this.teamService.getTeamConversationRoles(this.team().id);
  }

  getWhitelistedServices(teamId, size, prefix) {
    return this.teamService.getWhitelistedServices(teamId, size, prefix).then(({services: servicesData}) => {
      return IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  /**
   * Listener for incoming team events.
   *
   * @param {Object} eventJson - JSON data for team event
   * @param {EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onTeamEvent(eventJson, source) {
    const type = eventJson.type;

    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» Team Event: '${type}' (Source: ${source})`, logObject);

    switch (type) {
      case BackendEvent.TEAM.CONVERSATION_DELETE: {
        this._onDeleteConversation(eventJson);
        break;
      }
      case BackendEvent.TEAM.DELETE: {
        this._onDelete(eventJson);
        break;
      }
      case BackendEvent.TEAM.MEMBER_JOIN: {
        this._onMemberJoin(eventJson);
        break;
      }
      case BackendEvent.TEAM.MEMBER_LEAVE: {
        this._onMemberLeave(eventJson);
        break;
      }
      case BackendEvent.TEAM.MEMBER_UPDATE: {
        this._onMemberUpdate(eventJson);
        break;
      }
      case BackendEvent.TEAM.UPDATE: {
        this._onUpdate(eventJson);
        break;
      }
      case BackendEvent.TEAM.CONVERSATION_CREATE:
      default: {
        this._onUnhandled(eventJson);
      }
    }
  }

  sendAccountInfo(isDesktop = Environment.desktop) {
    if (isDesktop) {
      const imageResource = this.isTeam() ? this.team().getIconResource() : this.selfUser().previewPictureResource();
      const imagePromise = imageResource ? imageResource.load() : Promise.resolve();

      return imagePromise
        .then(imageBlob => {
          if (imageBlob) {
            return loadDataUrl(imageBlob);
          }
        })
        .then(imageDataUrl => {
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
        });
    }
  }

  updateTeamMembers(teamEntity) {
    return this.getTeamMembers(teamEntity.id)
      .then(teamMembers => {
        this.memberRoles({});
        this.memberInviters({});
        this._updateMemberRoles(teamMembers);

        const memberIds = teamMembers
          .filter(memberEntity => {
            const isSelfUser = memberEntity.userId === this.selfUser().id;

            if (isSelfUser) {
              this.teamMapper.mapRole(this.selfUser(), memberEntity.permissions);
            }

            return !isSelfUser;
          })
          .map(memberEntity => memberEntity.userId);

        return this.userRepository.get_users_by_id(memberIds);
      })
      .then(userEntities => teamEntity.members(userEntities));
  }

  _addUserToTeam(userEntity) {
    const members = this.team().members;

    if (!members().find(member => member.id === userEntity.id)) {
      members.push(userEntity);
    }
  }

  _getTeamById() {
    return this.teamService.getTeamById(this.selfUser().teamId);
  }

  _getBindingTeam() {
    return this.teamService.getTeams().then(({teams}) => {
      const [team] = teams;
      if (team && team.binding) {
        return team;
      }
    });
  }

  _onDelete({team: teamId}) {
    if (this.isTeam() && this.team().id === teamId) {
      this.isTeamDeleted(true);
      window.setTimeout(() => {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
  }

  _onDeleteConversation({data: {conv: conversationId}}) {
    amplify.publish(WebAppEvents.CONVERSATION.DELETE, conversationId);
  }

  _onMemberJoin(eventJson) {
    const {
      data: {user: userId},
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.team().id === teamId;
    const isOtherUser = this.selfUser().id !== userId;

    if (isLocalTeam && isOtherUser) {
      this.userRepository.get_user_by_id(userId).then(userEntity => this._addUserToTeam(userEntity));
      this.getTeamMember(teamId, userId).then(members => this._updateMemberRoles(members));
    }
  }

  _onMemberLeave(eventJson) {
    const {
      data: {user: userId},
      team: teamId,
      time,
    } = eventJson;
    const isLocalTeam = this.team().id === teamId;

    if (isLocalTeam) {
      const isSelfUser = this.selfUser().id === userId;
      if (isSelfUser) {
        return this._onDelete(eventJson);
      }

      this.team().members.remove(member => member.id === userId);
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, teamId, userId, new Date(time).toISOString());
    }
  }

  _onMemberUpdate(eventJson) {
    const {
      data: {user: userId},
      permissions,
      team: teamId,
    } = eventJson;
    const isLocalTeam = this.team().id === teamId;
    const isSelfUser = this.selfUser().id === userId;

    if (isLocalTeam && isSelfUser) {
      const memberPromise = permissions ? Promise.resolve({permissions}) : this.getTeamMember(teamId, userId);

      memberPromise
        .then(memberEntity => this.teamMapper.mapRole(this.selfUser(), memberEntity.permissions))
        .then(() => this.sendAccountInfo());
    }
    if (isLocalTeam && !isSelfUser) {
      this.getTeamMember(teamId, userId).then(members => this._updateMemberRoles(members));
    }
  }

  _updateMemberRoles(memberEntities = []) {
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

  _onUnhandled(eventJson) {
    this.logger.log(`Received '${eventJson.type}' event from backend which is not yet handled`, eventJson);
  }

  _onUpdate(eventJson) {
    const {data: teamData, team: teamId} = eventJson;

    if (this.team().id === teamId) {
      this.teamMapper.updateTeamFromObject(teamData, this.team());
      this.sendAccountInfo();
    }
  }
}
