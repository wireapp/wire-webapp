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

import ko from 'knockout';

import {UNSPLASH_URL} from '../externalRoute';
import {t} from 'utils/LocalizerUtil';
import ConsentValue from './ConsentValue';
import ConsentType from './ConsentType';

import UserMapper from './UserMapper';

export default class UserRepository {
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
   * @class UserRepository
   * @param {UserService} user_service - Backend REST API user service implementation
   * @param {AssetService} asset_service - Backend REST API asset service implementation
   * @param {z.self.SelfService} selfService - Backend REST API self service implementation
   * @param {z.client.ClientRepository} client_repository - Repository for all client interactions
   * @param {z.time.ServerTimeRepository} serverTimeRepository - Handles time shift between server and client
   * @param {PropertiesRepository} propertyRepository - Handles account level properties
   */
  constructor(user_service, asset_service, selfService, client_repository, serverTimeRepository, propertyRepository) {
    this.logger = new z.util.Logger('UserRepository', z.config.LOGGER.OPTIONS);

    this.asset_service = asset_service;
    this.client_repository = client_repository;
    this.propertyRepository = propertyRepository;
    this.selfService = selfService;
    this.user_service = user_service;

    this.user_mapper = new UserMapper(serverTimeRepository);
    this.should_set_username = false;

    this.self = ko.observable();
    this.users = ko.observableArray([]);

    this.connect_requests = ko
      .pureComputed(() => {
        return this.users().filter(user_et => user_et.isIncomingRequest());
      })
      .extend({rateLimit: 50});

    this.connected_users = ko
      .pureComputed(() => {
        return this.users()
          .filter(user_et => user_et.isConnected())
          .sort((user_a, user_b) => z.util.StringUtil.sortByPriority(user_a.first_name(), user_b.first_name()));
      })
      .extend({rateLimit: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND});

    this.isActivatedAccount = ko.pureComputed(() => this.self() && !this.self().isTemporaryGuest());
    this.isTemporaryGuest = ko.pureComputed(() => this.self() && this.self().isTemporaryGuest());

    this.isTeam = ko.observable();
    this.teamMembers = undefined;
    this.teamUsers = undefined;

    this.number_of_contacts = ko.pureComputed(() => {
      const contacts = this.isTeam() ? this.teamUsers() : this.connected_users();
      return contacts.filter(user_et => !user_et.isService).length;
    });
    this.number_of_contacts.subscribe(number_of_contacts => {
      amplify.publish(z.event.WebApp.ANALYTICS.SUPER_PROPERTY, z.tracking.SuperProperty.CONTACTS, number_of_contacts);
    });

    amplify.subscribe(z.event.WebApp.CLIENT.ADD, this.addClientToUser.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.REMOVE, this.remove_client_from_user.bind(this));
    amplify.subscribe(z.event.WebApp.CLIENT.UPDATE, this.update_clients_from_user.bind(this));
    amplify.subscribe(z.event.WebApp.USER.SET_AVAILABILITY, this.setAvailability.bind(this));
    amplify.subscribe(z.event.WebApp.USER.EVENT_FROM_BACKEND, this.on_user_event.bind(this));
    amplify.subscribe(z.event.WebApp.USER.PERSIST, this.saveUserInDb.bind(this));
    amplify.subscribe(z.event.WebApp.USER.UPDATE, this.updateUserById.bind(this));
  }

