/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import platform from 'platform';

import {getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {t} from 'Util/LocalizerUtil';
import {murmurhash3} from 'Util/util';
import {Environment} from 'Util/Environment';

import {Config} from '../auth/config';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {BackendEvent} from '../event/Backend';
import {WebAppEvents} from '../event/WebApp';
import {StorageKey} from '../storage/StorageKey';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';

import {ClientService} from './ClientService';
import {ClientType} from './ClientType';
import {ClientEntity} from './ClientEntity';
import {ClientMapper} from './ClientMapper';

export class ClientRepository {
  static get CONFIG() {
    return {
      AVERAGE_NUMBER_OF_CLIENTS: 4,
    };
  }

  static get PRIMARY_KEY_CURRENT_CLIENT() {
    return 'local_identity';
  }

  constructor(backendClient, storageService, cryptographyRepository) {
    this.clientService = new ClientService(backendClient, storageService);
    this.cryptographyRepository = cryptographyRepository;
    this.selfUser = ko.observable(undefined);
    this.logger = getLogger('ClientRepository');

    this.clientMapper = new ClientMapper();
    this.clients = ko.pureComputed(() => (this.selfUser() ? this.selfUser().devices() : []));
    this.currentClient = ko.observable();

    this.isTemporaryClient = ko.pureComputed(() => this.currentClient() && this.currentClient().isTemporary());

    amplify.subscribe(WebAppEvents.LIFECYCLE.ASK_TO_CLEAR_DATA, this.logoutClient.bind(this));
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
  }

  init(selfUser) {
    this.selfUser(selfUser);
    this.logger.info(`Initialized repository with user ID '${this.selfUser().id}'`);
  }

  __test__assignEnvironment(data) {
    Object.assign(Environment, data);
  }

  //##############################################################################
  // Service interactions
  //##############################################################################

  deleteClientFromDb(userId, clientId) {
    return this.clientService.deleteClientFromDb(this._constructPrimaryKey(userId, clientId));
  }

  /**
   * Delete the temporary client on the backend.
   * @returns {Promise} Resolves when the temporary client was deleted on the backend
   */
  deleteTemporaryClient() {
    return this.clientService.deleteTemporaryClient(this.currentClient().id);
  }

  /**
   * Load all known clients from the database.
   * @returns {Promise} Resolves with all the clients found in the local database
   */
  getAllClientsFromDb() {
    return this.clientService.loadAllClientsFromDb().then(clients => {
      const recipients = {};
      const skippedUserIds = [this.selfUser().id, ClientRepository.PRIMARY_KEY_CURRENT_CLIENT];

      for (const client of clients) {
        const {userId} = ClientEntity.dismantleUserClientId(client.meta.primary_key);
        if (userId && !skippedUserIds.includes(userId)) {
          recipients[userId] = recipients[userId] || [];
          recipients[userId].push(this.clientMapper.mapClient(client, false));
        }
      }
      return recipients;
    });
  }

  /**
   * Retrieves meta information about specific client of the self user.
   * @param {string} clientId - ID of client to be retrieved
   * @returns {Promise} Resolves with the retrieved client information
   */
  getClientByIdFromBackend(clientId) {
    return this.clientService.getClientById(clientId).catch(error => {
      const clientNotFoundBackend = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
      if (clientNotFoundBackend) {
        this.logger.warn(`Local client '${clientId}' no longer exists on the backend`, error);
        throw new z.error.ClientError(z.error.ClientError.TYPE.NO_VALID_CLIENT);
      }

      throw error;
    });
  }

  /**
   * Loads a client from the database (if it exists).
   * @returns {Promise<ClientEntity>} Resolves with the local client
   */
  getCurrentClientFromDb() {
    return this.clientService
      .loadClientFromDb(ClientRepository.PRIMARY_KEY_CURRENT_CLIENT)
      .catch(() => {
        throw new z.error.ClientError(z.error.ClientError.TYPE.DATABASE_FAILURE);
      })
      .then(clientPayload => {
        if (_.isString(clientPayload)) {
          this.logger.info('No local client found in database');
          throw new z.error.ClientError(z.error.ClientError.TYPE.NO_VALID_CLIENT);
        }

        const currentClient = this.clientMapper.mapClient(clientPayload, true);
        this.currentClient(currentClient);
        this.logger.info(`Loaded local client '${currentClient.id}'`, this.currentClient());
        return this.currentClient();
      });
  }

  /**
   * Construct the primary key to store clients in database.
   * @private
   *
   * @param {string} userId - User ID from the owner of the client
   * @param {string} clientId - ID of the client
   * @returns {string} Primary key
   */
  _constructPrimaryKey(userId, clientId) {
    if (!userId) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.NO_USER_ID);
    }
    if (!clientId) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.NO_CLIENT_ID);
    }
    return `${userId}@${clientId}`;
  }

  /**
   * Save the a client into the database.
   *
   * @private
   * @param {string} userId - ID of user client to be stored belongs to
   * @param {Object} clientPayload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  saveClientInDb(userId, clientPayload) {
    const primaryKey = this._constructPrimaryKey(userId, clientPayload.id);
    return this.clientService.saveClientInDb(primaryKey, clientPayload);
  }

  /**
   * Updates properties for a client record in database.
   *
   * @todo Merge "meta" property before updating it, Object.assign(payload.meta, changes.meta)
   * @param {string} userId - User ID of the client owner
   * @param {string} clientId - Client ID which needs to get updated
   * @param {string} changes - New values which should be updated on the client
   * @returns {number} Number of updated records
   */
  updateClientInDb(userId, clientId, changes) {
    const primaryKey = this._constructPrimaryKey(userId, clientId);
    // Preserve primary key on update
    changes.meta.primary_key = primaryKey;
    return this.clientService.updateClientInDb(primaryKey, changes);
  }

  /**
   * Change verification state of client.
   *
   * @param {string} userId - User ID of the client owner
   * @param {ClientEntity} clientEntity - Client which needs to get updated
   * @param {boolean} isVerified - New state to apply
   * @returns {Promise} Resolves when the verification state has been updated
   */
  verifyClient(userId, clientEntity, isVerified) {
    return this.updateClientInDb(userId, clientEntity.id, {meta: {is_verified: isVerified}}).then(() => {
      clientEntity.meta.isVerified(isVerified);
      amplify.publish(WebAppEvents.CLIENT.VERIFICATION_STATE_CHANGED, userId, clientEntity, isVerified);
    });
  }

  /**
   * Save the local client into the database.
   *
   * @private
   * @param {Object} clientPayload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  _saveCurrentClientInDb(clientPayload) {
    clientPayload.meta = {is_verified: true};
    return this.clientService.saveClientInDb(ClientRepository.PRIMARY_KEY_CURRENT_CLIENT, clientPayload);
  }

  /**
   * Updates a client payload if it does not fit the current database structure.
   *
   * @private
   * @param {string} userId - User ID of the client owner
   * @param {Object} clientPayload - Client data to be stored in database
   * @returns {Promise} Resolves with the record stored in database
   */
  _updateClientSchemaInDb(userId, clientPayload) {
    clientPayload.meta = {
      is_verified: false,
      primary_key: this._constructPrimaryKey(userId, clientPayload.id),
    };
    return this.saveClientInDb(userId, clientPayload);
  }

  //##############################################################################
  // Login and registration
  //##############################################################################

  /**
   * Constructs the value for a cookie label.
   * @param {string} login - Email or phone number of the user
   * @param {ClientType} clientType - Temporary or permanent client type
   * @returns {string} Cookie label
   */
  constructCookieLabel(login, clientType = this._loadCurrentClientType()) {
    const loginHash = murmurhash3(login || this.selfUser().id, 42);
    return `webapp@${loginHash}@${clientType}@${Date.now()}`;
  }

  /**
   * Constructs the key for a cookie label.
   * @param {string} login - Email or phone number of the user
   * @param {ClientType} clientType - Temporary or permanent client type
   * @returns {string} Cookie label key
   */
  constructCookieLabelKey(login, clientType = this._loadCurrentClientType()) {
    const loginHash = murmurhash3(login || this.selfUser().id, 42);
    return `${StorageKey.AUTH.COOKIE_LABEL}@${loginHash}@${clientType}`;
  }

  /**
   * Get and validate the local client.
   * @returns {Promise} Resolve with an observable containing the client if valid
   */
  getValidLocalClient() {
    return this.getCurrentClientFromDb()
      .then(clientEntity => this.getClientByIdFromBackend(clientEntity.id))
      .then(clientPayload => {
        this.logger.info(`Client with ID '${clientPayload.id}' (${clientPayload.type}) validated on backend`);
        return this.currentClient;
      })
      .catch(error => {
        const clientNotValidated = error.type === z.error.ClientError.TYPE.NO_VALID_CLIENT;
        if (!clientNotValidated) {
          this.logger.error(`Getting valid local client failed: ${error.code || error.message}`, error);
        }

        throw error;
      });
  }

  /**
   * Register a new client.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/registerClient
   *
   * @note Password is needed for the registration of a client once 1st client has been registered.
   * @param {string|undefined} password - User password for verification
   * @returns {Promise<ClientEntity>} Resolve with the newly registered client
   */
  registerClient(password) {
    const clientType = this._loadCurrentClientType();

    return this.cryptographyRepository
      .generateClientKeys()
      .then(keys => this.clientService.postClients(this._createRegistrationPayload(clientType, password, keys)))
      .catch(error => {
        const tooManyClients = error.label === z.error.BackendClientError.LABEL.TOO_MANY_CLIENTS;
        if (tooManyClients) {
          throw new z.error.ClientError(z.error.ClientError.TYPE.TOO_MANY_CLIENTS);
        }
        this.logger.error(`Client registration request failed: ${error.message}`, error);
        throw new z.error.ClientError(z.error.ClientError.TYPE.REQUEST_FAILURE);
      })
      .then(response => {
        const {cookie, id, type} = response;
        this.logger.info(`Registered '${type}' client '${id}' with cookie label '${cookie}'`, response);
        const currentClient = this.clientMapper.mapClient(response, true);
        this.currentClient(currentClient);
        return this._saveCurrentClientInDb(response);
      })
      .catch(error => {
        const handledErrors = [z.error.ClientError.TYPE.REQUEST_FAILURE, z.error.ClientError.TYPE.TOO_MANY_CLIENTS];

        if (handledErrors.includes(error.type)) {
          throw error;
        }
        this.logger.error(`Failed to save client: ${error.message}`, error);
        throw new z.error.ClientError(z.error.ClientError.TYPE.DATABASE_FAILURE);
      })
      .then(clientPayload => this._transferCookieLabel(clientType, clientPayload.cookie))
      .then(() => this.currentClient)
      .catch(error => {
        this.logger.error(`Client registration failed: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Create payload for client registration.
   *
   * @private
   * @param {ClientType} clientType - Type of client to be registered
   * @param {string} password - User password
   * @param {string} lastResortKey - Last resort key
   * @param {Array<string>} preKeys - Pre-keys
   * @param {Array<string>} signalingKeys - Signaling keys
   * @returns {Object} - Payload to register client with backend
   */
  _createRegistrationPayload(clientType, password, [lastResortKey, preKeys, signalingKeys]) {
    let deviceLabel = `${platform.os.family}`;

    if (platform.os.version) {
      deviceLabel += ` ${platform.os.version}`;
    }

    let deviceModel = platform.name;

    if (Environment.desktop) {
      let modelString;
      if (Environment.os.mac) {
        modelString = t('wireMacos', Config.BRAND_NAME);
      } else if (Environment.os.win) {
        modelString = t('wireWindows', Config.BRAND_NAME);
      } else {
        modelString = t('wireLinux', Config.BRAND_NAME);
      }
      deviceModel = modelString;
      if (!Environment.frontend.isProduction()) {
        deviceModel = `${deviceModel} (Internal)`;
      }
    } else if (clientType === ClientType.TEMPORARY) {
      deviceModel = `${deviceModel} (Temporary)`;
    }

    return {
      class: 'desktop',
      cookie: this._getCookieLabelValue(this.selfUser().email() || this.selfUser().phone()),
      label: deviceLabel,
      lastkey: lastResortKey,
      model: deviceModel,
      password: password,
      prekeys: preKeys,
      sigkeys: signalingKeys,
      type: clientType,
    };
  }

  /**
   * Gets the value for a cookie label.
   * @private
   * @param {string} login - Email or phone number of the user
   * @returns {string} Cookie label
   */
  _getCookieLabelValue(login) {
    return loadValue(this.constructCookieLabelKey(login));
  }

  /**
   * Loads the cookie label value from the Local Storage and saves it into IndexedDB.
   *
   * @private
   * @param {ClientType} clientType - Temporary or permanent client type
   * @param {string} cookieLabel - Cookie label, something like "webapp@2153234453@temporary@145770538393"
   * @returns {Promise} Resolves with the key of the stored cookie label
   */
  _transferCookieLabel(clientType, cookieLabel) {
    const indexedDbKey = StorageKey.AUTH.COOKIE_LABEL;
    const userIdentifier = this.selfUser().email() || this.selfUser().phone();
    const localStorageKey = this.constructCookieLabelKey(userIdentifier, clientType);

    if (cookieLabel === undefined) {
      cookieLabel = this.constructCookieLabel(userIdentifier, clientType);
      this.logger.warn(`Cookie label is in an invalid state. We created a new one: '${cookieLabel}'`);
      loadValue(localStorageKey, cookieLabel);
    }

    this.logger.info(`Saving cookie label '${cookieLabel}' in IndexedDB`, {
      key: localStorageKey,
      value: cookieLabel,
    });

    return this.cryptographyRepository.storageRepository.saveValue(indexedDbKey, cookieLabel);
  }

  /**
   * Load current client type from amplify store.
   * @private
   * @returns {ClientType} Type of current client
   */
  _loadCurrentClientType() {
    if (this.currentClient()) {
      return this.currentClient().type;
    }
    const isPermanent = loadValue(StorageKey.AUTH.PERSIST);
    const type = isPermanent ? ClientType.PERMANENT : ClientType.TEMPORARY;
    return Environment.electron ? ClientType.PERMANENT : type;
  }

  //##############################################################################
  // Client handling
  //##############################################################################

  /**
   * Delete client of a user on backend and removes it locally.
   *
   * @param {string} clientId - ID of the client that should be deleted
   * @param {string} password - Password entered by user
   * @returns {Promise} Resolves with the remaining user devices
   */
  deleteClient(clientId, password) {
    return this.clientService
      .deleteClient(clientId, password)
      .then(() => this.deleteClientFromDb(this.selfUser().id, clientId))
      .then(() => {
        this.selfUser().remove_client(clientId);
        amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, this.selfUser().id, clientId);
        return this.clients();
      })
      .catch(error => {
        this.logger.error(`Unable to delete client '${clientId}': ${error.message}`, error);

        const isForbidden = z.error.BackendClientError.STATUS_CODE.FORBIDDEN;
        const errorType = isForbidden
          ? z.error.ClientError.TYPE.REQUEST_FORBIDDEN
          : z.error.ClientError.TYPE.REQUEST_FAILURE;
        throw new z.error.ClientError(errorType);
      });
  }

  removeLocalClient() {
    this.cryptographyRepository.storageRepository.deleteCryptographyStores().then(() => {
      const shouldClearData = this.currentClient().isTemporary();
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.CLIENT_REMOVED, shouldClearData);
    });
  }

  logoutClient() {
    if (this.currentClient()) {
      if (this.isTemporaryClient()) {
        return this.deleteTemporaryClient().then(() =>
          amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true)
        );
      }

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.OPTION, {
        action: clearData => {
          return amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, clearData);
        },
        preventClose: true,
        text: {
          action: t('modalAccountLogoutAction'),
          option: t('modalAccountLogoutOption'),
          title: t('modalAccountLogoutHeadline'),
        },
      });
    }
  }

  /**
   * Removes a stored client and the session connected with it.
   *
   * @param {string} userId - ID of user
   * @param {string} clientId - ID of client to be deleted
   * @returns {Promise} Resolves when a client and its session have been deleted
   */
  removeClient(userId, clientId) {
    return this.cryptographyRepository
      .deleteSession(userId, clientId)
      .then(() => this.deleteClientFromDb(userId, clientId));
  }

  /**
   * Retrieves meta information about all the clients of a given user.
   * @note If you want to get very detailed information about the devices from the own user, then use "@getClients"
   *
   * @param {string} userId - User ID to retrieve client information for
   * @returns {Promise} Resolves with an array of client entities
   */
  getClientsByUserId(userId) {
    return this.clientService
      .getClientsByUserId(userId)
      .then(clientsData => this._updateClientsOfUserById(userId, clientsData));
  }

  getClientByUserIdFromDb(requestedUserId) {
    return this.clientService.loadAllClientsFromDb().then(clients => {
      return clients.filter(client => {
        const {userId} = ClientEntity.dismantleUserClientId(client.meta.primary_key);
        return userId === requestedUserId;
      });
    });
  }

  /**
   * Retrieves meta information about all other locally known clients of the self user.
   * @returns {Promise} Resolves with all locally known clients except the current one
   */
  getClientsForSelf() {
    this.logger.info(`Retrieving all clients of the self user from database`);
    return this.getClientByUserIdFromDb(this.selfUser().id)
      .then(clientsData => this.clientMapper.mapClients(clientsData, true))
      .then(clientEntities => {
        clientEntities.forEach(clientEntity => this.selfUser().add_client(clientEntity));
        return this.selfUser().devices();
      });
  }

  /**
   * Is the current client permanent.
   * @returns {boolean} Type of current client is permanent
   */
  isCurrentClientPermanent() {
    if (!this.currentClient()) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.CLIENT_NOT_SET);
    }
    return Environment.electron || this.currentClient().isPermanent();
  }

  /**
   * Update clients of the self user.
   * @returns {Promise} Resolves when the clients have been updated
   */
  updateClientsForSelf() {
    return this.clientService
      .getClients()
      .then(clientsData => this._updateClientsOfUserById(this.selfUser().id, clientsData, false));
  }

  /**
   * Update clients of a user with the given backend data.
   * @note This function matches clients retrieved from the backend with the data stored in the local database.
   *   Clients will then be updated with the backend payload in the database and mapped into entities.
   *
   * @private
   * @param {string} userId - ID of user whose clients are updated
   * @param {Object} clientsData - Clients data from backend
   * @param {booelan} [publish=true] - Publish changes clients using amplify
   * @returns {Promise<Client[]>} Resolves with the entities once clients have been updated
   */
  _updateClientsOfUserById(userId, clientsData, publish = true) {
    const clientsFromBackend = {};
    const clientsStoredInDb = [];
    const isSelfUser = userId === this.selfUser().id;

    for (const client of clientsData) {
      clientsFromBackend[client.id] = client;
    }

    // Find clients in database
    return this.getClientByUserIdFromDb(userId)
      .then(clientsFromDatabase => {
        const promises = [];

        for (const databaseClient of clientsFromDatabase) {
          const clientId = databaseClient.id;
          const backendClient = clientsFromBackend[clientId];

          if (backendClient) {
            const {client, wasUpdated} = this.clientMapper.updateClient(databaseClient, backendClient);

            delete clientsFromBackend[clientId];

            if (this.currentClient() && this._isCurrentClient(userId, clientId)) {
              this.logger.warn(`Removing duplicate self client '${clientId}' locally`);
              this.removeClient(userId, clientId);
            }

            // Locally known client changed on backend
            if (wasUpdated) {
              this.logger.info(`Updating client '${clientId}' of user '${userId}' locally`);
              promises.push(this.saveClientInDb(userId, client));
              continue;
            }

            // Locally known client unchanged on backend
            clientsStoredInDb.push(client);
            continue;
          }

          // Locally known client deleted on backend
          this.logger.warn(`Removing client '${clientId}' of user '${userId}' locally`);
          this.removeClient(userId, clientId);
        }

        for (const clientId in clientsFromBackend) {
          const clientPayload = clientsFromBackend[clientId];

          if (this.currentClient() && this._isCurrentClient(userId, clientId)) {
            continue;
          }

          // Locally unknown client new on backend
          this.logger.info(`New client '${clientId}' of user '${userId}' will be stored locally`);
          if (this.selfUser().id === userId) {
            this.onClientAdd({client: clientPayload});
          }
          promises.push(this._updateClientSchemaInDb(userId, clientPayload));
        }

        return Promise.all(promises);
      })
      .then(newRecords => this.clientMapper.mapClients(clientsStoredInDb.concat(newRecords), isSelfUser))
      .then(clientEntities => {
        if (publish) {
          amplify.publish(WebAppEvents.CLIENT.UPDATE, userId, clientEntities);
        }
        return clientEntities;
      })
      .catch(error => {
        this.logger.error(`Unable to retrieve clients for user '${userId}': ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Check if client is current local client.
   *
   * @private
   * @param {string} userId - User ID to be checked
   * @param {string} clientId - ID of client to be checked
   * @returns {boolean} Is the client the current local client
   */
  _isCurrentClient(userId, clientId) {
    if (!this.currentClient()) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.CLIENT_NOT_SET);
    }
    if (!userId) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.NO_USER_ID);
    }
    if (!clientId) {
      throw new z.error.ClientError(z.error.ClientError.TYPE.NO_CLIENT_ID);
    }
    return userId === this.selfUser().id && clientId === this.currentClient().id;
  }

  //##############################################################################
  // Conversation Events
  //##############################################################################

  /**
   * Listener for incoming user events.
   *
   * @param {Object} eventJson - JSON data for event
   * @returns {undefined} No return value
   */
  onUserEvent(eventJson) {
    const type = eventJson.type;

    const isClientAdd = type === BackendEvent.USER.CLIENT_ADD;
    if (isClientAdd) {
      return this.onClientAdd(eventJson);
    }

    const isClientRemove = type === BackendEvent.USER.CLIENT_REMOVE;
    if (isClientRemove) {
      this.onClientRemove(eventJson);
    }
  }

  /**
   * A client was added by the self user.
   * @param {Object} eventJson - JSON data of 'user.client-add' event
   * @returns {undefined} No return value
   */
  onClientAdd(eventJson) {
    this.logger.info('Client of self user added', eventJson);
    amplify.publish(WebAppEvents.CLIENT.ADD, this.selfUser().id, eventJson.client, true);
  }

  /**
   * A client was removed by the self user.
   * @param {Object} [eventJson={}] - JSON data of 'user.client-remove' event
   * @returns {Promise} Resolves when the event has been handled
   */
  onClientRemove(eventJson = {}) {
    const clientId = eventJson.client ? eventJson.client.id : undefined;
    if (clientId) {
      const isCurrentClient = clientId === this.currentClient().id;
      if (isCurrentClient) {
        return this.removeLocalClient();
      }

      amplify.publish(WebAppEvents.CLIENT.REMOVE, this.selfUser().id, clientId);
    }
  }
}
