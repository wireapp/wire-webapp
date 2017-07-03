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

    this.is_team = ko.observable(false);

    this.team = ko.observable();
    this.team_name = ko.pureComputed(() => {
      if (this.is_team()) {
        return this.team().name();
      }

      return this.user_repository.self().name();
    });
    this.team_users = ko.pureComputed(() => {
      if (this.is_team()) {
        const team_members = this.team().members();
        return team_members.concat(this.user_repository.connected_users());
      }
    });

    this.self_user = this.user_repository.self;

    this.user_repository.team = this.team;
    this.user_repository.team_users = this.team_users;

    amplify.subscribe(z.event.WebApp.TEAM.EVENT_FROM_BACKEND, this.on_team_event.bind(this));
  }

  get_team() {
    return this.team_service.get_teams()
      .then(({teams}) => {
        if (teams.length) {
          const [team] = teams;

          if (team.binding) {
            const team_et = this.team_mapper.map_team_from_object(team);
            this._set_team(team_et);

            return this.team();
          }
        }

        return this.team(new z.team.TeamEntity());
      })
      .then((team_et) => {
        this._send_account_info();
        return team_et;
      });
  }

  get_team_members(team_id) {
    return this.team_service.get_team_members(team_id)
      .then(({members}) => {
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

    this.logger.info(`»» Event: '${type}'`, {event_json: JSON.stringify(event_json), event_object: event_json});

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

  update_team_members(team_et) {
    return this.get_team_members(team_et.id)
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

  _add_user_to_team(user_et) {
    const members = this.team().members;

    if (!members().filter((member) => member.id === user_et.id).length) {
      members.push(user_et);
    }
  }

  _send_account_info() {
    const image_resource = this.is_team() ? this.self_user().preview_picture_resource() : this.self_user().preview_picture_resource();
    const image_promise = image_resource ? image_resource.load() : Promise.resolve();

    image_promise
      .then((image_blob) => z.util.load_data_url(image_blob))
      .then((image_data_url) => {
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

  _on_delete(event_json) {
    const team_id = event_json.team;
    amplify.publish(z.event.WebApp.TEAM.DELETE, team_id);
    amplify.publish(z.event.WebApp.TEAM.MEMBER_LEAVE, team_id); // deprecated
  }

  _on_member_join(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;
    const is_local_team = this.team().id === team_id;
    const is_other_user = this.user_repository.self().id !== user_id;

    if (is_local_team && is_other_user) {
      this.user_repository.get_user_by_id(user_id)
        .then((user_et) => this._add_user_to_team(user_et));
    }
  }

  _on_member_leave(event_json) {
    const {data: {user: user_id}, team: team_id} = event_json;
    const is_local_team = this.team().id === team_id;

    if (is_local_team) {
      if (this.user_repository.self().id === user_id) {
        return this._on_delete({team: team_id});
      }

      this.team().members.remove((member) => member.id === user_id);
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
      this._send_account_info();
    }
  }

  _set_team(team_et) {
    this.update_team_members(team_et);
    this.is_team(true);
    this.team(team_et);
    this.user_repository.map_guest_status();
  }
};