  /**
   * Listener for incoming user events.
   *
   * @param {Object} event_json - JSON data for event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  on_user_event(event_json, source) {
    const type = event_json.type;

    const logObject = {eventJson: JSON.stringify(event_json), eventObject: event_json};
    this.logger.info(`»» User Event: '${type}' (Source: ${source})`, logObject);

    switch (type) {
      case z.event.Backend.USER.DELETE:
        this.user_delete(event_json);
        break;
      case z.event.Backend.USER.UPDATE:
        this.user_update(event_json);
        break;
      case z.event.Client.USER.AVAILABILITY:
        this.onUserAvailability(event_json);
        break;
    }

    // Note: We initially fetch the user properties in the properties repository, so we are not interested in updates to it from the notification stream.
    if (source === z.event.EventRepository.SOURCE.WEB_SOCKET) {
      switch (type) {
        case z.event.Backend.USER.PROPERTIES_DELETE:
          this.propertyRepository.deleteProperty(event_json.key);
          break;
        case z.event.Backend.USER.PROPERTIES_SET:
          this.propertyRepository.setProperty(event_json.key, event_json.value);
          break;
      }
    }
  }

  loadUsers() {
    if (this.isTeam()) {
      return this.user_service
        .loadUserFromDb()
        .then(users => {
          if (users.length) {
            this.logger.log(`Loaded state of '${users.length}' users from database`, users);

            const mappingPromises = users.map(user => {
              return this.get_user_by_id(user.id).then(userEntity => userEntity.availability(user.availability));
            });

            return Promise.all(mappingPromises);
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
    if (this.isTeam()) {
      const {
        from: userId,
        data: {availability},
      } = event;
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
      this.user_mapper.updateUserFromObject(user_et, user);

      if (is_self_user) {
        amplify.publish(z.event.WebApp.TEAM.UPDATE_INFO);
      }

      return user_et;
    });
  }

  /**
   * Update users matching the given connections.
   * @param {Array<z.connection.ConnectionEntity>} connectionEntities - Connection entities
   * @returns {Promise<Array<z.connection.ConnectionEntity>>} Promise that resolves when all connections have been updated
   */
  updateUsersFromConnections(connectionEntities) {
    const userIds = connectionEntities.map(connectionEntity => connectionEntity.userId);
    return this.get_users_by_id(userIds).then(userEntities => {
      userEntities.forEach(userEntity => {
        const connectionEntity = connectionEntities.find(({userId}) => userId === userEntity.id);
        userEntity.connection(connectionEntity);
      });
      return this._assignAllClients();
    });
  }

  /**
   * Assign all locally stored clients to the users.
   * @private
   * @returns {Promise} Promise that resolves with all user entities where client entities have been assigned to.
   */
  _assignAllClients() {
    return this.client_repository.getAllClientsFromDb().then(recipients => {
      const userIds = Object.keys(recipients);
      this.logger.info(`Found locally stored clients for '${userIds.length}' users`, recipients);

      return this.get_users_by_id(userIds).then(userEntities => {
        userEntities.forEach(userEntity => {
          const clientEntities = recipients[userEntity.id];
          const tooManyClients = clientEntities > 8;
          if (tooManyClients) {
            this.logger.warn(`Found '${clientEntities.length}' clients for '${userEntity.name()}'`, clientEntities);
          }
          userEntity.devices(clientEntities);
        });

        return userEntities;
      });
    });
  }

