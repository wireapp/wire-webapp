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
window.z.user = z.user || {};

z.user.UserRepository = class UserRepository {
  /**
   * Construct a new User repository.
   * @class z.user.UserRepository
   * @param {z.user.UserService} user_service - Backend REST API user service implementation
   * @param {z.assets.AssetService} asset_service - Backend REST API asset service implementation
   * @param {z.search.SearchService} search_service - Backend REST API search service implementation
   * @param {z.client.ClientRepository} client_repository - Repository for all client interactions
   * @param {z.cryptography.CryptographyRepository} cryptography_repository - Repository for all cryptography interactions
   */
  constructor(user_service, asset_service, search_service, client_repository, cryptography_repository) {
    this.user_service = user_service;
    this.asset_service = asset_service;
    this.search_service = search_service;
    this.client_repository = client_repository;
    this.cryptography_repository = cryptography_repository;
    this.logger = new z.util.Logger('z.user.UserRepository', z.config.LOGGER.OPTIONS);

    this.connection_mapper = new z.user.UserConnectionMapper();
    this.user_mapper = new z.user.UserMapper(this.asset_service);
    this.should_set_username = false;

    this.self = ko.observable();
    this.users = ko.observableArray([]);
    this.connections = ko.observableArray([]);

    this.connect_requests = ko.pureComputed(() => {
      return this.users()
        .filter((user_et) => user_et.connection().status() === z.user.ConnectionStatus.PENDING)
        .map((user_et) => user_et);
    }).extend({rateLimit: 50});

    this.connected_users = ko.pureComputed(() => {
      return this.users()
        .filter((user_et) => user_et.connection().status() === z.user.ConnectionStatus.ACCEPTED)
        .map((user_et) => user_et);
    }).extend({rateLimit: 1000});

    this.connected_users.subscribe((user_ets) => {
      amplify.publish(z.event.WebApp.ANALYTICS.CUSTOM_DIMENSION, z.tracking.CustomDimension.CONTACTS, user_ets.length);
    });

    amplify.subscribe(z.event.Backend.USER.CONNECTION, this.user_connection);
    amplify.subscribe(z.event.Backend.USER.UPDATE, this.user_update);
    amplify.subscribe(z.event.WebApp.CLIENT.ADD, this.add_client_to_user);
    amplify.subscribe(z.event.WebApp.CLIENT.REMOVE, this.remove_client_from_user);
    amplify.subscribe(z.event.WebApp.CLIENT.UPDATE, this.update_clients_from_user);
  }

  /**
   * Accept a connection request.
   * @param {z.entity.User} user_et - User to update connection with
   * @param {boolean} show_conversation - Show new conversation on success
   * @returns {Promise} Promise that resolves when the connection request was accepted
   */
  accept_connection_request(user_et, show_conversation = false) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation);
  }

  block_user(user_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.BLOCKED);
  }

  cancel_connection_request(user_et, next_conversation_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.CANCELLED)
      .then(function() {
        if (next_conversation_et) {
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
        }
      });
  }

  create_connection(user_et, show_conversation = false) {
    return this.user_service.create_connection(user_et.id, user_et.name())
      .then((response) => {
        return this.user_connection(response, show_conversation);
      })
      .catch((error) => {
        return this.logger.error(`Failed to send connection request to user '${user_et.id}': ${error.message}`, error);
      });
  }

  get_connection_by_user_id(user_id) {
    for (const connection_et of this.connections()) {
      if (connection_et.to === user_id) {
        return connection_et;
      }
    }
  }

  get_connection_by_conversation_id(conversation_id) {
    for (const connection_et of this.connections()) {
      if (connection_et.conversation_id === conversation_id) {
        return connection_et;
      }
    }
  }

  get_connections(limit = 500, user_id, connection_ets = []) {
    return this.user_service.get_own_connections(limit, user_id)
      .then((response) => {
        if (response.connections.length) {
          const new_connection_ets = this.connection_mapper.map_user_connections_from_json(response.connections);
          connection_ets = connection_ets.concat(new_connection_ets);
        }

        if (response.has_more) {
          const last_connection_et = connection_ets[connection_ets.length - 1];
          return this.get_connections(limit, last_connection_et.to, connection_ets);
        }

        if (connection_ets.length) {
          return this.update_user_connections(connection_ets, true)
            .then(() => {
              return this.connections();
            });
        }

        return this.connections();
      })
      .catch((error) => {
        this.logger.error(`Failed to retrieve connections from backend: ${error.message}`, error);
        throw error;
      });
  }

  ignore_connection_request(user_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.IGNORED);
  }

  unblock_user(user_et, show_conversation = true) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation);
  }

  update_user_connections(connection_ets, assign_clients = false) {
    return new Promise((resolve) => {
      z.util.ko_array_push_all(this.connections, connection_ets);

      // Apply connection to other user entities (which are not us)
      const user_ids = connection_ets.map((connection_et) => connection_et.to);

      if (user_ids.length) {
        return this.get_users_by_id(user_ids)
          .then((user_ets) => {
            for (const user_et of user_ets) {
              this._assign_connection(user_et);
            }

            if (assign_clients) {
              return this._assign_all_clients()
                .then(function() {
                  return resolve();
                });
            }
          });
      }
    });
  }

  _assign_all_clients() {
    return this.client_repository.get_all_clients_from_db()
      .then((user_client_map) => {
        this.logger.info(`Found locally stored clients for '${Object.keys(user_client_map).length}' users`, user_client_map);
        for (const user_id in user_client_map) {
          const client_ets = user_client_map[user_id];
          return this.get_users_by_id(client_ets)
            .then((user_ets) => {
              for (const user_et of user_ets) {
                if (user_client_map[user_et.id].length > 8) {
                  this.logger.warn(`Found '${user_client_map[user_et.id].length}' clients for '${user_et.name()}'`, user_client_map[user_et.id]);
                }
                user_et.devices(user_client_map[user_et.id]);
              }
            });
        }
      });
  }

  _assign_connection(user_et) {
    const connection_et = this.get_connection_by_user_id(user_et.id);
    if (connection_et) {
      return user_et.connection(connection_et);
    }
  }

  _update_connection_status(user_et, status, show_conversation = false) {
    return Promise.resolve()
      .then(() => {
        if (user_et.connection().status() === status) {
          return;
        }
        return this.user_service.update_connection_status(user_et.id, status);
      })
      .then((response) => {
        return this.user_connection(response, show_conversation);
      })
      .catch((error) => {
        this.logger.error(`Connection status change to '${status}' for user '${user_et.id}' failed: ${error.message}`, error);

        const custom_data = {
          current_status: user_et.connection().status(),
          failed_action: status,
          server_error: error,
        };

        Raygun.send(new Error('Connection status change failed'), custom_data);
      });
  }

  user_connection(event_json, show_conversation) {
    if (event_json == null) {
      return;
    }
    event_json = event_json.connection || event_json;

    let connection_et = this.get_connection_by_user_id(event_json.to);
    let previous_status = null;

    if (connection_et != null) {
      previous_status = connection_et.status();
      this.connection_mapper.update_user_connection_from_json(connection_et, event_json);
    } else {
      connection_et = this.connection_mapper.map_user_connection_from_json(event_json);
      this.update_user_connections([connection_et]);
    }

    if (connection_et) {
      if ((previous_status === z.user.ConnectionStatus.SENT) && (connection_et.status() === z.user.ConnectionStatus.ACCEPTED)) {
        this.update_user_by_id(connection_et.to);
      }
      this._send_user_connection_notification(connection_et, previous_status);
      return amplify.publish(z.event.WebApp.CONVERSATION.MAP_CONNECTION, connection_et, show_conversation);
    }
  }

  user_update(event_json) {
    if (event_json.user.id === this.self().id) {
      return this.user_mapper.update_user_from_object(this.self(), event_json.user);
    }

    return this.get_user_by_id(event_json.user.id)
      .then((user_et) => {
        return this.user_mapper.update_user_from_object(user_et, event_json.user);
      });
  }

  _send_user_connection_notification(connection_et, previous_status) {
    // We accepted the connection request or unblocked the user
    const no_notification = [z.user.ConnectionStatus.BLOCKED, z.user.ConnectionStatus.PENDING];
    if (no_notification.includes(previous_status) && (connection_et.status() === z.user.ConnectionStatus.ACCEPTED)) {
      return;
    }

    return this.get_user_by_id(connection_et.to)
      .then(function(user_et) {
        const message_et = new z.entity.MemberMessage();
        message_et.user(user_et);
        switch (connection_et.status()) {
          case z.user.ConnectionStatus.PENDING:
            message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST;
            break;
          case z.user.ConnectionStatus.ACCEPTED:
            if (previous_status === z.user.ConnectionStatus.SENT) {
              message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED;
            } else {
              message_et.member_message_type = z.message.SystemMessageType.CONNECTION_CONNECTED;
            }
            break;
          default:
            break;
        }
        amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, connection_et, message_et);
      });
  }

  add_client_to_user(user_id, client_et) {
    return this.get_user_by_id(user_id)
      .then((user_et) => {
        if (!user_et.add_client(client_et)) {
          return;
        }

        return this.client_repository.save_client_in_db(user_id, client_et.to_json())
          .then(function() {
            amplify.publish(z.event.WebApp.USER.CLIENT_ADDED, user_id, client_et);
            if (user_et.is_me) {
              amplify.publish(z.event.WebApp.CLIENT.ADD_OWN_CLIENT, user_id, client_et);
            }
          });
      });
  }

  remove_client_from_user(user_id, client_id) {
    return this.client_repository.remove_client(user_id, client_id)
      .then(() => {
        return this.get_user_by_id(user_id);
      })
      .then(function(user_et) {
        user_et.remove_client(client_id);
        amplify.publish(z.event.WebApp.USER.CLIENT_REMOVED, user_id, client_id);
      });
  }
};
