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

import TeamMapper from './TeamMapper';

window.z = window.z || {};
window.z.team = z.team || {};

z.team.TeamRepository = class TeamRepository {
  /**
   * Construct a new Team Repository.
   * @class z.team.TeamRepository
   *
   * @param {z.team.TeamService} teamService - Backend REST API team service implementation
   * @param {UserRepository} userRepository - Repository for all user interactions
   */
  constructor(teamService, userRepository) {
    this.logger = new z.util.Logger('z.team.TeamRepository', z.config.LOGGER.OPTIONS);

    this.teamMapper = new TeamMapper();
    this.teamService = teamService;
    this.userRepository = userRepository;

    this.selfUser = this.userRepository.self;

    this.team = ko.observable();

    this.isTeam = ko.pureComputed(() => (this.team() ? !!this.team().id : false));

    this.teamMembers = ko.pureComputed(() => (this.isTeam() ? this.team().members() : []));
    this.teamName = ko.pureComputed(() => (this.isTeam() ? this.team().name() : this.selfUser().name()));
    this.teamSize = ko.pureComputed(() => (this.isTeam() ? this.teamMembers().length + 1 : 0));
    this.teamUsers = ko.pureComputed(() => {
      return this.teamMembers()
        .concat(this.userRepository.connected_users())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
    });

    this.teamMembers.subscribe(() => this.userRepository.mapGuestStatus());
    this.teamSize.subscribe(teamSize => {
      amplify.publish(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, z.tracking.SuperProperty.TEAM.SIZE, teamSize);
    });

    this.userRepository.isTeam = this.isTeam;
    this.userRepository.teamMembers = this.teamMembers;
    this.userRepository.teamUsers = this.teamUsers;

    amplify.subscribe(z.event.WebApp.TEAM.EVENT_FROM_BACKEND, this.onTeamEvent.bind(this));
    amplify.subscribe(z.event.WebApp.TEAM.UPDATE_INFO, this.sendAccountInfo.bind(this));
  }

  getTeam() {
    const teamPromise = this.selfUser().teamId ? this._getTeamById() : this._getBindingTeam();
    return teamPromise
      .then(teamData => {
        if (teamData) {
          const teamEntity = this.teamMapper.mapTeamFromObject(teamData);
          this.team(teamEntity);
          return this.updateTeamMembers(teamEntity);
        }

        this.team(new z.team.TeamEntity());
      })
      .then(() => this.sendAccountInfo())
      .then(() => this.team());
  }

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

  getWhitelistedServices(teamId, size, prefix) {
    return this.teamService.getWhitelistedServices(teamId, size, prefix).then(({services: servicesData}) => {
      return z.integration.IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  /**
   * Listener for incoming team events.
   *
   * @param {Object} eventJson - JSON data for team event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onTeamEvent(eventJson, source) {
    const type = eventJson.type;

    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» Team Event: '${type}' (Source: ${source})`, logObject);

    switch (type) {
      case z.event.Backend.TEAM.CONVERSATION_CREATE:
      case z.event.Backend.TEAM.CONVERSATION_DELETE: {
        this._onUnhandled(eventJson);
        break;
      }
      case z.event.Backend.TEAM.DELETE: {
        this._onDelete(eventJson);
        break;
      }
      case z.event.Backend.TEAM.MEMBER_JOIN: {
        this._onMemberJoin(eventJson);
        break;
      }
      case z.event.Backend.TEAM.MEMBER_LEAVE: {
        this._onMemberLeave(eventJson);
        break;
      }
      case z.event.Backend.TEAM.MEMBER_UPDATE: {
        this._onMemberUpdate(eventJson);
        break;
      }
      case z.event.Backend.TEAM.UPDATE: {
        this._onUpdate(eventJson);
        break;
      }
      default: {
        this._onUnhandled(eventJson);
      }
    }
  }

  sendAccountInfo() {
    if (z.util.Environment.desktop) {
      const imageResource = this.isTeam() ? undefined : this.selfUser().previewPictureResource();
      const imagePromise = imageResource ? imageResource.load() : Promise.resolve();

      imagePromise
        .then(imageBlob => {
          if (imageBlob) {
            return z.util.loadDataUrl(imageBlob);
          }
        })
        .then(imageDataUrl => {
          const accountInfo = {
            accentID: this.selfUser().accent_id(),
            name: this.teamName(),
            picture: imageDataUrl,
            teamID: this.team().id,
            teamRole: this.selfUser().teamRole(),
            userID: this.selfUser().id,
          };

          this.logger.info('Publishing account info', accountInfo);
          amplify.publish(z.event.WebApp.TEAM.INFO, accountInfo);
        });
    }
  }

  updateTeamMembers(teamEntity) {
    return this.getTeamMembers(teamEntity.id)
      .then(teamMembers => {
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
      window.setTimeout(() => {
        amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
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
      amplify.publish(z.event.WebApp.TEAM.MEMBER_LEAVE, teamId, userId, new Date(time).toISOString());
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
};