  /**
   * Saves a new client for the first time to the database and adds it to a user's entity.
   *
   * @param {string} userId - ID of user
   * @param {Object} clientPayload - Payload of client which should be added to user
   * @param {boolean} publishClient - Publish new client
   * @returns {Promise} Promise that resolves when a client and its session have been deleted
   */
  addClientToUser(userId, clientPayload, publishClient = false) {
    return this.get_user_by_id(userId).then(userEntity => {
      const clientEntity = this.client_repository.clientMapper.mapClient(clientPayload, userEntity.is_me);
      const wasClientAdded = userEntity.add_client(clientEntity);

      if (wasClientAdded) {
        return this.client_repository.saveClientInDb(userId, clientEntity.toJson()).then(() => {
          if (publishClient) {
            amplify.publish(z.event.WebApp.USER.CLIENT_ADDED, userId, clientEntity);
          }
        });
      }
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
      .removeClient(user_id, client_id)
      .then(() => this.get_user_by_id(user_id))
      .then(user_et => {
        user_et.remove_client(client_id);
        amplify.publish(z.event.WebApp.USER.CLIENT_REMOVED, user_id, client_id);
      });
  }

  /**
   * Update clients for given user.
   * @param {string} user_id - ID of user
   * @param {Array<z.client.ClientEntity>} client_ets - Clients which should get updated
   * @returns {undefined} No return value
   */
  update_clients_from_user(user_id, client_ets) {
    this.get_user_by_id(user_id).then(user_et => {
      user_et.devices(client_ets);
      amplify.publish(z.event.WebApp.USER.CLIENTS_UPDATED, user_id, client_ets);
    });
  }

  setAvailability(availability, method) {
    const hasAvailabilityChanged = availability !== this.self().availability();
    const newAvailabilityValue = z.user.AvailabilityMapper.valueFromType(availability);
    if (hasAvailabilityChanged) {
      const oldAvailabilityValue = z.user.AvailabilityMapper.valueFromType(this.self().availability());
      this.logger.log(`Availability was changed from '${oldAvailabilityValue}' to '${newAvailabilityValue}'`);
      this.self().availability(availability);
      this._trackAvailability(availability, method);
    } else {
      this.logger.log(`Availability was again set to '${newAvailabilityValue}'`);
    }

    const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
    const protoAvailability = new z.proto.Availability(z.user.AvailabilityMapper.protoFromType(availability));
    genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.AVAILABILITY, protoAvailability);

    amplify.publish(z.event.WebApp.BROADCAST.SEND_MESSAGE, genericMessage);
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
    return this.selfService
      .deleteSelf()
      .then(() => this.logger.info('Account deletion initiated'))
      .catch(error => this.logger.error(`Unable to delete self: ${error}`));
  }

  /**
   * Get a user from the backend.
   * @param {string} userId - User ID
   * @returns {Promise<z.entity.User>} Promise that resolves with the user entity
   */
  _fetchUserById(userId) {
    return this.fetchUsersById([userId]).then(([userEntity]) => userEntity);
  }

  /**
   * Get users from the backend.
   * @param {Array<string>} userIds - User IDs
   * @returns {Promise<Array<z.entity.User>>} Promise that resolves with an array of user entities
   */
  fetchUsersById(userIds = []) {
    userIds = userIds.filter(userId => !!userId);

    if (!userIds.length) {
      return Promise.resolve([]);
    }

    const _getUsers = chunkOfUserIds => {
      return this.user_service
        .getUsers(chunkOfUserIds)
        .then(response => (response ? this.user_mapper.mapUsersFromJson(response) : []))
        .catch(error => {
          const isNotFound = error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND;
          if (isNotFound) {
            return [];
          }
          throw error;
        });
    };

    const chunksOfUserIds = z.util.ArrayUtil.chunk(userIds, z.config.MAXIMUM_USERS_PER_REQUEST);
    return Promise.all(chunksOfUserIds.map(chunkOfUserIds => _getUsers(chunkOfUserIds)))
      .then(resolveArray => {
        const newUserEntities = _.flatten(resolveArray);

        if (this.isTeam()) {
          this.mapGuestStatus(newUserEntities);
        }

        return this.save_users(newUserEntities);
      })
      .then(fetchedUserEntities => {
        // If there is a difference then we most likely have a case with a suspended user
        const isAllUserIds = userIds.length === fetchedUserEntities.length;
        if (!isAllUserIds) {
          fetchedUserEntities = this._add_suspended_users(userIds, fetchedUserEntities);
        }

        return fetchedUserEntities;
      });
  }

  /**
   * Find a local user.
   * @param {string} userId - User ID
   * @returns {Promise<z.entity.User>} Resolves with the matching user entity
   */
  findUserById(userId) {
    if (!userId) {
      return Promise.reject(new z.error.UserError(z.error.BaseError.TYPE.MISSING_PARAMETER));
    }

    const matchingUserEntity = this.users().find(userEntity => userEntity.id === userId);
    return matchingUserEntity
      ? Promise.resolve(matchingUserEntity)
      : Promise.reject(new z.error.UserError(z.error.UserError.TYPE.USER_NOT_FOUND));
  }

  /**
   * Get self user from backend.
   * @returns {Promise} Promise that will resolve with the self user entity
   */
  getSelf() {
    return this.selfService
      .getSelf()
      .then(userData => this._upgradePictureAsset(userData))
      .then(response => this.user_mapper.mapSelfUserFromJson(response))
      .then(userEntity => {
        const promises = [this.save_user(userEntity, true), this.initMarketingConsent()];
        return Promise.all(promises).then(() => userEntity);
      })
      .catch(error => {
        this.logger.error(`Unable to load self user: ${error.message || error}`, [error]);
        throw error;
      });
  }

  /**
   * Detects if the user has a profile picture that uses the outdated picture API.
   * Will migrate the picture to the newer assets API if so.
   *
   * @param {Object} userData - user data from the backend
   * @returns {void}
   */
  _upgradePictureAsset(userData) {
    const hasPicture = userData.picture.length;
    const hasAsset = userData.assets.length;

    if (hasPicture) {
      if (!hasAsset) {
        // if there are no assets, just upload the old picture to the new api
        const {medium} = z.assets.AssetMapper.mapProfileAssetsV1(userData.id, userData.picture);
        medium.load().then(imageBlob => this.change_picture(imageBlob));
      } else {
        // if an asset is already there, remove the pointer to the old picture
        this.selfService.putSelf({picture: []});
      }
    }
    return userData;
  }

  /**
   * Check for user locally and fetch it from the server otherwise.
   * @param {string} user_id - User ID
   * @returns {Promise<z.entity.User>} Promise that resolves with the matching user entity
   */
  get_user_by_id(user_id) {
    return this.findUserById(user_id)
      .catch(error => {
        const isNotFound = error.type === z.error.UserError.TYPE.USER_NOT_FOUND;
        if (isNotFound) {
          return this._fetchUserById(user_id);
        }
        throw error;
      })
      .catch(error => {
        const isNotFound = error.type === z.error.UserError.TYPE.USER_NOT_FOUND;
        if (!isNotFound) {
          this.logger.error(`Failed to get user '${user_id}': ${error.message}`, error);
        }
        throw error;
      });
  }

  get_user_id_by_handle(handle) {
    return this.user_service
      .getUserByHandle(handle.toLowerCase())
      .then(({user: user_id}) => user_id)
      .catch(error => {
        if (error.code !== z.error.BackendClientError.STATUS_CODE.NOT_FOUND) {
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
      return this.findUserById(user_id).catch(error => {
        if (error.type !== z.error.UserError.TYPE.USER_NOT_FOUND) {
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

      return this.fetchUsersById(unknown_user_ids).then(user_ets => known_user_ets.concat(user_ets));
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
    return this.findUserById(user_et.id).catch(error => {
      if (error.type !== z.error.UserError.TYPE.USER_NOT_FOUND) {
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
      return this.findUserById(user_et.id)
        .then(() => undefined)
        .catch(error => {
          if (error.type !== z.error.UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
          return user_et;
        });
    };

    const find_users = user_ets.map(user_et => _find_users(user_et));

    return Promise.all(find_users).then(resolve_array => {
      z.util.koArrayPushAll(this.users, resolve_array.filter(user_et => user_et));
      return user_ets;
    });
  }

  /**
   * Update a local user from the backend by ID.
   * @param {string} userId - User ID
   * @returns {Promise} Resolves when user was updated
   */
  updateUserById(userId) {
    const getLocalUser = () =>
      this.findUserById(userId).catch(error => {
        const isNotFound = error.type === z.error.UserError.TYPE.USER_NOT_FOUND;
        if (isNotFound) {
          return new z.entity.User();
        }
        throw error;
      });

    return Promise.all([getLocalUser(userId), this.user_service.getUser(userId)])
      .then(([localUserEntity, updatedUserData]) =>
        this.user_mapper.updateUserFromObject(localUserEntity, updatedUserData)
      )
      .then(userEntity => {
        if (this.isTeam()) {
          this.mapGuestStatus([userEntity]);
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
        user_et.name(t('nonexistentUser'));
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
    return this.selfService
      .putSelf({accent_id})
      .then(() => this.user_update({user: {accent_id: accent_id, id: this.self().id}}));
  }

  /**
   * Change name.
   * @param {string} name - New name
   * @returns {Promise} Resolves when the name was changed
   */
  change_name(name) {
    if (name.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      return this.selfService.putSelf({name}).then(() => this.user_update({user: {id: this.self().id, name: name}}));
    }

    return Promise.reject(new z.error.UserError(z.userUserError.TYPE.INVALID_UPDATE));
  }

  /**
   * Whether the user needs to set a username.
   * @returns {boolean} True, if username should be changed.
   */
  shouldChangeUsername() {
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
      })
      .catch(error => {
        if (error.code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND) {
          this.should_set_username = false;
        }

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
      return this.selfService
        .putSelfHandle(username)
        .then(() => {
          this.should_set_username = false;
          return this.user_update({user: {handle: username, id: this.self().id}});
        })
        .catch(({code: error_code}) => {
          if (
            [
              z.error.BackendClientError.STATUS_CODE.CONFLICT,
              z.error.BackendClientError.STATUS_CODE.BAD_REQUEST,
            ].includes(error_code)
          ) {
            throw new z.error.UserError(z.error.UserError.TYPE.USERNAME_TAKEN);
          }
          throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
        });
    }

    return Promise.reject(new z.error.UserError(z.userUserError.TYPE.INVALID_UPDATE));
  }

  /**
   * Verify usernames against the backend.
   * @param {Array} usernames - Username suggestions
   * @returns {Promise<string>} A list with usernames that are not taken.
   */
  verify_usernames(usernames) {
    return this.user_service.checkUserHandles(usernames);
  }

  /**
   * Verify a username against the backend.
   * @param {string} username - New user name
   * @returns {string} Username which is not taken.
   */
  verify_username(username) {
    return this.user_service
      .checkUserHandle(username)
      .catch(({code: error_code}) => {
        if (error_code === z.error.BackendClientError.STATUS_CODE.NOT_FOUND) {
          return username;
        }
        if (error_code === z.error.BackendClientError.STATUS_CODE.BAD_REQUEST) {
          throw new z.error.UserError(z.error.UserError.TYPE.USERNAME_TAKEN);
        }
        throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
      })
      .then(verified_username => {
        if (verified_username) {
          return verified_username;
        }
        throw new z.error.UserError(z.error.UserError.TYPE.USERNAME_TAKEN);
      });
  }

  /**
   * Change the profile image.
   * @param {string|Object} picture - New user picture
   * @returns {Promise} Resolves when the picture was updated
   */
  change_picture(picture) {
    return this.asset_service
      .uploadProfileImage(picture)
      .then(({previewImageKey, mediumImageKey}) => {
        const assets = [
          {key: previewImageKey, size: 'preview', type: 'image'},
          {key: mediumImageKey, size: 'complete', type: 'image'},
        ];
        return this.selfService
          .putSelf({assets, picture: []})
          .then(() => this.user_update({user: {assets: assets, id: this.self().id}}));
      })
      .catch(error => {
        throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
      });
  }

  /**
   * Set users default profile image.
   * @returns {undefined} No return value
   */
  set_default_picture() {
    return z.util.loadUrlBlob(UNSPLASH_URL).then(blob => this.change_picture(blob));
  }

  mapGuestStatus(userEntities = this.users()) {
    userEntities.forEach(userEntity => {
      if (!userEntity.is_me) {
        const isTeamMember = this.teamMembers().some(teamMember => teamMember.id === userEntity.id);
        const isGuest = !userEntity.isService && !isTeamMember;
        userEntity.isGuest(isGuest);
        userEntity.isTeamMember(isTeamMember);
      }
    });
  }

  initMarketingConsent() {
    if (!z.config.FEATURE.CHECK_CONSENT) {
      this.logger.warn(
        `Consent check feature is disabled. Defaulting to '${this.propertyRepository.marketingConsent()}'`
      );
      return Promise.resolve();
    }
    return this.selfService
      .getSelfConsent()
      .then(consents => {
        for (const {type: consentType, value: consentValue} of consents) {
          const isMarketingConsent = consentType === ConsentType.MARKETING;
          if (isMarketingConsent) {
            const hasGivenConsent = consentValue === ConsentValue.GIVEN;
            this.propertyRepository.marketingConsent(hasGivenConsent);

            this.logger.log(`Marketing consent retrieved as '${consentValue}'`);
            return;
          }
        }

        this.logger.log(`Marketing consent not set. Defaulting to '${this.propertyRepository.marketingConsent()}'`);
      })
      .catch(error => {
        this.logger.warn(`Failed to retrieve marketing consent: ${error.message || error.code}`, error);
      });
  }
}
