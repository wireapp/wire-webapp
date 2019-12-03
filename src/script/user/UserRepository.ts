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
import {Availability, GenericMessage} from '@wireapp/protocol-messaging';
import {amplify} from 'amplify';
import ko from 'knockout';
import {flatten} from 'underscore';

import {chunk} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {sortByPriority} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid, koArrayPushAll, loadUrlBlob} from 'Util/util';

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

import {AssetService} from '../assets/AssetService';
import {ClientEntity} from '../client/ClientEntity';
import {ClientMapper} from '../client/ClientMapper';
import {ClientRepository} from '../client/ClientRepository';
import {ACCENT_ID, Config} from '../Config';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {AssetPayload} from '../entity/message/Asset';
import {BackendClientError} from '../error/BackendClientError';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {SelfService} from '../self/SelfService';
import {ServerTimeHandler} from '../time/serverTimeHandler';

interface UserUpdate {
  accent_id?: typeof ACCENT_ID;
  assets?: {key: string; size: string; type: string}[];
  handle?: string;
  id?: string;
  name?: string;
  picture?: AssetPayload[];
}

export class UserRepository {
  private readonly asset_service: AssetService;
  private readonly client_repository: ClientRepository;
  private readonly connected_users: ko.PureComputed<User[]>;
  private readonly isTeam: ko.Observable<boolean>;
  private readonly logger: Logger;
  private readonly number_of_contacts: ko.PureComputed<number>;
  private readonly propertyRepository: PropertiesRepository;
  private readonly selfService: SelfService;
  private readonly teamMembers: ko.ObservableArray<User>;
  /** Note: this does not include the self user */
  private readonly teamUsers: ko.ObservableArray<User>;
  private readonly user_mapper: UserMapper;
  private readonly user_service: UserService;
  private readonly users: ko.ObservableArray<User>;
  private should_set_username: boolean;
  readonly connect_requests: ko.PureComputed<User[]>;
  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly isTemporaryGuest: ko.PureComputed<boolean>;
  readonly self: ko.Observable<User>;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      MAXIMUM_TEAM_SIZE_BROADCAST: 400,
      MINIMUM_NAME_LENGTH: 2,
      MINIMUM_PICTURE_SIZE: {
        HEIGHT: 320,
        WIDTH: 320,
      },
      MINIMUM_USERNAME_LENGTH: 2,
    };
  }

  constructor(
    user_service: UserService,
    asset_service: AssetService,
    selfService: SelfService,
    client_repository: ClientRepository,
    serverTimeHandler: ServerTimeHandler,
    propertyRepository: PropertiesRepository,
  ) {
    this.logger = getLogger('UserRepository');

    this.asset_service = asset_service;
    this.client_repository = client_repository;
    this.propertyRepository = propertyRepository;
    this.selfService = selfService;
    this.user_service = user_service;

    this.user_mapper = new UserMapper(serverTimeHandler);
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
          .sort((user_a, user_b) => sortByPriority(user_a.first_name(), user_b.first_name()));
      })
      .extend({rateLimit: TIME_IN_MILLIS.SECOND});

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
      amplify.publish(WebAppEvents.ANALYTICS.SUPER_PROPERTY, SuperProperty.CONTACTS, number_of_contacts);
    });

    amplify.subscribe(WebAppEvents.CLIENT.ADD, this.addClientToUser.bind(this));
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.remove_client_from_user.bind(this));
    amplify.subscribe(WebAppEvents.CLIENT.UPDATE, this.update_clients_from_user.bind(this));
    amplify.subscribe(WebAppEvents.USER.SET_AVAILABILITY, this.setAvailability.bind(this));
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.on_user_event.bind(this));
    amplify.subscribe(WebAppEvents.USER.PERSIST, this.saveUserInDb.bind(this));
    amplify.subscribe(WebAppEvents.USER.UPDATE, this.updateUserById.bind(this));
  }

  /**
   * Listener for incoming user events.
   */
  on_user_event(eventJson: any, source: EventSource): void {
    const type = eventJson.type;

    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» User Event: '${type}' (Source: ${source})`, logObject);

    switch (type) {
      case BackendEvent.USER.DELETE:
        this.user_delete(eventJson);
        break;
      case BackendEvent.USER.UPDATE:
        this.user_update(eventJson);
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
      if (this.isTeamTooLargeForBroadcast()) {
        this.logger.warn(
          `Availability not displayed since the team size is larger or equal to "${UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST}".`,
        );
        return;
      }

      const users = await this.user_service.loadUserFromDb();

      if (users.length) {
        this.logger.log(`Loaded state of '${users.length}' users from database`, users);

        await Promise.all(
          users.map(user =>
            this.get_user_by_id(user.id).then(userEntity => userEntity.availability(user.availability)),
          ),
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
    return this.client_repository.getClientsByUserId(userId, updateClients);
  }

  /**
   * Persists a conversation state in the database.
   */
  saveUserInDb(userEntity: User): Promise<User> {
    return this.user_service.saveUserInDb(userEntity);
  }

  /**
   * Event to delete the matching user.
   */
  user_delete({id}: {id: string}): void {
    // @todo Add user deletion cases for other users
    const is_self_user = id === this.self().id;
    if (is_self_user) {
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
      if (this.isTeamTooLargeForBroadcast()) {
        this.logger.warn(
          `Availability not updated since the team size is larger or equal to "${UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST}".`,
        );
      } else {
        // prettier-ignore
        const {from: userId, data: {availability}} = event;
        this.get_user_by_id(userId).then(userEntity => userEntity.availability(availability));
      }
    }
  }

  /**
   * Event to update the matching user.
   */
  user_update({user}: {user: UserUpdate}): Promise<User> {
    const is_self_user = user.id === this.self().id;
    const user_promise = is_self_user ? Promise.resolve(this.self()) : this.get_user_by_id(user.id);
    return user_promise.then(user_et => {
      this.user_mapper.updateUserFromObject(user_et, user);

      if (is_self_user) {
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
   * @returns Resolves with all user entities where client entities have been assigned to.
   */
  private _assignAllClients(): Promise<User[]> {
    return this.client_repository.getAllClientsFromDb().then(recipients => {
      const userIds = Object.keys(recipients);
      this.logger.info(`Found locally stored clients for '${userIds.length}' users`, recipients);

      return this.get_users_by_id(userIds).then(userEntities => {
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

  private isTeamTooLargeForBroadcast(): boolean {
    const teamSizeIncludingSelf = this.teamUsers().length + 1;
    return teamSizeIncludingSelf >= UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST;
  }

  /**
   * Saves a new client for the first time to the database and adds it to a user's entity.
   *
   * @returns Resolves with `true` when a client has been added
   */
  addClientToUser(userId: string, clientPayload: object, publishClient: boolean = false): Promise<boolean> {
    return this.get_user_by_id(userId).then(userEntity => {
      const clientEntity = ClientMapper.mapClient(clientPayload, userEntity.is_me);
      const wasClientAdded = userEntity.add_client(clientEntity);

      if (wasClientAdded) {
        return this.client_repository.saveClientInDb(userId, clientEntity.toJson()).then(() => {
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
  remove_client_from_user(user_id: string, client_id: string): Promise<void> {
    return this.client_repository
      .removeClient(user_id, client_id)
      .then(() => this.get_user_by_id(user_id))
      .then(user_et => {
        user_et.remove_client(client_id);
        amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, user_id, client_id);
      });
  }

  /**
   * Update clients for given user.
   */
  update_clients_from_user(user_id: string, client_ets: ClientEntity[]): void {
    this.get_user_by_id(user_id).then(user_et => {
      user_et.devices(client_ets);
      amplify.publish(WebAppEvents.USER.CLIENTS_UPDATED, user_id, client_ets);
    });
  }

  setAvailability(availability: Availability.Type, method: string): void {
    const teamUsers = this.teamUsers();

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

    if (this.isTeamTooLargeForBroadcast()) {
      this.logger.warn(
        `Availability update not sent since the team size is larger or equal to "${UserRepository.CONFIG.MAXIMUM_TEAM_SIZE_BROADCAST}".`,
      );
      return;
    }

    const protoAvailability = new Availability({type: protoFromType(availability)});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.AVAILABILITY]: protoAvailability,
      messageId: createRandomUuid(),
    });

    const recipients = teamUsers.concat(this.self());
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

    const fingerprint = await this.client_repository.cryptographyRepository.getRemoteFingerprint(
      userId,
      clientId,
      last_prekey,
    );
    amplify.publish(SHOW_REQUEST_MODAL, fingerprint);
  }

  /**
   * Track availability action.
   *
   * @param method - Method used for availability change
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
  delete_me(): Promise<void> {
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
  fetchUsersById(userIds: string[] = []): Promise<User[]> {
    userIds = userIds.filter(userId => !!userId);

    if (!userIds.length) {
      return Promise.resolve([]);
    }

    const _getUsers = (chunkOfUserIds: string[]) => {
      return this.user_service
        .getUsers(chunkOfUserIds)
        .then(response => (response ? this.user_mapper.mapUsersFromJson(response) : []))
        .catch(error => {
          const isNotFound = error.code === BackendClientError.STATUS_CODE.NOT_FOUND;
          if (isNotFound) {
            return [];
          }
          throw error;
        });
    };

    const chunksOfUserIds = chunk(userIds, Config.MAXIMUM_USERS_PER_REQUEST) as string[][];
    return Promise.all(chunksOfUserIds.map(chunkOfUserIds => _getUsers(chunkOfUserIds)))
      .then(resolveArray => {
        const newUserEntities = flatten(resolveArray);

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
      .then(response => this.user_mapper.mapSelfUserFromJson(response))
      .then(userEntity => {
        this.save_user(userEntity, true);
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
  _upgradePictureAsset(userData: UserUpdate): UserUpdate {
    const hasPicture = userData.picture.length;
    const hasAsset = userData.assets.length;

    if (hasPicture) {
      if (!hasAsset) {
        // if there are no assets, just upload the old picture to the new api
        const {medium} = mapProfileAssetsV1(userData.id, userData.picture);
        medium.load().then(imageBlob => this.change_picture(imageBlob as Blob));
      } else {
        // if an asset is already there, remove the pointer to the old picture
        this.selfService.putSelf({picture: []});
      }
    }
    return userData;
  }

  /**
   * Check for user locally and fetch it from the server otherwise.
   */
  get_user_by_id(user_id: string): Promise<User> {
    const user = this.findUserById(user_id);
    return user
      ? Promise.resolve(user)
      : this._fetchUserById(user_id).catch(error => {
          const isNotFound = error.type === z.error.UserError.TYPE.USER_NOT_FOUND;
          if (!isNotFound) {
            this.logger.warn(`Failed to find user with ID '${user_id}': ${error.message}`, error);
          }
          throw error;
        });
  }

  get_user_id_by_handle(handle: string): Promise<void | User> {
    return this.user_service
      .getUserByHandle(handle.toLowerCase())
      .then(({user: user_id}) => user_id)
      .catch(error => {
        if (error.code !== BackendClientError.STATUS_CODE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Check for users locally and fetch them from the server otherwise.
   * @param offline - Should we only look for cached contacts
   */
  get_users_by_id(user_ids: string[] = [], offline: boolean = false): Promise<User[]> {
    if (!user_ids.length) {
      return Promise.resolve([]);
    }

    const _find_user = (user_id: string) => {
      return this.findUserById(user_id) || user_id;
    };

    const find_users = user_ids.map(user_id => _find_user(user_id));

    return Promise.all(find_users).then(resolve_array => {
      const known_user_ets = resolve_array.filter(array_item => typeof array_item !== 'string') as User[];
      const unknown_user_ids = resolve_array.filter(array_item => typeof array_item === 'string') as string[];

      if (offline || !unknown_user_ids.length) {
        return known_user_ets;
      }

      return this.fetchUsersById(unknown_user_ids).then(user_ets => known_user_ets.concat(user_ets));
    });
  }

  /**
   * Is the user the logged in user.
   */
  is_me(user_id: User | string): boolean {
    if (typeof user_id !== 'string') {
      user_id = user_id.id;
    }
    return this.self().id === user_id;
  }

  /**
   * Is the user the logged in user.
   * @param is_me - `true` if self user
   */
  save_user(user_et: User, is_me: boolean = false): User {
    const user = this.findUserById(user_et.id);
    if (!user) {
      if (is_me) {
        user_et.is_me = true;
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
  save_users(user_ets: User[]): User[] {
    const newUsers = user_ets.filter(user_et => !this.findUserById(user_et.id));
    koArrayPushAll(this.users, newUsers);
    return user_ets;
  }

  /**
   * Update a local user from the backend by ID.
   */
  updateUserById(userId: string): Promise<void> {
    const getLocalUser = () => {
      return this.findUserById(userId) || new User();
    };

    return Promise.all([getLocalUser(), this.user_service.getUser(userId)])
      .then(([localUserEntity, updatedUserData]) =>
        this.user_mapper.updateUserFromObject(localUserEntity, updatedUserData),
      )
      .then(userEntity => {
        if (this.isTeam()) {
          this.mapGuestStatus([userEntity]);
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
  change_accent_color(accent_id: typeof ACCENT_ID): Promise<User> {
    return this.selfService.putSelf({accent_id}).then(() => this.user_update({user: {accent_id, id: this.self().id}}));
  }

  /**
   * Change name.
   */
  change_name(name: string): Promise<User> {
    if (name.length >= UserRepository.CONFIG.MINIMUM_NAME_LENGTH) {
      return this.selfService.putSelf({name}).then(() => this.user_update({user: {id: this.self().id, name}}));
    }

    return Promise.reject(new z.error.UserError((z as any).error.UserError.TYPE.INVALID_UPDATE));
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
  get_username_suggestion(): Promise<void> {
    let suggestions = null;

    return Promise.resolve()
      .then(() => {
        suggestions = createSuggestions(this.self().name());
        return this.verify_usernames(suggestions);
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
  change_username(username: string): Promise<User> {
    if (username.length >= UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH) {
      return this.selfService
        .putSelfHandle(username)
        .then(() => {
          this.should_set_username = false;
          return this.user_update({user: {handle: username, id: this.self().id}});
        })
        .catch(({code: error_code}) => {
          if (
            [BackendClientError.STATUS_CODE.CONFLICT, BackendClientError.STATUS_CODE.BAD_REQUEST].includes(error_code)
          ) {
            throw new z.error.UserError(z.error.UserError.TYPE.USERNAME_TAKEN);
          }
          throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
        });
    }

    return Promise.reject(new z.error.UserError((z as any).error.UserError.TYPE.INVALID_UPDATE));
  }

  /**
   * Verify usernames against the backend.
   * @param usernames - Username suggestions
   * @returns A list with usernames that are not taken.
   */
  verify_usernames(usernames: string[]): Promise<string[]> {
    return this.user_service.checkUserHandles(usernames);
  }

  /**
   * Verify a username against the backend.
   * @returns Username which is not taken.
   */
  verify_username(username: string): Promise<string> {
    return this.user_service
      .checkUserHandle(username)
      .catch(({code: error_code}) => {
        if (error_code === BackendClientError.STATUS_CODE.NOT_FOUND) {
          return username;
        }
        if (error_code === BackendClientError.STATUS_CODE.BAD_REQUEST) {
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
   */
  change_picture(picture: Blob): Promise<User> {
    return this.asset_service
      .uploadProfileImage(picture)
      .then(({previewImageKey, mediumImageKey}) => {
        const assets = [
          {key: previewImageKey, size: 'preview', type: 'image'},
          {key: mediumImageKey, size: 'complete', type: 'image'},
        ];
        return this.selfService
          .putSelf({assets, picture: []})
          .then(() => this.user_update({user: {assets, id: this.self().id}}));
      })
      .catch(error => {
        throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
      });
  }

  /**
   * Set the user's default profile image.
   */
  set_default_picture(): Promise<User> {
    return loadUrlBlob(UNSPLASH_URL).then(blob => this.change_picture(blob));
  }

  mapGuestStatus(userEntities = this.users()): void {
    userEntities.forEach(userEntity => {
      if (!userEntity.is_me) {
        const isTeamMember = this.teamMembers().some(teamMember => teamMember.id === userEntity.id);
        const isGuest = !userEntity.isService && !isTeamMember;
        userEntity.isGuest(isGuest);
        userEntity.isTeamMember(isTeamMember);
      }
    });
  }

  initMarketingConsent(): Promise<void> {
    if (!Config.FEATURE.CHECK_CONSENT) {
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
