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
  static get CONFIG() {
    return {
      MINIMUM_NAME_LENGTH: 2,
      MINIMUM_PICTURE_SIZE: {
        HEIGHT: 320,
        WIDTH: 320,
      },
      MINIMUM_USERNAME_LENGTH: 2,
    };
  }

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

    this.connect_requests = ko
      .pureComputed(() => {
        return this.users().filter(user_et => user_et.is_incoming_request());
      })
      .extend({rateLimit: 50});

    this.connected_users = ko
      .pureComputed(() => {
        return this.users()
          .filter(user_et => user_et.is_connected())
          .sort((user_a, user_b) => z.util.StringUtil.sort_by_priority(user_a.first_name(), user_b.first_name()));
      })
      .extend({rateLimit: 1000});

    this.is_team = ko.observable();
    this.team_members = undefined;
    this.team_users = undefined;

    this.number_of_contacts = ko.pureComputed(() => {
      const contacts = this.is_team() ? this.team_users() : this.connected_users();
      return contacts.filter(user_et => !user_et.is_bot).length;
    });
    this.number_of_contacts.subscribe(number_of_contacts => {
      amplify.publish(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, z.tracking.SuperProperty.CONTACTS, number_of_contacts);
    });

    amplify.subscribe(z.event.WebApp.CLIENT.ADD, this.add_client_to_user.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.REMOVE, this.remove_client_from_user.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.UPDATE, this.update_clients_from_user.bind(this));
    amplify.subscribe(z.event.WebApp.USER.CHANGE_AVAILABILITY, this.changeAvailability.bind(this));
    amplify.subscribe(z.event.WebApp.USER.EVENT_FROM_BACKEND, this.on_user_event.bind(this));
    amplify.subscribe(z.event.WebApp.USER.PERSIST, this.saveUserInDb.bind(this));
  }

  /**
   * Listener for incoming user events.
   *
   * @param {Object} event_json - JSON data for event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  on_user_event(event_json, source) {
    const {type} = event_json;

    this.logger.info(`»» User Event: '${type}' (Source: ${source})`, {
      event_json: JSON.stringify(event_json),
      event_object: event_json,
    });

    switch (type) {
      case z.event.Backend.USER.CONNECTION:
        this.user_connection(event_json, source);
        break;
      case z.event.Backend.USER.DELETE:
        this.user_delete(event_json);
        break;
      case z.event.Backend.USER.UPDATE:
        this.user_update(event_json);
        break;
      case z.event.Client.USER.AVAILABILITY:
        this.onUserAvailability(event_json);
        break;
      default:
    }
  }

  loadUsers() {
    if (this.is_team()) {
      return this.user_service
        .loadUserFromDb()
        .then(users => {
          if (users.length) {
            this.logger.log(`Loaded state of '${users.length}' users from database`, users);
            return Promise.all(
              users.map(user =>
                this.get_user_by_id(user.id).then(userEntity => userEntity.availability(user.availability))
              )
            );
          }
        })
        .then(() => this.users().forEach(userEntity => userEntity.subscribeToChanges()));
    }
  }

  /**
   * Persists a conversation state in the database.
   * @param {User} userEntity - User which should be persisted
   * @returns {Promise} Resolves when user was saved
   */
  saveUserInDb(userEntity) {
    return this.user_service.saveUserInDb(userEntity);
  }

  /**
   * Convert a JSON event into an entity and get the matching conversation.
   * @param {Object} event_json - JSON data of 'user.connection' event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {boolean} [show_conversation] - Should the new conversation be opened?
   * @returns {undefined} No return value
   */
  user_connection(event_json, source, show_conversation) {
    if (!event_json) {
      return;
    }
    event_json = event_json.connection || event_json;

    let connection_et = this.get_connection_by_user_id(event_json.to);
    let previous_status = null;

    if (connection_et) {
      previous_status = connection_et.status();
      this.connection_mapper.update_user_connection_from_json(connection_et, event_json);
    } else {
      connection_et = this.connection_mapper.map_user_connection_from_json(event_json);
    }

    this.update_user_connections([connection_et]).then(() => {
      if (previous_status === z.user.ConnectionStatus.SENT && connection_et.is_connected()) {
        this.update_user_by_id(connection_et.to);
      }
      this._send_user_connection_notification(connection_et, source, previous_status);
      amplify.publish(z.event.WebApp.CONVERSATION.MAP_CONNECTION, connection_et, show_conversation);
    });
  }

  /**
   * Event to delete the matching user.
   * @param {string} id - User ID of deleted user
   * @returns {undefined} No return value
   */
  user_delete({id}) {
    // @todo Add user deletion cases for other users
    const is_self_user = id === this.self().id;
    if (is_self_user) {
      window.setTimeout(() => {
        amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 50);
    }
  }

  /**
   * Event to update availability of user.
   * @param {Object} event - Event data
   * @returns {undefined} No return value
   */
  onUserAvailability(event) {
    if (this.is_team()) {
      const {from: userId, data: {availability}} = event;
      this.get_user_by_id(userId).then(userEntity => userEntity.availability(availability));
    }
  }

  /**
   * Event to update the matching user.
   * @param {Object} user - Update user info
   * @returns {Promise} Resolves wit the updated user entity
   */
  user_update({user}) {
    const is_self_user = user.id === this.self().id;
    const user_promise = is_self_user ? Promise.resolve(this.self()) : this.get_user_by_id(user.id);
    return user_promise.then(user_et => {
      this.user_mapper.update_user_from_object(user_et, user);

      if (is_self_user) {
        amplify.publish(z.event.WebApp.TEAM.UPDATE_INFO);
      }

      return user_et;
    });
  }

  /**
   * Accept a connection request.
   * @param {z.entity.User} user_et - User to update connection with
   * @param {boolean} [show_conversation=false] - Show new conversation on success
   * @returns {Promise} Promise that resolves when the connection request was accepted
   */
  accept_connection_request(user_et, show_conversation = false) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation);
  }

  /**
   * Block a user.
   *
   * @param {z.entity.User} user_et - User to block
   * @param {z.entity.Conversation} [next_conversation_et] - Optional conversation to be switched to
   * @returns {Promise} Promise that resolves when the user was blocked
   */
  block_user(user_et, next_conversation_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.BLOCKED).then(() => {
      if (next_conversation_et) {
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
      }
    });
  }

  /**
   * Cancel a connection request.
   *
   * @param {z.entity.User} user_et - User to cancel the sent connection request
   * @param {z.entity.Conversation} [next_conversation_et] - Optional conversation to be switched to
   * @returns {Promise} Promise that resolves when an outgoing connection request was cancelled
   */
  cancel_connection_request(user_et, next_conversation_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.CANCELLED).then(() => {
      if (next_conversation_et) {
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
      }
    });
  }

  /**
   * Create a connection request.
   *
   * @param {z.entity.User} user_et - User to connect to
   * @param {boolean} [show_conversation=false] - Should we open the new conversation
   * @returns {Promise} Promise that resolves when the connection request was successfully created
   */
  create_connection(user_et, show_conversation = false) {
    return this.user_service
      .create_connection(user_et.id, user_et.name())
      .then(response => this.user_connection(response, z.event.EventRepository.SOURCE.INJECTED, show_conversation))
      .catch(error => {
        this.logger.error(`Failed to send connection request to user '${user_et.id}': ${error.message}`, error);
      });
  }

  /**
   * Get a connection for a user ID.
   * @param {string} user_id - User ID
   * @returns {z.entity.Connection} User connection entity
   */
  get_connection_by_user_id(user_id) {
    for (const connection_et of this.connections()) {
      if (connection_et.to === user_id) {
        return connection_et;
      }
    }
  }

  /**
   * Get a connection for a conversation ID.
   * @param {string} conversation_id - Conversation ID
   * @returns {z.entity.Connection} User connection entity
   */
  get_connection_by_conversation_id(conversation_id) {
    for (const connection_et of this.connections()) {
      if (connection_et.conversation_id === conversation_id) {
        return connection_et;
      }
    }
  }

  /**
   * Create a new conversation.
   * @note Initially called by Wire for Web's app start to retrieve user entities and their connections.
   * @param {number} [limit=500] - Query limit for user connections
   * @param {string} [user_id] - User ID of the latest connection
   * @param {Array<z.entity.Connection>} [connection_ets=[]] - Unordered array of user connections
   * @returns {Promise} Promise that resolves when all connections have been retrieved and mapped
   */
  get_connections(limit = 500, user_id, connection_ets = []) {
    return this.user_service
      .get_own_connections(limit, user_id)
      .then(({connections, has_more}) => {
        if (connections.length) {
          const new_connection_ets = this.connection_mapper.map_user_connections_from_json(connections);
          connection_ets = connection_ets.concat(new_connection_ets);
        }

        if (has_more) {
          const last_connection_et = connection_ets[connection_ets.length - 1];
          return this.get_connections(limit, last_connection_et.to, connection_ets);
        }

        if (connection_ets.length) {
          return this.update_user_connections(connection_ets, true).then(() => {
            return this.connections();
          });
        }

        return this.connections();
      })
      .catch(error => {
        this.logger.error(`Failed to retrieve connections from backend: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Ignore connection request.
   * @param {z.entity.User} user_et - User to ignore the connection request
   * @returns {Promise} Promise that resolves when an incoming connection request was ignored
   */
  ignore_connection_request(user_et) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.IGNORED);
  }

  /**
   * Unblock a user.
   * @param {z.entity.User} user_et - User to unblock
   * @param {boolean} [show_conversation=false] - Show new conversation on success
   * @returns {Promise} Promise that resolves when a user was unblocked
   */
  unblock_user(user_et, show_conversation = true) {
    return this._update_connection_status(user_et, z.user.ConnectionStatus.ACCEPTED, show_conversation);
  }

  /**
   * Update the user connections and get the matching users.
   * @param {Array<z.entity.Connection>} connection_ets - Connection entities
   * @param {boolean} assign_clients - Retrieve locally known clients from database
   * @returns {Promise<Array<z.entity.Connection>>} Promise that resolves when all user connections have been updated
   */
  update_user_connections(connection_ets, assign_clients = false) {
    return Promise.resolve()
      .then(() => {
        z.util.ko_array_push_all(this.connections, connection_ets);
        const user_ids = connection_ets.map(connection_et => connection_et.to);

        if (user_ids.length === 0) {
          return;
        }

        return this.get_users_by_id(user_ids).then(user_ets => {
          for (const user_et of user_ets) {
            this._assign_connection(user_et);
          }
          if (assign_clients) {
            return this._assign_all_clients();
          }
        });
      })
      .then(() => {
        return connection_ets;
      });
  }

  /**
   * Assign all locally stored clients to the users.
   * @private
   * @returns {Promise} Promise that resolves with all user entities where client entities have been assigned to.
   */
  _assign_all_clients() {
    return this.client_repository.get_all_clients_from_db().then(recipients => {
      this.logger.info(`Found locally stored clients for '${Object.keys(recipients).length}' users`, recipients);
      const user_ids = Object.keys(recipients);

      return this.get_users_by_id(user_ids).then(user_ets => {
        for (const user_et of user_ets) {
          if (recipients[user_et.id].length > 8) {
            this.logger.warn(
              `Found '${recipients[user_et.id].length}' clients for '${user_et.name()}'`,
              recipients[user_et.id]
            );
          }
          user_et.devices(recipients[user_et.id]);
        }

        return user_ets;
      });
    });
  }

  /**
   * Assign connections to the users.
   * @param {z.entity.User} user_et - User to which a connection will be assigned to.
   * @returns {z.entity.Connection} Connection entity which has been found for the given user entity.
   * @private
   */
  _assign_connection(user_et) {
    const connection_et = this.get_connection_by_user_id(user_et.id);
    if (connection_et) {
      user_et.connection(connection_et);
    }
    return connection_et;
  }

  /**
   * Update the status of a connection.
   * @private
   * @param {z.entity.User} user_et - User to update connection with
   * @param {string} status - Connection status
   * @param {boolean} [show_conversation=false] - Show conversation on success
   * @returns {Promise} Promise that resolves when the connection status was updated
   */
  _update_connection_status(user_et, status, show_conversation = false) {
    if (!user_et) {
      this.logger.error('Cannot update connection without a user');
      return Promise.reject(new z.user.UserError(z.user.UserError.TYPE.USER_NOT_FOUND));
    }

    if (user_et.connection().status() === status) {
      this.logger.info(`Requested connection status change to '${status}' for user '${user_et.id}' is current status`);
      return Promise.resolve();
    }

    return this.user_service
      .update_connection_status(user_et.id, status)
      .then(response => this.user_connection(response, z.event.EventRepository.SOURCE.INJECTED, show_conversation))
      .catch(error => {
        this.logger.error(
          `Connection status change to '${status}' for user '${user_et.id}' failed: ${error.message}`,
          error
        );

        const custom_data = {
          current_status: user_et.connection().status(),
          failed_action: status,
          server_error: error,
        };

        Raygun.send(new Error('Connection status change failed'), custom_data);
      });
  }

  /**
   * Send the user connection notification.
   * @param {z.entity.Connection} connection_et - Connection entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.user.ConnectionStatus} previous_status - Previous connection status
   * @returns {undefined} No return value
   */
  _send_user_connection_notification(connection_et, source, previous_status) {
    // We accepted the connection request or unblocked the user
    const self_user_accepted =
      connection_et.is_connected() &&
      [z.user.ConnectionStatus.BLOCKED, z.user.ConnectionStatus.PENDING].includes(previous_status);
    const is_web_socket_event = source === z.event.EventRepository.SOURCE.WEB_SOCKET;

    if (is_web_socket_event && !self_user_accepted) {
      this.get_user_by_id(connection_et.to).then(user_et => {
        const message_et = new z.entity.MemberMessage();
        message_et.user(user_et);

        switch (connection_et.status()) {
          case z.user.ConnectionStatus.PENDING: {
            message_et.member_message_type = z.message.SystemMessageType.CONNECTION_REQUEST;
            break;
          }

          case z.user.ConnectionStatus.ACCEPTED: {
            if (previous_status === z.user.ConnectionStatus.SENT) {
              message_et.member_message_type = z.message.SystemMessageType.CONNECTION_ACCEPTED;
            } else {
              message_et.member_message_type = z.message.SystemMessageType.CONNECTION_CONNECTED;
            }
            break;
          }

          default:
            break;
        }

        amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, connection_et, message_et);
      });
    }
  }

  /**
   * Saves a new client for the first time to the database and adds it to a user's entity.
   * @param {string} user_id - ID of user
   * @param {string} client_et - Client which should get deleted
   * @returns {Promise} Promise that resolves when a client and its session have been deleted
   */
  add_client_to_user(user_id, client_et) {
    return this.get_user_by_id(user_id).then(user_et => {
      if (!user_et.add_client(client_et)) {
        return;
      }

      return this.client_repository.save_client_in_db(user_id, client_et.to_json()).then(() => {
        amplify.publish(z.event.WebApp.USER.CLIENT_ADDED, user_id, client_et);
        if (user_et.is_me) {
          amplify.publish(z.event.WebApp.CLIENT.ADD_OWN_CLIENT, user_id, client_et);
        }
      });
    });
  }

  /**
   * Removes a stored client and the session connected with it.
   * @param {string} user_id - ID of user
   * @param {string} client_id - ID of client to be deleted
   * @returns {Promise} Promise that resolves when a client and its session have been deleted
   */
  remove_client_from_user(user_id, client_id) {
    return this.client_repository
      .remove_client(user_id, client_id)
      .then(() => this.get_user_by_id(user_id))
      .then(user_et => {
        user_et.remove_client(client_id);
        amplify.publish(z.event.WebApp.USER.CLIENT_REMOVED, user_id, client_id);
      });
  }

  /**
   * Update clients for given user.
   * @param {string} user_id - ID of user
   * @param {Array<z.client.Client>} client_ets - Clients which should get updated
   * @returns {undefined} No return value
   */
  update_clients_from_user(user_id, client_ets) {
    this.get_user_by_id(user_id).then(user_et => {
      user_et.devices(client_ets);
      amplify.publish(z.event.WebApp.USER.CLIENTS_UPDATED, user_id, client_ets);
    });
  }

  changeAvailability(availability, method) {
    const hasAvailabilityChanged = availability !== this.self().availability();
    if (hasAvailabilityChanged) {
      this.self().availability(availability);

      const genericMessage = new z.proto.GenericMessage(z.util.create_random_uuid());
      const availabilityMessage = new z.proto.Availability(z.user.AvailabilityMapper.protoFromType(availability));
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.AVAILABILITY, availabilityMessage);

      amplify.publish(z.event.WebApp.BROADCAST.SEND_MESSAGE, genericMessage);
      this._trackAvailability(availability, method);
    }
  }

  /**
   * Track availability action.
   *
   * @param {z.user.AvailabilityType} availability - Type of availability
   * @param {string} method - Method used for availability change
   * @returns {undefined} No return value
   */
  _trackAvailability(availability, method) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.CHANGED_STATUS, {
      method: method,
      status: z.user.AvailabilityMapper.valueFromType(availability),
    });
  }

  /**
   * Request account deletion.
   * @returns {Promise} Promise that resolves when account deletion process has been initiated
   */
  delete_me() {
    return this.user_service
      .delete_self()
      .then(() => {
        this.logger.info('Account deletion initiated');
      })
      .catch(error => {
        this.logger.error(`Unable to delete self: ${error}`);
      });
  }

  /**
   * Get a user from the backend.
   * @param {string} user_id - User ID
   * @returns {Promise<z.entity.User>} Promise that resolves with the user entity
   */
  fetch_user_by_id(user_id) {
    return this.fetch_users_by_id([user_id]).then(([user_et]) => {
      if (user_et) {
        return user_et;
      }
    });
  }

  /**
   * Get users from the backend.
   * @param {Array<string>} user_ids - User IDs
   * @returns {Promise<Array<z.entity.User>>} Promise that resolves with an array of user entities
   */
  fetch_users_by_id(user_ids = []) {
    user_ids = user_ids.filter(user_id => user_id);

    if (!user_ids.length) {
      return Promise.resolve([]);
    }

    const _get_users = user_id_chunk => {
      return this.user_service
        .get_users(user_id_chunk)
        .then(response => {
          if (response) {
            return this.user_mapper.map_users_from_object(response);
          }
          return [];
        })
        .catch(error => {
          if (error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
            return [];
          }
          throw error;
        });
    };

    const user_id_chunks = z.util.ArrayUtil.chunk(user_ids, z.config.MAXIMUM_USERS_PER_REQUEST);
    return Promise.all(user_id_chunks.map(user_id_chunk => _get_users(user_id_chunk)))
      .then(resolve_array => {
        const new_user_ets = _.flatten(resolve_array);

        if (this.is_team()) {
          this.map_guest_status(new_user_ets);
        }

        return this.save_users(new_user_ets);
      })
      .then(fetched_user_ets => {
        // If there is a difference then we most likely have a case with a suspended user
        if (user_ids.length !== fetched_user_ets.length) {
          fetched_user_ets = this._add_suspended_users(user_ids, fetched_user_ets);
        }

        return fetched_user_ets;
      });
  }

  /**
   * Find a local user.
   * @param {string} user_id - User ID
   * @returns {Promise<z.entity.User>} Resolves with the matching user entity
   */
  find_user_by_id(user_id) {
    for (const user_et of this.users()) {
      if (user_et.id === user_id) {
        return Promise.resolve(user_et);
      }
    }

    return Promise.reject(new z.user.UserError(z.user.UserError.TYPE.USER_NOT_FOUND));
  }

  /**
   * Get self user from backend.
   * @returns {Promise} Promise that will resolve with the self user entity
   */
  get_me() {
    return this.user_service
      .get_own_user()
      .then(response => {
        const user_et = this.user_mapper.map_self_user_from_object(response);
        return this.save_user(user_et, true);
      })
      .catch(error => {
        this.logger.error(`Unable to load self user: ${error}`);
        throw error;
      });
  }

  /**
   * Check for user locally and fetch it from the server otherwise.
   * @param {string} user_id - User ID
   * @returns {Promise<z.entity.User>} Promise that resolves with the matching user entity
   */
  get_user_by_id(user_id) {
    return this.find_user_by_id(user_id)
      .catch(error => {
        if (error.type === z.user.UserError.TYPE.USER_NOT_FOUND) {
          return this.fetch_user_by_id(user_id);
        }
        throw error;
      })
      .catch(error => {
        if (error.type !== z.user.UserError.TYPE.USER_NOT_FOUND) {
          this.logger.error(`Failed to get user '${user_id}': ${error.message}`, error);
        }
        throw error;
      });
  }

  get_user_id_by_handle(handle) {
    return this.user_service
      .get_username(handle.toLowerCase())
      .then(({user: user_id}) => user_id)
      .catch(error => {
        if (error.code !== z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Check for users locally and fetch them from the server otherwise.
   * @param {Array<string>} user_ids - User IDs
   * @param {boolean} offline - Should we only look for cached contacts
   * @returns {Promise<Array<z.entity.User>>} Resolves with an array of users
   */
  get_users_by_id(user_ids = [], offline = false) {
    if (!user_ids.length) {
      return Promise.resolve([]);
    }

    const _find_user = user_id => {
      return this.find_user_by_id(user_id).catch(error => {
        if (error.type !== z.user.UserError.TYPE.USER_NOT_FOUND) {
          throw error;
        }
        return user_id;
      });
    };

    const find_users = user_ids.map(user_id => _find_user(user_id));

    return Promise.all(find_users).then(resolve_array => {
      const known_user_ets = resolve_array.filter(array_item => array_item instanceof z.entity.User);
      const unknown_user_ids = resolve_array.filter(array_item => _.isString(array_item));

      if (offline || !unknown_user_ids.length) {
        return known_user_ets;
      }

      return this.fetch_users_by_id(unknown_user_ids).then(user_ets => known_user_ets.concat(user_ets));
    });
  }

  /**
   * Search for user.
   * @param {string} query - Find user by name or handle
   * @param {boolean} is_handle - Query string is handle
   * @returns {Array<z.entity.User>} Matching users
   */
  search_for_connected_users(query, is_handle) {
    return this.connected_users()
      .filter(user_et => user_et.matches(query, is_handle))
      .sort((user_a, user_b) => {
        if (is_handle) {
          return z.util.StringUtil.sort_by_priority(user_a.username(), user_b.username(), query);
        }
        return z.util.StringUtil.sort_by_priority(user_a.name(), user_b.name(), query);
      });
  }

  /**
   * Is the user the logged in user.
   * @param {z.entity.User|string} user_id - User entity or user ID
   * @returns {boolean} Is the user the logged in user
   */
  is_me(user_id) {
    if (!_.isString(user_id)) {
      user_id = user_id.id;
    }
    return this.self().id === user_id;
  }

  /**
   * Is the user the logged in user.
   * @param {z.entity.User|string} user_et - User entity or user ID
   * @param {boolean} is_me - True, if self user
   * @returns {Promise} Resolves with the user entity
   */
  save_user(user_et, is_me = false) {
    return this.find_user_by_id(user_et.id).catch(error => {
      if (error.type !== z.user.UserError.TYPE.USER_NOT_FOUND) {
        throw error;
      }

      if (is_me) {
        user_et.is_me = true;
        this.self(user_et);
      }
      this.users.push(user_et);
      return user_et;
    });
  }

  /**
   * Save multiple users at once.
   * @param {Array<z.entity.User>} user_ets - Array of user entities to be stored
   * @returns {Promise} Resolves with users passed as parameter
   */
  save_users(user_ets) {
    const _find_users = user_et => {
      return this.find_user_by_id(user_et.id)
        .then(() => undefined)
        .catch(error => {
          if (error.type !== z.user.UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
          return user_et;
        });
    };

    const find_users = user_ets.map(user_et => _find_users(user_et));

    return Promise.all(find_users).then(resolve_array => {
      z.util.ko_array_push_all(this.users, resolve_array.filter(user_et => user_et));
      return user_ets;
    });
  }

  /**
   * Update a local user from the backend by ID.
   * @param {string} user_id - User ID
   * @returns {Promise} Resolves when user was updated
   */
  update_user_by_id(user_id) {
    const get_current_user = () =>
      this.find_user_by_id(user_id).catch(error => {
        if (error.type !== z.user.UserError.TYPE.USER_NOT_FOUND) {
          throw error;
        }
        return new z.entity.User();
      });

    return Promise.all([get_current_user(user_id), this.user_service.get_user_by_id(user_id)])
      .then(([current_user_et, updated_user_data]) =>
        this.user_mapper.update_user_from_object(current_user_et, updated_user_data)
      )
      .then(updated_user_et => {
        if (this.is_team()) {
          this.map_guest_status([updated_user_et]);
        }
      });
  }

  /**
   * Add user entities for suspended users.
   * @param {Array<string>} user_ids - Requested user IDs
   * @param {Array<z.entity.User>} user_ets - User entities returned by backend
   * @returns {Array<z.entity.User>} User entities to be returned
   */
  _add_suspended_users(user_ids, user_ets) {
    for (const user_id of user_ids) {
      const matching_user_ids = user_ets.find(user_et => user_et.id === user_id);

      if (!matching_user_ids) {
        const user_et = new z.entity.User(user_id);
        user_et.name(z.l10n.text(z.string.nonexistent_user));
        user_ets.push(user_et);
      }
    }
    return user_ets;
  }

  /**
   * Change the accent color.
   * @param {number} accent_id - New accent color
   * @returns {Promise} Resolves when accent color was changed
   */
  change_accent_color(accent_id) {
    return this.user_service
      .update_own_user_profile({accent_id})
      .then(() => this.user_update({user: {accent_id: accent_id, id: this.self().id}}));
  }

  /**
   * Change name.
   * @param {string} name - New name
   * @returns {Promise} Resolves when the name was changed
   */
  change_name(name) {
    if (name.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      return this.user_service
        .update_own_user_profile({name})
        .then(() => this.user_update({user: {id: this.self().id, name: name}}));
    }

    return Promise.reject(new z.user.UserError(z.userUserError.TYPE.INVALID_UPDATE));
  }

  /**
   * Whether the user needs to set a username.
   * @returns {boolean} True, if username should be changed.
   */
  should_change_username() {
    return this.should_set_username;
  }

  /**
   * Tries to generate a username suggestion.
   * @returns {Promise} Resolves with the username suggestions
   */
  get_username_suggestion() {
    let suggestions = null;

    return Promise.resolve()
      .then(() => {
        suggestions = z.user.UserHandleGenerator.create_suggestions(this.self().name());
        return this.verify_usernames(suggestions);
      })
      .then(valid_suggestions => {
        this.should_set_username = true;
        this.self().username(valid_suggestions[0]);

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.GENERATED_USERNAME, {
          num_of_attempts: 1,
          outcome: 'success',
        });
      })
      .catch(error => {
        if (error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          this.should_set_username = false;
        }

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.GENERATED_USERNAME, {
          num_of_attempts: 1,
          outcome: 'fail',
        });

        throw error;
      });
  }

  /**
   * Change username.
   * @param {string} username - New username
   * @returns {Promise} Resolves when the username was changed
   */
  change_username(username) {
    if (username.length >= UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH) {
      return this.user_service
        .change_own_username(username)
        .then(() => {
          this.should_set_username = false;
          return this.user_update({user: {handle: username, id: this.self().id}});
        })
        .catch(({code: error_code}) => {
          if (
            [
              z.service.BackendClientError.STATUS_CODE.CONFLICT,
              z.service.BackendClientError.STATUS_CODE.BAD_REQUEST,
            ].includes(error_code)
          ) {
            throw new z.user.UserError(z.user.UserError.TYPE.USERNAME_TAKEN);
          }
          throw new z.user.UserError(z.user.UserError.TYPE.REQUEST_FAILURE);
        });
    }

    return Promise.reject(new z.user.UserError(z.userUserError.TYPE.INVALID_UPDATE));
  }

  /**
   * Verify usernames against the backend.
   * @param {Array} usernames - Username suggestions
   * @returns {Promise<string>} A list with usernames that are not taken.
   */
  verify_usernames(usernames) {
    return this.user_service.check_usernames(usernames);
  }

  /**
   * Verify a username against the backend.
   * @param {string} username - New user name
   * @returns {string} Username which is not taken.
   */
  verify_username(username) {
    return this.user_service
      .check_username(username)
      .catch(({code: error_code}) => {
        if (error_code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          return username;
        }
        if (error_code === z.service.BackendClientError.STATUS_CODE.BAD_REQUEST) {
          throw new z.user.UserError(z.user.UserError.TYPE.USERNAME_TAKEN);
        }
        throw new z.user.UserError(z.user.UserError.TYPE.REQUEST_FAILURE);
      })
      .then(verified_username => {
        if (verified_username) {
          return verified_username;
        }
        throw new z.user.UserError(z.user.UserError.TYPE.USERNAME_TAKEN);
      });
  }

  /**
   * Change the profile image.
   * @param {string|Object} picture - New user picture
   * @returns {Promise} Resolves when the picture was updated
   */
  change_picture(picture) {
    return this.asset_service
      .upload_profile_image(picture)
      .then(([small_key, medium_key]) => {
        const assets = [
          {key: small_key, size: 'preview', type: 'image'},
          {key: medium_key, size: 'complete', type: 'image'},
        ];
        return this.user_service
          .update_own_user_profile({assets})
          .then(() => this.user_update({user: {assets: assets, id: this.self().id}}));
      })
      .catch(error => {
        throw new Error(`Error during profile image upload: ${error.message}`);
      });
  }

  /**
   * Set users default profile image.
   * @returns {undefined} No return value
   */
  set_default_picture() {
    return z.util
      .load_url_blob(z.config.UNSPLASH_URL)
      .then(blob => this.change_picture(blob))
      .then(() => {
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.ONBOARDING.ADDED_PHOTO, {
          outcome: 'success',
          source: 'unsplash',
        });
      });
  }

  map_guest_status(user_ets = this.users()) {
    const team_members = this.team_members();

    user_ets.forEach(user_et => {
      if (!user_et.is_me) {
        const is_team_member = !!team_members.find(member => member.id === user_et.id);
        user_et.is_guest(!is_team_member);
        user_et.is_team_member(is_team_member);
      }
    });
  }
};
