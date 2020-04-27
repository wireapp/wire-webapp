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

import {PublicClient} from '@wireapp/api-client/dist/client';
import type {BackendError} from '@wireapp/api-client/dist/http';
import {Availability, GenericMessage} from '@wireapp/protocol-messaging';
import {User as APIClientUser} from '@wireapp/api-client/dist/user';
import {Self as APIClientSelf} from '@wireapp/api-client/dist/self';
import {UserAsset as APIClientUserAsset, UserAssetType as APIClientUserAssetType} from '@wireapp/api-client/dist/user';

import {amplify} from 'amplify';
import ko from 'knockout';
import {flatten} from 'underscore';

import {chunk, partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {sortUsersByPriority} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid, loadUrlBlob} from 'Util/util';
import type {AxiosError} from 'axios';
import {UNSPLASH_URL} from '../externalRoute';

import {mapProfileAssetsV1} from '../assets/AssetMapper';
import {User} from '../entity/User';

import {BackendEvent} from '../event/Backend';
import {ClientEvent} from '../event/Client';
import {EventRepository} from '../event/EventRepository';
import {EventSource} from '../event/EventSource';
import {WebAppEvents} from '../event/WebApp';

import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';
import {EventName} from '../tracking/EventName';
import {SuperProperty} from '../tracking/SuperProperty';

import {
  HIDE_REQUEST_MODAL,
  SHOW_LEGAL_HOLD_MODAL,
  SHOW_REQUEST_MODAL,
} from '../view_model/content/LegalHoldModalViewModel';
import {protoFromType, valueFromType} from './AvailabilityMapper';
import {showAvailabilityModal} from './AvailabilityModal';
import {ConsentType} from './ConsentType';
import {ConsentValue} from './ConsentValue';
import {createSuggestions} from './UserHandleGenerator';
import {UserMapper} from './UserMapper';
import {UserService} from './UserService';

import {AccentColor} from '@wireapp/commons';
import {AssetService} from '../assets/AssetService';
import {ClientEntity} from '../client/ClientEntity';
import {ClientMapper} from '../client/ClientMapper';
import {ClientRepository} from '../client/ClientRepository';
import {Config} from '../Config';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {BackendClientError} from '../error/BackendClientError';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {SelfService} from '../self/SelfService';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserError} from '../error/UserError';

