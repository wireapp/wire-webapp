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

window.z = window.z || {};
window.z.team = z.team || {};

z.team.TeamMapper = class TeamMapper {
  constructor() {
    this.logger = new z.util.Logger('z.team.TeamMapper', z.config.LOGGER.OPTIONS);
  }

  mapTeamFromObject(data) {
    return this.updateTeamFromObject(data);
  }

  updateTeamFromObject(teamData, teamEntity = new z.team.TeamEntity()) {
    if (teamData) {
      const {creator, icon, icon_key: iconKey, id, name} = teamData;

      if (creator) {
        teamEntity.creator = creator;
      }

      if (icon) {
        teamEntity.icon = icon;
      }

      if (iconKey) {
        teamEntity.iconKey = iconKey;
      }

      if (id) {
        teamEntity.id = id;
      }

      if (name) {
        teamEntity.name(name);
      }

      return teamEntity;
    }
  }

  mapMemberFromArray(membersData) {
    return membersData.map(data => this.updateMemberFromObject(data));
  }

  mapMemberFromObject(data) {
    return this.updateMemberFromObject(data);
  }

  mapRole(userEntity, permissions) {
    if (permissions) {
      const teamRole = z.team.TeamRole.checkRole(permissions);
      this.logger.info(`Identified user '${userEntity.id}' as '${teamRole}'`, permissions);
      userEntity.teamRole(teamRole);
    }
  }

  updateMemberFromObject(memberData, memberEntity = new z.team.TeamMemberEntity()) {
    if (memberData) {
      const {permissions, user} = memberData;
      if (permissions) {
        memberEntity.permissions = permissions;
      }

      if (user) {
        memberEntity.userId = user;
      }

      return memberEntity;
    }
  }
};
