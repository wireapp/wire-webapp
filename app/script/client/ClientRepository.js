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
window.z.client = z.client || {};

z.client.ClientRepository = class ClientRepository {
  static get PRIMARY_KEY_CURRENT_CLIENT() {
    return 'local_identity';
  }

  constructor(client_service, cryptography_repository) {
    this.client_service = client_service;
    this.cryptography_repository = cryptography_repository;
    this.self_user = ko.observable(undefined);
    this.logger = new z.util.Logger('z.client.ClientRepository', z.config.LOGGER.OPTIONS);

    this.client_mapper = new z.client.ClientMapper();
    this.clients = ko.pureComputed(() => this.self_user() ? this.self_user().devices() : []);
    this.current_client = ko.observable();

    amplify.subscribe(z.event.Backend.USER.CLIENT_ADD, this.map_self_client.bind(this));
    amplify.subscribe(z.event.Backend.USER.CLIENT_REMOVE, this.on_client_remove.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.ASK_TO_CLEAR_DATA, this.logout_client.bind(this));
    // todo: deprecated - remove when user base of wrappers version >= 2.12 is large enough
    amplify.subscribe(z.event.WebApp.LOGOUT.ASK_TO_CLEAR_DATA, this.logout_client.bind(this));
  }

  init(self_user) {
    this.self_user(self_user);
    this.logger.info(`Initialized repository with user ID '${this.self_user().id}'`);
  }

  //##############################################################################
  // Service interactions
  //##############################################################################

  delete_client_from_db(user_id, client_id) {
    return this.client_service.delete_client_from_db(this._construct_primary_key(user_id, client_id));
  }

  /**
   * Delete the temporary client on the backend.
   * @returns {Promise} Resolves when the temporary client was deleted on the backend
   */
  delete_temporary_client() {
    return this.client_service.delete_temporary_client(this.current_client().id);
  }

  /**
   * Load all known clients from the database.
   * @returns {Promise} Resolves with all the clients found in the local database
   */
  get_all_clients_from_db() {
    return this.client_service.load_all_clients_from_db()
    .then((clients) => {
      const user_client_map = {};
      for (const client of clients) {
        const ids = z.client.Client.dismantle_user_client_id(client.meta.primary_key);
        if (!ids.user_id || [this.self_user().id, z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT].includes(ids.user_id)) {
          continue;
        }
        user_client_map[ids.user_id] = user_client_map[ids.user_id] || [];
        user_client_map[ids.user_id].push(this.client_mapper.map_client(client));
      }
      return user_client_map;
    });
  }

  /**
   * Retrieves meta information about specific client of the self user.
   * @param {string} client_id - ID of client to be retrieved
   * @returns {Promise} Resolves with the retrieved client information
   */
  get_client_by_id_from_backend(client_id) {
    return this.client_service.get_client_by_id(client_id);
  }

  /**
   * Loads a client from the database (if it exists).
   * @returns {Promise<z.client.Client>} Resolves with the local client
   */
  get_current_client_from_db() {
    return this.client_service.load_client_from_db(z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT)
    .catch(() => {
      throw new z.client.ClientError(z.client.ClientError.TYPE.DATABASE_FAILURE);
    })
    .then((client_payload) => {
      if (_.isString(client_payload)) {
        this.logger.info(`No current local client connected to '${z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT}' found in database`);
        throw new z.client.ClientError(z.client.ClientError.TYPE.NO_LOCAL_CLIENT);
      }
      const client_et = this.client_mapper.map_client(client_payload);
      this.current_client(client_et);
      this.logger.info(`Loaded local client '${client_et.id}' connected to '${z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT}'`, this.current_client());
      return this.current_client();
    });
  }

  /**
   * Construct the primary key to store clients in database.
   * @private
   *
   * @param {string} user_id - User ID from the owner of the client
   * @param {string} client_id - ID of the client
   * @returns {string} Primary key
   */
  _construct_primary_key(user_id, client_id) {
    if (!user_id) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.NO_USER_ID);
    }
    if (!client_id) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.NO_CLIENT_ID);
    }
    return `${user_id}@${client_id}`;
  }

  /**
   * Save the a client into the database.
   *
   * @private
   * @param {string} user_id - ID of user client to be stored belongs to
   * @param {Object} client_payload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  save_client_in_db(user_id, client_payload) {
    const primary_key = this._construct_primary_key(user_id, client_payload.id);
    return this.client_service.save_client_in_db(primary_key, client_payload);
  }

  /**
   * Updates properties for a client record in database.
   *
   * @todo Merge "meta" property before updating it, Object.assign(payload.meta, changes.meta)
   * @param {string} user_id - User ID of the client owner
   * @param {string} client_id - Client ID which needs to get updated
   * @param {string} changes - New values which should be updated on the client
   * @returns {number} Number of updated records
   */
  update_client_in_db(user_id, client_id, changes) {
    const primary_key = this._construct_primary_key(user_id, client_id);
    // Preserve primary key on update
    changes.meta.primary_key = primary_key;
    return this.client_service.update_client_in_db(primary_key, changes);
  }

  /**
   * Change verification state of client.
   *
   * @param {string} user_id - User ID of the client owner
   * @param {z.client.Client} client_et - Client which needs to get updated
   * @param {boolean} is_verified - New state to apply
   * @returns {Promise} Resolves when the verification state has been updated
   */
  verify_client(user_id, client_et, is_verified) {
    return this.update_client_in_db(user_id, client_et.id, {meta: {is_verified}})
    .then(() => {
      client_et.meta.is_verified(is_verified);
      return amplify.publish(z.event.WebApp.CLIENT.VERIFICATION_STATE_CHANGED, user_id, client_et, is_verified);
    });
  }

  /**
   * Save the local client into the database.
   *
   * @private
   * @param {Object} client_payload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  _save_current_client_in_db(client_payload) {
    client_payload.meta = {is_verified: true};
    return this.client_service.save_client_in_db(z.client.ClientRepository.PRIMARY_KEY_CURRENT_CLIENT, client_payload);
  }

  /**
   * Updates a client payload if it does not fit the current database structure.
   *
   * @private
   * @param {string} user_id - User ID of the client owner
   * @param {Object} client_payload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  _update_client_schema_in_db(user_id, client_payload) {
    client_payload.meta = {
      is_verified: false,
      primary_key: this._construct_primary_key(user_id, client_payload.id),
    };
    return this.save_client_in_db(user_id, client_payload);
  }

  //##############################################################################
  // Login and registration
  //##############################################################################

  /**
   * Constructs the value for a cookie label.
   * @param {string} login - Email or phone number of the user
   * @param {z.client.ClientType} client_type - Temporary or permanent client type
   * @returns {string} Cookie label
   */
  construct_cookie_label(login, client_type = this._load_current_client_type()) {
    const login_hash = z.util.murmurhash3(login, 42);
    return `webapp@${login_hash}@${client_type}@${Date.now()}`;
  }

  /**
   * Constructs the key for a cookie label.
   * @param {string} login - Email or phone number of the user
   * @param {z.client.ClientType} client_type - Temporary or permanent client type
   * @returns {string} Cookie label key
   */
  construct_cookie_label_key(login, client_type = this._load_current_client_type()) {
    const login_hash = z.util.murmurhash3(login, 42);
    return `${z.storage.StorageKey.AUTH.COOKIE_LABEL}@${login_hash}@${client_type}`;
  }

  /**
   * Get and validate the local client.
   * @returns {Promise} Resolve with an observable containing the client if valid
   */
  get_valid_local_client() {
    return this.get_current_client_from_db()
    .then((client_et) => this.get_client_by_id_from_backend(client_et.id))
    .then((client) => {
      this.logger.info(`Client with ID '${client.id}' (${client.type}) validated on backend`);
      return this.current_client;
    })
    .catch((error) => {
      const client_et = this.current_client();
      this.current_client(undefined);

      if (error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
        this.logger.warn(`Local client '${client_et.id}' (${client_et.type}) no longer exists on the backend`, error);
        return Promise.resolve()
        .then(() => {
          if (client_et.is_temporary()) {
            return this.cryptography_repository.storage_repository.delete_everything();
          }
          return this.cryptography_repository.storage_repository.delete_cryptography();
        })
        .catch((database_error) => {
          this.logger.error(`Deleting crypto database after failed client validation unsuccessful: ${database_error.message}`, database_error);
          throw new z.client.ClientError(z.client.ClientError.TYPE.DATABASE_FAILURE);
        })
        .then(() => {
          throw new z.client.ClientError(z.client.ClientError.TYPE.MISSING_ON_BACKEND);
        });
      } else if (error.type === z.client.ClientError.TYPE.NO_LOCAL_CLIENT) {
        this.cryptography_repository.storage_repository.delete_cryptography();
        throw error;
      } else {
        this.logger.error(`Getting valid local client failed: ${error.code || error.message}`, error);
        throw error;
      }
    });
  }

  /**
   * Register a new client.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/registerClient
   *
   * @note Password is needed for the registration of a client once 1st client has been registered.
   * @param {string} password - User password for verification
   * @returns {Promise<z.client.Client>} Resolve with the newly registered client
   */
  register_client(password) {
    const client_type = this._load_current_client_type();

    return this.cryptography_repository.generate_client_keys()
    .then((keys) => {
      return this.client_service.post_clients(this._create_registration_payload(client_type, password, keys));
    })
    .catch((error) => {
      if (error.label === z.service.BackendClientError.LABEL.TOO_MANY_CLIENTS) {
        throw new z.client.ClientError(z.client.ClientError.TYPE.TOO_MANY_CLIENTS);
      }
      this.logger.error(`Client registration request failed: ${error.message}`, error);
      throw new z.client.ClientError(z.client.ClientError.TYPE.REQUEST_FAILURE);
    })
    .then((response) => {
      this.logger.info(`Registered '${response.type}' client '${response.id}' with cookie label '${response.cookie}'`, response);
      this.current_client(this.client_mapper.map_client(response));
      return this._save_current_client_in_db(response);
    })
    .catch((error) => {
      if ([z.client.ClientError.TYPE.REQUEST_FAILURE, z.client.ClientError.TYPE.TOO_MANY_CLIENTS].includes(error.type)) {
        throw error;
      }
      this.logger.error(`Failed to save client: ${error.message}`, error);
      throw new z.client.ClientError(z.client.ClientError.TYPE.DATABASE_FAILURE);
    })
    .then((client_payload) => {
      return this._transfer_cookie_label(client_type, client_payload.cookie);
    })
    .then(() => {
      return this.current_client;
    })
    .catch((error) => {
      this.logger.error(`Client registration failed: ${error.message}`, error);
      throw error;
    });
  }

  /**
   * Create payload for client registration.
   *
   * @private
   * @param {z.client.ClientType} client_type - Type of client to be registered
   * @param {string} password - User password
   * @param {string} last_resort_key - Last resort key
   * @param {Array<string>} pre_keys - Pre-keys
   * @param {Array<string>} signaling_keys - Signaling keys
   * @returns {Object} - Payload to register client with backend
   */
  _create_registration_payload(client_type, password, [last_resort_key, pre_keys, signaling_keys]) {
    let device_label = `${platform.os.family}`;

    if (platform.os.version) {
      device_label += ` ${platform.os.version}`;
    }

    let device_model = platform.name;

    if (z.util.Environment.electron) {
      let identifier;
      if (z.util.Environment.os.mac) {
        identifier = z.string.wire_macos;
      } else if (z.util.Environment.os.win) {
        identifier = z.string.wire_windows;
      } else {
        identifier = z.string.wire_linux;
      }
      device_model = z.localization.Localizer.get_text(identifier);
      if (!z.util.Environment.frontend.is_production()) {
        device_model = `${device_model} (Internal)`;
      }
    } else if (client_type === z.client.ClientType.TEMPORARY) {
      device_model = `${device_model} (Temporary)`;
    }

    return {
      class: 'desktop',
      cookie: this._get_cookie_label_value(this.self_user().email() || this.self_user().phone()),
      label: device_label,
      lastkey: last_resort_key,
      model: device_model,
      password,
      prekeys: pre_keys,
      sigkeys: signaling_keys,
      type: client_type,
    };
  }

  /**
   * Gets the value for a cookie label.
   * @private
   * @param {string} login - Email or phone number of the user
   * @returns {string} Cookie label
   */
  _get_cookie_label_value(login) {
    return z.util.StorageUtil.get_value(this.construct_cookie_label_key(login));
  }

  /**
   * Loads the cookie label value from the Local Storage and saves it into IndexedDB.
   *
   * @private
   * @param {z.client.ClientType} client_type - Temporary or permanent client type
   * @param {string} cookie_label - Cookie label, something like "webapp@2153234453@temporary@145770538393"
   * @returns {Promise} Resolves with the key of the stored cookie label
   */
  _transfer_cookie_label(client_type, cookie_label) {
    const indexed_db_key = z.storage.StorageKey.AUTH.COOKIE_LABEL;
    const local_storage_key = this.construct_cookie_label_key(this.self_user().email() || this.self_user().phone(), client_type);

    if (cookie_label === undefined) {
      cookie_label = this.construct_cookie_label(this.self_user().email() || this.self_user().phone(), client_type);
      this.logger.warn(`Cookie label is in an invalid state. We created a new one: '${cookie_label}'`);
      z.util.StorageUtil.set_value(local_storage_key, cookie_label);
    }

    this.logger.info(`Saving cookie label '${cookie_label}' in IndexedDB`, {
      key: local_storage_key,
      value: cookie_label,
    });

    return this.cryptography_repository.storage_repository.save_value(indexed_db_key, cookie_label);
  }

  /**
   * Load current client type from amplify store.
   * @private
   * @returns {z.client.ClientType} Type of current client
   */
  _load_current_client_type() {
    if (this.current_client()) {
      return this.current_client().type;
    }
    const is_permanent = z.util.StorageUtil.get_value(z.storage.StorageKey.AUTH.PERSIST);
    const type = is_permanent ? z.client.ClientType.PERMANENT : z.client.ClientType.TEMPORARY;
    return z.util.Environment.electron ? z.client.ClientType.PERMANENT : type;
  }


  //##############################################################################
  // Client handling
  //##############################################################################

  /**
   * Cleanup local sessions.
   * @note If quick_clean parameter is set to false, there will be one backend request per user that has a session.
   * @param {boolean} [quick_clean=true] - Optional value whether to check all users with local sessions or the ones with too many sessions
   * @returns {undefined} No return value
   */
  cleanup_clients_and_sessions(quick_clean = true) {
    const object = this.cryptography_repository.create_user_session_map();

    for (const user_id in object) {
      const client_ids = object[user_id];
      const log_level = client_ids > 8 ? this.logger.levels.WARN : this.logger.levels.INFO;

      if (!quick_clean || !(client_ids.length <= 8)) {
        this.logger.log(log_level, `User '${user_id}' has session with '${client_ids.length}' clients locally`);
        this._remove_obsolete_client_for_user_by_id(user_id, client_ids);
      }
    }
  }

  /**
   * Delete client of a user on backend and removes it locally.
   *
   * @param {string} client_id - ID of the client that should be deleted
   * @param {string} password - Password entered by user
   * @returns {Promise} Resolves with the remaining user devices
   */
  delete_client(client_id, password) {
    if (!password) {
      this.logger.error(`Could not delete client '${client_id}' because password is missing`);
      return Promise.reject(new z.client.ClientError(z.client.ClientError.TYPE.REQUEST_FORBIDDEN));
    }

    return this.client_service.delete_client(client_id, password)
    .then(() => {
      return this.delete_client_from_db(this.self_user().id, client_id);
    })
    .then(() => {
      this.self_user().remove_client(client_id);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, {outcome: 'success'});
      amplify.publish(z.event.WebApp.USER.CLIENT_REMOVED, this.self_user().id, client_id);
      return this.clients();
    })
    .catch((error) => {
      this.logger.error(`Unable to delete client '${client_id}': ${error.message}`, error);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, {outcome: 'fail'});

      if (error.code === z.service.BackendClientError.STATUS_CODE.FORBIDDEN) {
        error = new z.client.ClientError(z.client.ClientError.TYPE.REQUEST_FORBIDDEN);
      } else {
        error = new z.client.ClientError(z.client.ClientError.TYPE.REQUEST_FAILURE);
      }
      throw error;
    });
  }

  logout_client() {
    if (this.current_client().type === z.client.ClientType.PERMANENT) {
      return amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.LOGOUT, {
        action(clear_data) {
          return amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.USER_REQUESTED, clear_data);
        },
      });
    }
    return this.delete_temporary_client()
    .then(() => amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.USER_REQUESTED, true));
  }

  /**
   * Removes a stored client and the session connected with it.
   *
   * @param {string} user_id - ID of user
   * @param {string} client_id - ID of client to be deleted
   * @returns {Promise} Resolves when a client and its session have been deleted
   */
  remove_client(user_id, client_id) {
    return this.cryptography_repository.delete_session(user_id, client_id)
    .then(() => this.delete_client_from_db(user_id, client_id));
  }

  /**
   * Retrieves meta information about all the clients of a given user.
   * @note If you want to get very detailed information about the devices from the own user, then use "@get_clients"
   *
   * @param {string} user_id - User ID to retrieve client information for
   * @returns {Promise} Resolves with an array of client entities
   */
  get_clients_by_user_id(user_id) {
    return this.client_service.get_clients_by_user_id(user_id)
    .then((clients) => this._update_clients_for_user(user_id, clients))
    .then((client_ets) => {
      amplify.publish(z.event.WebApp.CLIENT.UPDATE, user_id, client_ets);
      return client_ets;
    });
  }

  get_client_by_user_id_from_db(user_id) {
    return this.client_service.load_all_clients_from_db()
    .then((clients) => {
      return clients.filter((client) => {
        return (z.client.Client.dismantle_user_client_id(client.meta.primary_key)).user_id === user_id;
      });
    });
  }

  /**
   * Retrieves meta information about all the clients of the self user.
   * @returns {Promise} Resolves with the retrieved information about the clients
   */
  get_clients_for_self() {
    this.logger.info(`Retrieving all clients for the self user '${this.self_user().id}'`);
    return this.client_service.get_clients()
    .then((response) => this._update_clients_for_user(this.self_user().id, response))
    .then((client_ets) => {
      for (const client_et of client_ets) {
        this.self_user().add_client(client_et);
      }
      return this.self_user().devices();
    });
  }

  /**
   * Is the current client permanent.
   * @returns {boolean} Type of current client is permanent
   */
  is_current_client_permanent() {
    if (!this.current_client()) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.CLIENT_NOT_SET);
    }
    return z.util.Environment.electron || this.current_client().is_permanent();
  }

  /**
   * Remove obsolete clients and sessions for given user.
   *
   * @private
   * @param {string} user_id - ID of user to check clients and sessions off
   * @param {Array<string>} client_ids - Contains IDs of local sessions for user
   * @returns {Promise} Resolves when obsolete clients have been removed
   */
  _remove_obsolete_client_for_user_by_id(user_id, client_ids) {
    return this.get_clients_by_user_id(user_id)
    .then((client_ets) => {
      this.logger.info(`For user '${user_id}' backend found '${client_ets.length}' active clients. Locally there are sessions for '${client_ids.length}' clients`, {
        clients: client_ets,
        sessions: client_ids,
      });
      for (const client_id of client_ids) {
        let deleted_client = true;
        for (const client_et of client_ets) {
          if (client_et.id === client_id) {
            deleted_client = false;
            break;
          }
        }
        if (deleted_client) {
          this.logger.log(`Client '${client_id}' of user '${user_id}' is obsolete and will be removed`);
          this.remove_client(user_id, client_id);
        }
      }
    });
  }

  /**
   * Match backend client response with locally stored ones.
   * @note This function matches clients retrieved from the backend with the data stored in the local database.
   *   Clients will then be updated with the backend payload in the database and mapped into entities.
   *
   * @private
   * @param {string} user_id - ID of user to update clients for
   * @param {Object} clients - Payload from the backend
   * @returns {Promise<Array<z.client.Client>>} Resolves with the client entities
   */
  _update_clients_for_user(user_id, clients) {
    const clients_from_backend = {};
    const clients_stored_in_db = [];

    for (const client of clients) {
      clients_from_backend[client.id] = client;
    }

    // Find clients in database
    return this.get_client_by_user_id_from_db(user_id)
    .then((results) => {
      const promises = [];

      for (const result of results) {
        if (clients_from_backend[result.id]) {
          const {client, was_updated} = this.client_mapper.update_client(result, clients_from_backend[result.id]);

          delete clients_from_backend[result.id];

          if (this.current_client() && this._is_current_client(user_id, result.id)) {
            this.logger.warn(`Removing duplicate self client '${result.id}' locally`);
            this.remove_client(user_id, result.id);
          }

          // Locally known client changed on backend
          if (was_updated) {
            this.logger.info(`Updating client '${result.id}' of user '${user_id}' locally`);
            promises.push(this.save_client_in_db(user_id, client));
            continue;
          }

          // Locally known client unchanged on backend
          clients_stored_in_db.push(client);
          continue;
        }

        // Locally known client deleted on backend
        this.logger.warn(`Removing client '${result.id}' of user '${user_id}' locally`);
        this.remove_client(user_id, result.id);
      }

      for (const client_id in clients_from_backend) {
        const client_payload = clients_from_backend[client_id];

        if (this.current_client() && this._is_current_client(user_id, client_id)) {
          continue;
        }

        // Locally unknown client new on backend
        this.logger.info(`New client '${client_id}' of user '${user_id}' will be stored locally`);
        if (this.self_user().id === user_id) {
          this.map_self_client({client: client_payload});
        }
        promises.push(this._update_client_schema_in_db(user_id, client_payload));
      }

      return Promise.all(promises);
    })
    .then((new_records) => {
      return this.client_mapper.map_clients(clients_stored_in_db.concat(new_records));
    })
    .catch((error) => {
      this.logger.error(`Unable to retrieve clients for user '${user_id}': ${error.message}`, error);
      throw error;
    });
  }

  /**
   * Check if client is current local client.
   *
   * @private
   * @param {string} user_id - User ID to be checked
   * @param {string} client_id - ID of client to be checked
   * @returns {boolean} Is the client the current local client
  */
  _is_current_client(user_id, client_id) {
    if (!this.current_client()) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.CLIENT_NOT_SET);
    }
    if (!user_id) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.NO_USER_ID);
    }
    if (!client_id) {
      throw new z.client.ClientError(z.client.ClientError.TYPE.NO_CLIENT_ID);
    }
    return (user_id === this.self_user().id) && (client_id === this.current_client().id);
  }


  //##############################################################################
  // Conversation Events
  //##############################################################################

  /**
   * A client was added by the self user.
   * @param {Object} event_json - JSON data of 'user.client-add' event
   * @returns {undefined} No return value
   */
  map_self_client(event_json) {
    this.logger.info('Client of self user added', event_json);
    const client_et = this.client_mapper.map_client(event_json.client);
    amplify.publish(z.event.WebApp.CLIENT.ADD, this.self_user().id, client_et);
  }

  /**
   * A client was removed by the self user.
   * @param {Object} [event_json={}] - JSON data of 'user.client-remove' event
   * @returns {Promise} Resolves when the event has been handled
   */
  on_client_remove(event_json = {}) {
    const client_id = event_json.client !== null ? event_json.client.id : undefined;
    if (client_id) {
      if (client_id === this.current_client().id) {
        return this.cryptography_repository.storage_repository.delete_cryptography()
        .then(() => {
          amplify.publish(z.event.WebApp.LIFECYCLE.SIGN_OUT, z.auth.SignOutReason.CLIENT_REMOVED, this.current_client().is_temporary());
        });
      }
      amplify.publish(z.event.WebApp.CLIENT.REMOVE, this.self_user().id, client_id);
    }
  }
};
