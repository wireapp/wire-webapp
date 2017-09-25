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
  /**
   * Construct a new Team Repository.
   * @class z.team.TeamRepository
   *
   * @param {z.team.TeamService} team_service - Backend REST API team service implementation
   * @param {z.user.UserRepository} user_repository - epository for all user and connection interactions
   */
  constructor(team_service, user_repository) {
    this.logger = new z.util.Logger('z.team.TeamRepository', z.config.LOGGER.OPTIONS);

    this.team_mapper = new z.team.TeamMapper();
    this.team_service = team_service;
    this.user_repository = user_repository;

    this.self_user = this.user_repository.self;

    this.team = ko.observable();

    this.is_team = ko.pureComputed(() => (this.team() ? !!this.team().id : false));

    this.team_members = ko.pureComputed(() => (this.is_team() ? this.team().members() : []));
    this.team_name = ko.pureComputed(() => (this.is_team() ? this.team().name() : this.user_repository.self().name()));
    this.team_users = ko.pureComputed(() => {
      return this.team_members()
        .concat(this.user_repository.connected_users())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort((user_a, user_b) => z.util.StringUtil.sort_by_priority(user_a.first_name(), user_b.first_name()));
    });

    this.team_members.subscribe(() => this.user_repository.map_guest_status());

    this.user_repository.is_team = this.is_team;
    this.user_repository.team_members = this.team_members;
    this.user_repository.team_users = this.team_users;

    amplify.subscribe(z.event.WebApp.TEAM.EVENT_FROM_BACKEND, this.on_team_event.bind(this));
    amplify.subscribe(z.event.WebApp.TEAM.UPDATE_INFO, this.send_account_info.bind(this));
  }

  get_team() {
    return this.team_service
      .get_teams()
      .then(({teams}) => {
        if (teams.length) {
          const [team] = teams;

          if (team.binding) {
            const team_et = this.team_mapper.map_team_from_object(team);
            this.team(team_et);
            return this.update_team_members(team_et);
          }
        }

        return this.team(new z.team.TeamEntity());
      })
      .then(() => {
        this.send_account_info();
        return this.team();
      });
  }

  get_team_members(team_id) {
    return this.team_service.get_team_members(team_id).then(({members}) => {
      if (members.length) {
        return this.team_mapper.map_member_from_array(members);
      }
    });
  }

  /**
   * Listener for incoming team events.
   *
   * @param {Object} event_json - JSON data for team event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  on_team_event(event_json, source) {
    const type = event_json.type;

    this.logger.info(`»» Team Event: '${type}' (Source: ${source})`, {
      event_json: JSON.stringify(event_json),
      event_object: event_json,
    });

    switch (type) {
      case z.event.Backend.TEAM.CONVERSATION_CREATE:
      case z.event.Backend.TEAM.CONVERSATION_DELETE:
      case z.event.Backend.TEAM.MEMBER_UPDATE: {
        this._on_unhandled(event_json);
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
        this._on_unhandled(event_json);
      }
    }
  }

  /**
   * Search for user.
   * @param {string} query - Find user by name or handle
   * @param {boolean} is_handle - Query string is handle
   * @returns {Array<z.entity.User>} Matching users
   */
  search_for_team_users(query, is_handle) {
    return this.team_users()
      .filter(user_et => user_et.matches(query, is_handle))
      .sort((user_a, user_b) => {
        if (is_handle) {
          return z.util.StringUtil.sort_by_priority(user_a.username(), user_b.username(), query);
        }
        return z.util.StringUtil.sort_by_priority(user_a.name(), user_b.name(), query);
      });
  }

  send_account_info() {
    if (z.util.Environment.desktop) {
      const image_resource = this.is_team()
        ? this.self_user().preview_picture_resource()
        : this.self_user().preview_picture_resource();
      const image_promise = image_resource ? image_resource.load() : Promise.resolve();

      image_promise
        .then(image_blob => {
          if (image_blob) {
            return z.util.load_data_url(image_blob);
          }
        })
        .then(image_data_url => {
          const account_info = {
            accentID: this.self_user().accent_id(),
            name: this.team_name(),
            picture: image_data_url,
            teamID: this.team().id,
            userID: this.self_user().id,
          };

          this.logger.info('Publishing account info', account_info);
          amplify.publish(z.event.WebApp.TEAM.INFO, account_info);
        });
    }
  }

  update_team_members(team_et) {
    return this.get_team_members(team_et.id)
      .then(team_members => {
        const member_ids = team_members
          .filter(team_member => team_member.user_id !== this.user_repository.self().id)
          .map(team_member => team_member.user_id);

        return this.user_repository.get_users_by_id(member_ids);
      })
      .then(user_ets => team_et.members(user_ets));
  }

  _add_user_to_team(user_et) {
    const members = this.team().members;

    if (!members().find(member => member.id === user_et.id)) {
      members.push(user_et);
    }
  }

  _on_delete({team: team_id}) {
    if (this.is_team() && this.team().id === team_id) {
      window.setTimeout(() => {
        amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
  }

  _on_member_join(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;
    const is_local_team = this.team().id === team_id;
    const is_other_user = this.user_repository.self().id !== user_id;

    if (is_local_team && is_other_user) {
      this.user_repository.get_user_by_id(user_id).then(user_et => this._add_user_to_team(user_et));
    }
  }

  _on_member_leave(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;
    const is_local_team = this.team().id === team_id;

    if (is_local_team) {
      const is_self_user = user_id === this.user_repository.self().id;
      if (is_self_user) {
        return this._on_delete(event_json);
      }

      this.team().members.remove(member => member.id === user_id);
      amplify.publish(z.event.WebApp.TEAM.MEMBER_LEAVE, team_id, user_id);
    }
  }

  _on_unhandled(event_json) {
    this.logger.log(`Received '${event_json.type}' event from backend which is not yet handled`, event_json);
  }

  _on_update(event_json) {
    const {data: team_data, team: team_id} = event_json;

    if (this.team().id === team_id) {
      this.team_mapper.update_team_from_object(team_data, this.team());
      this.send_account_info();
    }
  }
};
