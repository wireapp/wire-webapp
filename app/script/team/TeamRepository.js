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
    const {type = '', team: team_id = ''} = event_json;
    this.logger.info(`»» Event: '${type}'`, {event_json: JSON.stringify(event_json), event_object: event_json});

    switch (type.split('.')[1]) {
      case 'conversation-create':
        this.logger.info('A conversation was created.');
        z.conversation.ConversationRepository.update_conversations();
        break;
      case 'conversation-delete':
        this.logger.info('A conversation was deleted.');
        break;
      case 'create':
        this.logger.info('A team was created.');
        this.get_team(team_id)
          .then((team_et) => {
            this.teams.push(team_et);
          })
          .catch((error) => this.logger.error(`Failed to handle the created team: ${error.message}`, error));
        break;
      case 'delete':
        this.logger.info('A team was deleted.');
        this.teams.remove((team) => team.id === team_id);
        amplify.publish(z.event.WebApp.TEAM.DELETE_TEAM, team_id, this.personal_space);
        break;
      case 'member-join':
        this.logger.info('A member joined the team.');
        break;
      case 'member-leave':
        this.logger.info('A member left the team.');
        break;
      case 'update':
        this.logger.info('A team was updated.');
        this.get_team(team_id)
          .then((team_et) => {
            this.teams.remove((team_obj) => team_obj.id === team_id);
            this.teams.push(team_et);
          })
          .catch((error) => this.logger.error(`Failed to handle the updated team: ${error.message}`, error));
        break;
      default:
        this.logger.info('An unknown team event happened.', event_json);
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
