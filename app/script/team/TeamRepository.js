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
    this.user_repository = user_repository;

    this.personal_space = new z.team.TeamEntity();
    this.teams = ko.observableArray([]);

    this.active_team = ko.observable(this.personal_space);

    this.known_team_ids = ko.pureComputed(() => this.teams().map((team_et) => team_et.id));

    amplify.subscribe(z.event.WebApp.TEAM.EVENT_FROM_BACKEND, this.on_team_event.bind(this));
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

        team_ets.forEach((team_et) => this.update_team_members(team_et));
        return this.teams();
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve teams from backend: ${error.message}`, error);
        throw error;
      });
  }

  get_team(team_id, team_ets = []) {
    const [team_local] = this.teams().filter((team_et) => team_et.id === team_id);
    if (team_local) {
      return Promise.resolve(team_local);
    }
    return this.get_team_remotely(team_id, team_ets);
  }

  get_team_remotely(team_id, team_ets = []) {
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
          const new_team_members_ets = this.team_mapper.map_member_from_array(members);
          team_members_ets = team_members_ets.concat(new_team_members_ets);
        }
        return team_members_ets;
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve members from backend: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Listener for incoming team events.
   *
   * @param {Object} event_json - JSON data for team event
   * @param {z.event.EventRepository.NOTIFICATION_SOURCE} source - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  on_team_event(event_json, source = z.event.EventRepository.NOTIFICATION_SOURCE.STREAM) {
    const type = event_json.type;

    this.logger.info(`»» Event: '${type}'`, {event_json: JSON.stringify(event_json), event_object: event_json});

    switch (type) {
      case z.event.Backend.TEAM.CONVERSATION_CREATE: {
        this._on_conversation_create(event_json);
        break;
      }
      case z.event.Backend.TEAM.CONVERSATION_DELETE: {
        this._on_conversation_delete(event_json);
        break;
      }
      case z.event.Backend.TEAM.CREATE: {
        this._on_create(event_json);
        break;
      }
      case z.event.Backend.TEAM.DELETE: {
        this._on_delete(event_json);
        break;
      }
      case z.event.Backend.TEAM.MEMBER_JOIN: {
        this._on_member_join(event_json);
        break;
      }
      case z.event.Backend.TEAM.MEMBER_LEAVE: {
        this._on_member_leave(event_json);
        break;
      }
      case z.event.Backend.TEAM.UPDATE: {
        this._on_update(event_json);
        break;
      }
      default: {
        this.logger.info('An unknown team event happened.', event_json);
      }
    }
  }

  update_team() {
    return this.team_service.put_team();
  }

  update_team_members(team_et) {
    this.get_team_members(team_et.id)
      .then((team_members) => {
        const member_ids = team_members
          .map((team_member) => {
            if (team_member.user_id !== this.user_repository.self().id) {
              return team_member.user_id;
            }
          })
          .filter((member_id) => member_id);

        return this.user_repository.get_users_by_id(member_ids);
      })
      .then((user_ets) => team_et.members(user_ets));
  }

  _add_team(team_et) {
    if (this.teams().filter((team) => team.id === team_et.id).length < 1) {
      this.teams.push(team_et);
    }
  }

  _add_user_to_team(user_et, team_et) {
    const members = team_et.members;
    if (members().filter((member) => member.id === user_et.id).length < 1) {
      members.push(user_et);
    }
  }

  _on_conversation_create(event_json) {

  }

  _on_conversation_delete(event_json) {

  }

  _on_create(event_json) {
    const team_id = event_json.team;

    this.get_team(team_id)
      .then((team_et) => {
        this._add_team(team_et);
      })
      .catch((error) => this.logger.error(`Failed to handle the created team: ${error.message}`, error));
  }

  _on_delete(event_json) {
    const team_id = event_json.team;

    this.teams.remove((team) => team.id === team_id);
    if (this.active_team().id === team_id) {
      this.active_team(this.personal_space);
    }
  }

  _on_member_join(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;

    this.get_team(team_id)
      .then((team_et) => {
        if (this.user_repository.self().id !== user_id) {
          this.user_repository.get_users_by_id([user_id]).then(([user_et]) => {
            this._add_user_to_team(user_et, team_et);
          });
        } else {
          this._add_team(team_et);
        }
      })
      .catch((error) => {
        this.logger.error(`Failed to handle the created team: ${error.message}`, error)
        throw error;
      });
  }

  _on_member_leave(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;
    const [team_of_user] = this.teams().filter((team) => team.id === team_id);

    if (!team_of_user) {
      const error_message = `Failed to handle leaving user: Could not find a team for user ${user_id}`;
      this.logger.error(error_message);
      throw error_message;
    }
    if (this.user_repository.self().id !== user_id) {
      team_of_user.members.remove((member) => member.id === user_id);
    } else {
      this.teams.remove((team_obj) => team_obj.id === team_id);
    }
  }

  _on_update(event_json) {
    const team_id = event_json.team;

    this.get_team_remotely(team_id)
      .then((team_et) => {
        this.teams.remove((team_obj) => team_obj.id === team_id);
        this._add_team(team_et);
      })
      .catch((error) => {
        this.logger.error(`Failed to handle the updated team: ${error.message}`, error)
        throw error;
      });
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
