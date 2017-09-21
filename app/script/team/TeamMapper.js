/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.team = z.team || {};

z.team.TeamMapper = class TeamMapper {
  constructor() {
    this.logger = new z.util.Logger('z.team.TeamMapper', z.config.LOGGER.OPTIONS);
  }

  map_team_from_object(data) {
    return this.update_team_from_object(data);
  }

  update_team_from_object(data, team_et = new z.team.TeamEntity()) {
    if (!data) {
      return;
    }

    if (data.creator) {
      team_et.creator = data.creator;
    }

    if (data.icon) {
      team_et.icon = data.icon;
    }

    if (data.icon_key) {
      team_et.icon_key = data.icon_key;
    }

    if (data.id) {
      team_et.id = data.id;
    }

    if (data.name) {
      team_et.name(data.name);
    }

    return team_et;
  }

  map_member_from_array(members_data) {
    return members_data.map(data => this.update_member_from_object(data));
  }

  map_member_from_object(data) {
    return this.update_member_from_object(data);
  }

  update_member_from_object(data, member_et = new z.team.TeamMemberEntity()) {
    if (!data) {
      return;
    }

    const {permissions, user} = data;
    if (permissions) {
      member_et.permissions = permissions;
    }

    if (user) {
      member_et.user_id = user;
    }

    return member_et;
  }
};
