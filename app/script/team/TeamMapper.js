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
    return this.update_user_from_object(new z.team.TeamEntity(), data);
  }

  update_user_from_object(entity, data) {
    entity.creator = data.creator;
    entity.icon = data.icon;
    entity.icon_key = data.icon_key;
    entity.id = data.id;
    entity.name(data.name);
    return entity;
  }
};
