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

z.team.TeamRepository = class TeamRepository {
  constructor(team_service, user_repository) {
    this.logger = new z.util.Logger('z.team.TeamRepository', z.config.LOGGER.OPTIONS);
    this.team_mapper = new z.team.TeamMapper();
    this.team_service = team_service;
    this.teams = ko.observableArray([]);

    const personal_space = new z.team.TeamEntity();
    this.personal_space = personal_space;
  }

  add_members() {
    return this.team_service.post_members();
  }

  create_team() {
    return this.team_service.post_team();
  }

  delete_member() {
    return this.team_service.delete_member();
  }

  delete_team() {
    return this.team_service.delete_team();
  }

  get_members() {
    return this.team_service.get_members();
  }

  get_teams(limit = 100, team_ets = []) {
    return this.team_service.get_teams()
      .then(({teams, has_more}) => {
        if (teams.length) {
          const new_team_ets = this.team_mapper.map_teams_from_array(teams);
          team_ets = team_ets.concat(new_team_ets);
        }

        if (has_more) {
          const last_team_et = team_ets[team_ets.length - 1];
          return this.get_teams(limit, last_team_et.id, team_ets);
        }

        z.util.ko_array_push_all(this.teams, team_ets);

        return this.teams();
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve teams from backend: ${error.message}`, error);
        throw error;
      });
  }

  get_team_metadata(team_id, team_ets = []) {
    return this.team_service.get_team_metadata(team_id)
      .then((team_metadata) => {
        if (Object.keys(team_metadata).length) {
          const new_team_ets = this.team_mapper.map_team_from_object(team_metadata);
          team_ets = team_ets.concat(new_team_ets);
        }
        return team_ets[0];
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve metadata from backend: ${error.message}`, error);
        throw error;
      });
  }

  get_team_members(team_id, team_members_ets = []) {
    return this.team_service.get_team_members(team_id)
      .then(({members}) => {
        if (members.length) {
          // todo: map team member entity
          const new_team_members_ets = this.team_mapper.map_teams_from_array(members);
          team_members_ets = team_members_ets.concat(new_team_members_ets);
        }
        return team_members_ets;
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve members from backend: ${error.message}`, error);
        throw error;
      });
  }

  update_team() {
    return this.team_service.put_team();
  }

  _update_teams(team_ets) {
    return Promise.resolve()
      .then(() => {
        z.util.ko_array_push_all(this.teams, team_ets);
      })
      .then(() => {
        return team_ets;
      });
  }
};