export class UserRepository {
  private readonly asset_service: AssetService;
  private readonly clientRepository: ClientRepository;
  readonly connected_users: ko.PureComputed<User[]>;
  isTeam: ko.Observable<boolean> | ko.PureComputed<boolean>;
  private readonly logger: Logger;
  private readonly propertyRepository: PropertiesRepository;
  private readonly selfService: SelfService;
  teamMembers: ko.PureComputed<User[]>;
  /** Note: this does not include the self user */
  teamUsers: ko.PureComputed<User[]>;
  private readonly directlyConnectedUsers: ko.PureComputed<User[]>;
  private readonly userMapper: UserMapper;
  private readonly userService: UserService;
  private readonly users: ko.ObservableArray<User>;
  private should_set_username: boolean;
  readonly connect_requests: ko.PureComputed<User[]>;
  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly isTemporaryGuest: ko.PureComputed<boolean>;
  readonly number_of_contacts: ko.PureComputed<number>;
  readonly self: ko.Observable<User>;
  getTeamMembersFromUsers: (users: User[]) => Promise<void>;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      MAXIMUM_TEAM_SIZE_BROADCAST: 500,
      MINIMUM_NAME_LENGTH: 2,
      MINIMUM_PICTURE_SIZE: {
        HEIGHT: 320,
        WIDTH: 320,
      },
      MINIMUM_USERNAME_LENGTH: 2,
    };
  }

  constructor(
    userService: UserService,
    asset_service: AssetService,
    selfService: SelfService,
    clientRepository: ClientRepository,
    serverTimeHandler: ServerTimeHandler,
    propertyRepository: PropertiesRepository,
  ) {
    this.logger = getLogger('UserRepository');

    this.asset_service = asset_service;
    this.clientRepository = clientRepository;
    this.propertyRepository = propertyRepository;
    this.selfService = selfService;
    this.userService = userService;

    this.userMapper = new UserMapper(serverTimeHandler);
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
          .sort(sortUsersByPriority);
      })
      .extend({rateLimit: TIME_IN_MILLIS.SECOND});

    this.isActivatedAccount = ko.pureComputed(() => !this.self()?.isTemporaryGuest());
    this.isTemporaryGuest = ko.pureComputed(() => this.self()?.isTemporaryGuest());

    this.isTeam = ko.observable();
    this.teamMembers = ko.pureComputed((): User[] => []);
    this.teamUsers = ko.pureComputed((): User[] => []);
    this.getTeamMembersFromUsers = async (_: User[]) => undefined;
    this.directlyConnectedUsers = ko.pureComputed((): User[] => []);

    this.number_of_contacts = ko.pureComputed(() => {
      const contacts = this.isTeam() ? this.teamUsers() : this.connected_users();
      return contacts.filter(user_et => !user_et.isService).length;
    });
    this.number_of_contacts.subscribe(number_of_contacts => {
      amplify.publish(WebAppEvents.ANALYTICS.SUPER_PROPERTY, SuperProperty.CONTACTS, number_of_contacts);
    });

    amplify.subscribe(WebAppEvents.CLIENT.ADD, this.addClientToUser.bind(this));
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.removeClientFromUser.bind(this));
    amplify.subscribe(WebAppEvents.CLIENT.UPDATE, this.updateClientsFromUser.bind(this));
    amplify.subscribe(WebAppEvents.USER.SET_AVAILABILITY, this.setAvailability.bind(this));
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent.bind(this));
    amplify.subscribe(WebAppEvents.USER.PERSIST, this.saveUserInDb.bind(this));
    amplify.subscribe(WebAppEvents.USER.UPDATE, this.updateUserById.bind(this));
  }

  /**
   * Listener for incoming user events.
   */
  onUserEvent(eventJson: any, source: EventSource): void {
    const type = eventJson.type;

    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» User Event: '${type}' (Source: ${source})`, logObject);

    switch (type) {
      case BackendEvent.USER.DELETE:
        this.userDelete(eventJson);
        break;
      case BackendEvent.USER.UPDATE:
        this.userUpdate(eventJson);
        break;
      case ClientEvent.USER.AVAILABILITY:
        this.onUserAvailability(eventJson);
        break;
      case BackendEvent.USER.LEGAL_HOLD_REQUEST: {
        this.onLegalHoldRequest(eventJson);
        break;
      }
      case BackendEvent.USER.LEGAL_HOLD_DISABLED: {
        this.onLegalHoldRequestCanceled(eventJson);
        break;
      }
    }

    // Note: We initially fetch the user properties in the properties repository, so we are not interested in updates to it from the notification stream.
    if (source === EventRepository.SOURCE.WEB_SOCKET) {
      switch (type) {
        case BackendEvent.USER.PROPERTIES_DELETE:
          this.propertyRepository.deleteProperty(eventJson.key);
          break;
        case BackendEvent.USER.PROPERTIES_SET:
          this.propertyRepository.setProperty(eventJson.key, eventJson.value);
          break;
      }
    }
  }

  async loadUsers(): Promise<void> {
    if (this.isTeam()) {
      const users = await this.userService.loadUserFromDb();

      if (users.length) {
        this.logger.log(`Loaded state of '${users.length}' users from database`, users);

        await Promise.all(
          users.map(user => this.getUserById(user.id).then(userEntity => userEntity.availability(user.availability))),
        );
      }

      this.users().forEach(userEntity => userEntity.subscribeToChanges());
    }
  }

  /**
   * Retrieves meta information about all the clients of a given user.
   */
  getClientsByUserId(userId: string, updateClients: false): Promise<PublicClient[]>;
  getClientsByUserId(userId: string, updateClients?: boolean): Promise<ClientEntity[]>;
  getClientsByUserId(userId: string, updateClients: boolean = true): Promise<ClientEntity[] | PublicClient[]> {
    return this.clientRepository.getClientsByUserId(userId, updateClients);
  }

  /**
   * Persists a conversation state in the database.
   */
  saveUserInDb(userEntity: User): Promise<User> {
    return this.userService.saveUserInDb(userEntity);
  }

  /**
   * Event to delete the matching user.
   */
  userDelete({id}: {id: string}): void {
    // @todo Add user deletion cases for other users
    const isSelfUser = id === this.self().id;
    if (isSelfUser) {
      // Info: Deletion of the user causes a database deletion which may interrupt currently running database operations. That's why we added a timeout, to leave some time for the database to finish running reads/writes before the database connection gets closed and the database gets deleted (WEBAPP-6379).
      window.setTimeout(() => {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 100);
    }
  }

  /**
   * Event to update availability of a user.
   */
  onUserAvailability(event: {data: {availability: Availability.Type}; from: string}): void {
    if (this.isTeam()) {
      const {
        from: userId,
        data: {availability},
      } = event;
      this.getUserById(userId).then(userEntity => userEntity.availability(availability));
    }
  }

  /**
   * Event to update the matching user.
   */
  userUpdate({user}: {user: Partial<APIClientUser>}): Promise<User> {
    const isSelfUser = user.id === this.self().id;
    const userPromise = isSelfUser ? Promise.resolve(this.self()) : this.getUserById(user.id);
    return userPromise.then(user_et => {
      this.userMapper.updateUserFromObject(user_et, user);

      if (isSelfUser) {
        amplify.publish(WebAppEvents.TEAM.UPDATE_INFO);
      }

      return user_et;
    });
  }

  /**
   * Update users matching the given connections.
   */
  updateUsersFromConnections(connectionEntities: ConnectionEntity[]): Promise<User[]> {
    const userIds = connectionEntities.map(connectionEntity => connectionEntity.userId);
    return this.getUsersById(userIds).then(userEntities => {
      userEntities.forEach(userEntity => {
        const connectionEntity = connectionEntities.find(({userId}) => userId === userEntity.id);
        userEntity.connection(connectionEntity);
      });
      return this._assignAllClients();
    });
  }

  /**
   * Assign all locally stored clients to the users.
   * @returns Resolves with all user entities where client entities have been assigned to.
   */
  private _assignAllClients(): Promise<User[]> {
    return this.clientRepository.getAllClientsFromDb().then(recipients => {
      const userIds = Object.keys(recipients);
      this.logger.info(`Found locally stored clients for '${userIds.length}' users`, recipients);

      return this.getUsersById(userIds).then(userEntities => {
        userEntities.forEach(userEntity => {
          const clientEntities = recipients[userEntity.id];
          const tooManyClients = clientEntities.length > 8;
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
   * @returns Resolves with `true` when a client has been added
   */
  addClientToUser(userId: string, clientPayload: object, publishClient: boolean = false): Promise<boolean> {
    return this.getUserById(userId).then(userEntity => {
      const clientEntity = ClientMapper.mapClient(clientPayload, userEntity.isMe);
      const wasClientAdded = userEntity.addClient(clientEntity);

      if (wasClientAdded) {
        return this.clientRepository.saveClientInDb(userId, clientEntity.toJson()).then(() => {
          if (clientEntity.isLegalHold()) {
            amplify.publish(WebAppEvents.USER.LEGAL_HOLD_ACTIVATED, userId);
            const isSelfUser = userId === this.self().id;
            if (isSelfUser) {
              amplify.publish(SHOW_LEGAL_HOLD_MODAL);
            }
          } else if (publishClient) {
            amplify.publish(WebAppEvents.USER.CLIENT_ADDED, userId, clientEntity);
          }
          return wasClientAdded;
        });
      }

      return wasClientAdded;
    });
  }

  /**
   * Removes a stored client and the session connected with it.
   */
  removeClientFromUser(user_id: string, client_id: string): Promise<void> {
    return this.clientRepository
      .removeClient(user_id, client_id)
      .then(() => this.getUserById(user_id))
      .then(user_et => {
        user_et.remove_client(client_id);
        amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, user_id, client_id);
      });
  }

  /**
   * Update clients for given user.
   */
  updateClientsFromUser(user_id: string, client_ets: ClientEntity[]): void {
    this.getUserById(user_id).then(user_et => {
      user_et.devices(client_ets);
      amplify.publish(WebAppEvents.USER.CLIENTS_UPDATED, user_id, client_ets);
    });
  }

  setAvailability(availability: Availability.Type, method: string): void {
    const hasAvailabilityChanged = availability !== this.self().availability();
    const newAvailabilityValue = valueFromType(availability);
    if (hasAvailabilityChanged) {
      const oldAvailabilityValue = valueFromType(this.self().availability());
      this.logger.log(`Availability was changed from '${oldAvailabilityValue}' to '${newAvailabilityValue}'`);
      this.self().availability(availability);
      this._trackAvailability(availability, method);
      showAvailabilityModal(availability);
    } else {
      this.logger.log(`Availability was again set to '${newAvailabilityValue}'`);
    }

    const protoAvailability = new Availability({type: protoFromType(availability)});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.AVAILABILITY]: protoAvailability,
      messageId: createRandomUuid(),
    });

    const sortedUsers = this.directlyConnectedUsers().sort(({id: idA}, {id: idB}) =>
      idA.localeCompare(idB, undefined, {sensitivity: 'base'}),
    );
    const [members, other] = partition(sortedUsers, user => user.isTeamMember());
    const recipients = [this.self(), ...members, ...other].slice(0, UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST);

    amplify.publish(WebAppEvents.BROADCAST.SEND_MESSAGE, {genericMessage, recipients});
  }

  onLegalHoldRequestCanceled(eventJson: any): void {
    if (this.self().id === eventJson.id) {
      this.self().hasPendingLegalHold(false);
      amplify.publish(HIDE_REQUEST_MODAL);
    } else {
      /*
       * TODO:
       * 1) Get User ID from event and check the clients of that user.
       * 2) If there is a legal hold client, remove it (in memory and database).
       * 3) Verify that the removed client is not in the db anymore and not assigned to the user entity.
       */
    }
  }

  async onLegalHoldRequest(eventJson: any): Promise<void> {
    if (this.self().id !== eventJson.id) {
      return;
    }
    const self = this.self();
    self.hasPendingLegalHold(true);
    const {
      client: {id: clientId},
      last_prekey,
      id: userId,
    } = eventJson;

    const fingerprint = await this.clientRepository.cryptographyRepository.getRemoteFingerprint(
      userId,
      clientId,
      last_prekey,
    );
    amplify.publish(SHOW_REQUEST_MODAL, fingerprint);
  }

  /**
   * Track availability action.
   *
   * @param method Method used for availability change
   */
  _trackAvailability(availability: Availability.Type, method: string): void {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.CHANGED_STATUS, {
      method,
      status: valueFromType(availability),
    });
  }

  /**
   * Request account deletion.
   * @returns Resolves when account deletion process has been initiated
   */
  deleteMe(): Promise<void> {
    return this.selfService
      .deleteSelf()
      .then(() => this.logger.info('Account deletion initiated'))
      .catch(error => this.logger.error(`Unable to delete self: ${error}`));
  }

  /**
   * Get a user from the backend.
   */
  _fetchUserById(userId: string): Promise<User> {
    return this.fetchUsersById([userId]).then(([userEntity]) => userEntity);
  }

  /**
   * Get users from the backend.
   */
  async fetchUsersById(userIds: string[] = []): Promise<User[]> {
    userIds = userIds.filter(userId => !!userId);

    if (!userIds.length) {
      return Promise.resolve([]);
    }

    const _getUsers = (chunkOfUserIds: string[]): Promise<(void | User)[]> => {
      return this.userService
        .getUsers(chunkOfUserIds)
        .then(response => (response ? this.userMapper.mapUsersFromJson(response) : []))
        .catch((error: AxiosError | BackendError) => {
          const isNotFound = (error as AxiosError).response?.status === BackendClientError.STATUS_CODE.NOT_FOUND;
          const isBadRequest = (error as BackendError).code === BackendClientError.STATUS_CODE.BAD_REQUEST;
          if (isNotFound || isBadRequest) {
            return [];
          }
          throw error;
        });
    };

    const chunksOfUserIds = chunk(userIds, Config.getConfig().MAXIMUM_USERS_PER_REQUEST) as string[][];
    const resolveArray = await Promise.all(chunksOfUserIds.map(chunkOfUserIds_2 => _getUsers(chunkOfUserIds_2)));
    const newUserEntities = flatten(resolveArray);
    if (this.isTeam()) {
      this.mapGuestStatus(newUserEntities);
    }
    let fetchedUserEntities = this.saveUsers(newUserEntities);
    // If there is a difference then we most likely have a case with a suspended user
    const isAllUserIds = userIds.length === fetchedUserEntities.length;
    if (!isAllUserIds) {
      fetchedUserEntities = this._add_suspended_users(userIds, fetchedUserEntities);
    }
    await this.getTeamMembersFromUsers(fetchedUserEntities);
    return fetchedUserEntities;
  }

  /**
   * Find a local user.
   */
  findUserById(userId: string): User | undefined {
    return this.users().find(userEntity => userEntity.id === userId);
  }

  /**
   * Get self user from backend.
   */
  getSelf(): Promise<User> {
    return this.selfService
      .getSelf()
      .then(userData => this._upgradePictureAsset(userData))
      .then(response => this.userMapper.mapSelfUserFromJson(response))
      .then(userEntity => {
        this.saveUser(userEntity, true);
        return this.initMarketingConsent().then(() => userEntity);
      })
      .catch(error => {
        this.logger.error(`Unable to load self user: ${error.message || error}`, [error]);
        throw error;
      });
  }

  /**
   * Detects if the user has a profile picture that uses the outdated picture API.
   * Will migrate the picture to the newer assets API if so.
   */
  private _upgradePictureAsset(userData: APIClientSelf): APIClientSelf {
    const hasPicture = userData.picture.length;
    const hasAsset = userData.assets.length;

    if (hasPicture) {
      if (!hasAsset) {
        // if there are no assets, just upload the old picture to the new api
        const {medium} = mapProfileAssetsV1(userData.id, userData.picture);
        medium.load().then(imageBlob => this.changePicture(imageBlob as Blob));
      } else {
        // if an asset is already there, remove the pointer to the old picture
        this.selfService.putSelf({picture: []} as any);
      }
    }
    return userData;
  }

  /**
   * Check for user locally and fetch it from the server otherwise.
   */
  getUserById(user_id: string): Promise<User> {
    const user = this.findUserById(user_id);
    return user
      ? Promise.resolve(user)
      : this._fetchUserById(user_id).catch(error => {
          const isNotFound = error.type === UserError.TYPE.USER_NOT_FOUND;
          if (!isNotFound) {
            this.logger.warn(`Failed to find user with ID '${user_id}': ${error.message}`, error);
          }
          throw error;
        });
  }

  async getUserIdByHandle(handle: string): Promise<void | string> {
    try {
      const {user: user_id} = await this.userService.getUserByHandle(handle.toLowerCase());
      return user_id;
    } catch (axiosError) {
      const error = axiosError.response || axiosError;
      if (error.status !== BackendClientError.STATUS_CODE.NOT_FOUND) {
        throw error;
      }
    }
  }

  /**
   * Check for users locally and fetch them from the server otherwise.
   * @param user_ids List of user ID
   * @param offline Should we only look for cached contacts
   */
  getUsersById(user_ids: string[] = [], offline: boolean = false): Promise<User[]> {
    if (!user_ids.length) {
      return Promise.resolve([]);
    }

    const _find_user = (user_id: string): string | User => {
      return this.findUserById(user_id) || user_id;
    };

    const findUsers = user_ids.map(user_id => _find_user(user_id));

    return Promise.all(findUsers).then(resolveArray => {
      const [knownUserEts, unknownUserIds] = partition(resolveArray, item => typeof item !== 'string') as [
        User[],
        string[],
      ];

      if (offline || !unknownUserIds.length) {
        return knownUserEts;
      }

      return this.fetchUsersById(unknownUserIds).then(userEts => knownUserEts.concat(userEts));
    });
  }

  getUserFromBackend(userId: string): Promise<APIClientUser> {
    return this.userService.getUser(userId);
  }

  /**
   * Is the user the logged in user.
   */
  isMe(user_id: User | string): boolean {
    if (typeof user_id !== 'string') {
      user_id = user_id.id;
    }
    return this.self().id === user_id;
  }

  /**
   * Is the user the logged in user.
   * @param isMe `true` if self user
   */
  saveUser(user_et: User, isMe: boolean = false): User {
    const user = this.findUserById(user_et.id);
    if (!user) {
      if (isMe) {
        user_et.isMe = true;
        this.self(user_et);
      }
      this.users.push(user_et);
    }
    return user_et;
  }

  /**
   * Save multiple users at once.
   * @returns Resolves with users passed as parameter
   */
  saveUsers(user_ets: User[]): User[] {
    const newUsers = user_ets.filter(user_et => !this.findUserById(user_et.id));
    this.users.push(...newUsers);
    return user_ets;
  }

  /**
   * Update a local user from the backend by ID.
   */
  updateUserById(userId: string): Promise<void> {
    const getLocalUser = () => {
      return this.findUserById(userId) || new User();
    };

    return Promise.all([getLocalUser(), this.userService.getUser(userId)])
      .then(([localUserEntity, updatedUserData]) =>
        this.userMapper.updateUserFromObject(localUserEntity, updatedUserData),
      )
      .then(userEntity => {
        if (this.isTeam()) {
          this.mapGuestStatus([userEntity]);
        }
        if (userEntity.inTeam() && userEntity.isDeleted) {
          amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, userEntity.teamId, userEntity.id);
        }
      });
  }

  /**
   * Add user entities for suspended users.
   * @returns User entities
   */
  private _add_suspended_users(userIds: string[], userEntities: User[]): User[] {
    for (const userId of userIds) {
      const matching_userIds = userEntities.find(user_et => user_et.id === userId);

      if (!matching_userIds) {
        const userEntity = new User(userId);
        userEntity.isDeleted = true;
        userEntity.name(t('nonexistentUser'));
        userEntities.push(userEntity);
      }
    }
    return userEntities;
  }

  /**
   * Change the accent color.
   */
  changeAccentColor(accent_id: AccentColor.AccentColorID): Promise<User> {
    return this.selfService
      .putSelf({accent_id} as any)
      .then(() => this.userUpdate({user: {accent_id, id: this.self().id}}));
  }

  /**
   * Change name.
   */
  changeName(name: string): Promise<User> {
    if (name.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      return this.selfService.putSelf({name}).then(() => this.userUpdate({user: {id: this.self().id, name}}));
    }

    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  }

  /**
   * Whether the user needs to set a username.
   */
  shouldChangeUsername(): boolean {
    return this.should_set_username;
  }

  /**
   * Tries to generate a username suggestion.
   */
  getUsernameSuggestion(): Promise<void> {
    let suggestions = null;

    return Promise.resolve()
      .then(() => {
        suggestions = createSuggestions(this.self().name());
        return this.verifyUsernames(suggestions);
      })
      .then(valid_suggestions => {
        this.should_set_username = true;
        this.self().username(valid_suggestions[0]);
      })
      .catch(error => {
        if (error.code === BackendClientError.STATUS_CODE.NOT_FOUND) {
          this.should_set_username = false;
        }

        throw error;
      });
  }

  /**
   * Change username.
   */
  changeUsername(username: string): Promise<User> {
    if (username.length >= UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH) {
      return this.selfService
        .putSelfHandle(username)
        .then(() => {
          this.should_set_username = false;
          return this.userUpdate({user: {handle: username, id: this.self().id}});
        })
        .catch(({code: error_code}) => {
          if (
            [BackendClientError.STATUS_CODE.CONFLICT, BackendClientError.STATUS_CODE.BAD_REQUEST].includes(error_code)
          ) {
            throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
          }
          throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
        });
    }

    return Promise.reject(new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE));
  }

  /**
   * Verify usernames against the backend.
   * @param usernames Username suggestions
   * @returns A list with usernames that are not taken.
   */
  verifyUsernames(usernames: string[]): Promise<string[]> {
    return this.userService.checkUserHandles(usernames);
  }

  /**
   * Verify a username against the backend.
   * @returns Username which is not taken.
   */
  verifyUsername(username: string): Promise<string> {
    return this.userService
      .checkUserHandle(username)
      .catch(error => {
        const error_code = error.response?.status;
        if (error_code === BackendClientError.STATUS_CODE.NOT_FOUND) {
          return username;
        }
        if (error_code === BackendClientError.STATUS_CODE.BAD_REQUEST) {
          throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
        }
        throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
      })
      .then(verified_username => {
        if (verified_username) {
          return verified_username;
        }
        throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
      });
  }

  /**
   * Change the profile image.
   */
  changePicture(picture: Blob): Promise<User> {
    return this.asset_service
      .uploadProfileImage(picture)
      .then(({previewImageKey, mediumImageKey}) => {
        const assets: APIClientUserAsset[] = [
          {key: previewImageKey, size: APIClientUserAssetType.PREVIEW, type: 'image'},
          {key: mediumImageKey, size: APIClientUserAssetType.COMPLETE, type: 'image'},
        ];
        return this.selfService
          .putSelf({assets, picture: []} as any)
          .then(() => this.userUpdate({user: {assets, id: this.self().id}}));
      })
      .catch(error => {
        throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
      });
  }

  /**
   * Set the user's default profile image.
   */
  setDefaultPicture(): Promise<User> {
    return loadUrlBlob(UNSPLASH_URL).then(blob => this.changePicture(blob));
  }

  mapGuestStatus(userEntities = this.users()): void {
    const selfTeamId = this.self().teamId;
    userEntities.forEach(userEntity => {
      if (!userEntity.isMe) {
        const isTeamMember = this.teamMembers().some(teamMember => teamMember.id === userEntity.id);
        const isGuest = !userEntity.isService && !isTeamMember && selfTeamId !== userEntity.teamId;
        userEntity.isGuest(isGuest);
        userEntity.isTeamMember(isTeamMember);
      }
    });
  }

  initMarketingConsent(): Promise<void> {
    if (!Config.getConfig().FEATURE.CHECK_CONSENT) {
      this.logger.warn(
        `Consent check feature is disabled. Defaulting to '${this.propertyRepository.marketingConsent()}'`,
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
