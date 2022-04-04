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

import {amplify} from 'amplify';
import {Availability} from '@wireapp/protocol-messaging';
import {ConsentType, Self as APIClientSelf} from '@wireapp/api-client/src/self/';
import {container} from 'tsyringe';
import {flatten} from 'underscore';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {
  UserEvent,
  UserLegalHoldRequestEvent,
  UserLegalHoldDisableEvent,
  USER_EVENT,
} from '@wireapp/api-client/src/event';
import {
  UserAsset as APIClientUserAsset,
  UserAssetType as APIClientUserAssetType,
  QualifiedId,
} from '@wireapp/api-client/src/user';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {AccentColor} from '@wireapp/commons';
import type {BackendError, TraceState} from '@wireapp/api-client/src/http';
import {BackendErrorLabel} from '@wireapp/api-client/src/http';
import type {PublicClient, AddedClient} from '@wireapp/api-client/src/client';
import type {User as APIClientUser, QualifiedHandle} from '@wireapp/api-client/src/user';

import {chunk, partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {loadUrlBlob} from 'Util/util';
import {isAxiosError, isBackendError, isQualifiedId} from 'Util/TypePredicateUtil';

import {AssetRepository} from '../assets/AssetRepository';
import {ClientEntity} from '../client/ClientEntity';
import {USER} from '../event/Client';
import {ClientMapper} from '../client/ClientMapper';
import {Config} from '../Config';
import {ConsentValue} from './ConsentValue';
import {EventRepository} from '../event/EventRepository';
import {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';
import {mapProfileAssetsV1} from '../assets/AssetMapper';
import {valueFromType} from './AvailabilityMapper';
import {showAvailabilityModal} from './AvailabilityModal';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {UNSPLASH_URL} from '../externalRoute';
import {User} from '../entity/User';
import {UserError} from '../error/UserError';
import {UserMapper} from './UserMapper';
import {UserState} from './UserState';
import type {ClientRepository, QualifiedUserClientEntityMap} from '../client/ClientRepository';
import type {ConnectionEntity} from '../connection/ConnectionEntity';
import type {EventSource} from '../event/EventSource';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {SelfService} from '../self/SelfService';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import type {UserService} from './UserService';
import {fixWebsocketString} from 'Util/StringUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {flattenUserClientsQualifiedIds} from '../conversation/userClientsUtils';

interface UserAvailabilityEvent {
  data: {availability: Availability.Type};
  from: string;
  fromDomain: string | null;
  type: USER.AVAILABILITY;
}
export class UserRepository {
  private readonly logger: Logger;
  public readonly userMapper: UserMapper;
  public getTeamMembersFromUsers: (users: User[]) => Promise<void>;

  static get CONFIG() {
    return {
      MAXIMUM_TEAM_SIZE_BROADCAST: 500,
      MINIMUM_PICTURE_SIZE: {
        HEIGHT: 320,
        WIDTH: 320,
      },
      MINIMUM_USERNAME_LENGTH: 2,
    };
  }

  constructor(
    private readonly userService: UserService,
    private readonly assetRepository: AssetRepository,
    private readonly selfService: SelfService,
    private readonly clientRepository: ClientRepository,
    serverTimeHandler: ServerTimeHandler,
    private readonly propertyRepository: PropertiesRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.logger = getLogger('UserRepository');

    this.userMapper = new UserMapper(serverTimeHandler);

    this.getTeamMembersFromUsers = async (_: User[]) => undefined;

    amplify.subscribe(WebAppEvents.CLIENT.ADD, this.addClientToUser);
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.removeClientFromUser);
    amplify.subscribe(WebAppEvents.CLIENT.UPDATE, this.updateClientsFromUser);
    amplify.subscribe(WebAppEvents.USER.SET_AVAILABILITY, this.setAvailability);
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
    amplify.subscribe(WebAppEvents.USER.PERSIST, this.saveUserInDb);
    amplify.subscribe(WebAppEvents.USER.UPDATE, this.updateUserById);
  }

  /**
   * Listener for incoming user events.
   */
  private readonly onUserEvent = (eventJson: UserEvent | UserAvailabilityEvent, source: EventSource): void => {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    this.logger.info(`»» User Event: '${eventJson.type}' (Source: ${source})`, logObject);

    switch (eventJson.type) {
      case USER_EVENT.DELETE:
        this.userDelete(eventJson);
        break;
      case USER_EVENT.UPDATE:
        this.userUpdate(eventJson, source === EventRepository.SOURCE.WEB_SOCKET);
        break;
      case USER.AVAILABILITY:
        this.onUserAvailability(eventJson);
        break;
      case USER_EVENT.LEGAL_HOLD_REQUEST: {
        this.onLegalHoldRequest(eventJson);
        break;
      }
      case USER_EVENT.LEGAL_HOLD_DISABLE: {
        this.onLegalHoldRequestCanceled(eventJson);
        break;
      }
    }

    // Note: We initially fetch the user properties in the properties repository, so we are not interested in updates to it from the notification stream.
    if (source === EventRepository.SOURCE.WEB_SOCKET) {
      switch (eventJson.type) {
        case USER_EVENT.PROPERTIES_DELETE:
          this.propertyRepository.deleteProperty(eventJson.key);
          break;
        case USER_EVENT.PROPERTIES_SET:
          this.propertyRepository.setProperty(eventJson.key, eventJson.value);
          break;
      }
    }
  };

  async loadUsers(): Promise<void> {
    if (this.userState.isTeam()) {
      const users = await this.userService.loadUserFromDb();

      if (users.length) {
        this.logger.log(`Loaded state of '${users.length}' users from database`, users);

        await Promise.all(
          users.map(async user => {
            const userEntity = await this.getUserById({domain: user.domain, id: user.id});
            userEntity.availability(user.availability);
          }),
        );
      }

      this.userState.users().forEach(userEntity => userEntity.subscribeToChanges());
    }
  }

  /**
   * Retrieves meta information about all the clients of given users.
   */
  private getClientsByUsers(userIds: QualifiedId[], updateClients: boolean): Promise<QualifiedUserClientEntityMap> {
    return this.clientRepository.getClientsByUserIds(userIds, updateClients);
  }

  /**
   * Persists a conversation state in the database.
   */
  private readonly saveUserInDb = (userEntity: User): Promise<User> => {
    return this.userService.saveUserInDb(userEntity);
  };

  /**
   * Event to delete the matching user.
   */
  private userDelete({id}: {id: string}): void {
    // @todo Add user deletion cases for other users
    const isSelfUser = id === this.userState.self().id;
    if (isSelfUser) {
      // Info: Deletion of the user causes a database deletion which may interrupt currently running database operations.
      // That's why we added a timeout, to leave some time for the database to finish running reads/writes before the
      // database connection gets closed and the database gets deleted (WEBAPP-6379).
      window.setTimeout(() => {
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.ACCOUNT_DELETED, true);
      }, 100);
    }
  }

  /**
   * Event to update availability of a user.
   */
  private onUserAvailability({from, data, fromDomain}: UserAvailabilityEvent): void {
    if (this.userState.isTeam()) {
      this.getUserById({domain: fromDomain, id: from}).then(userEntity => userEntity.availability(data.availability));
    }
  }

  /**
   * Event to update the matching user.
   */
  private async userUpdate({user}: {user: Partial<APIClientUser>}, isWebSocket = false): Promise<User> {
    const isSelfUser = user.id === this.userState.self().id;
    const userEntity = isSelfUser
      ? this.userState.self()
      : await this.getUserById({domain: user.qualified_id?.domain || null, id: user.id});

    if (isWebSocket && user.name) {
      user.name = fixWebsocketString(user.name);
    }

    this.userMapper.updateUserFromObject(userEntity, user);
    if (isSelfUser) {
      amplify.publish(WebAppEvents.TEAM.UPDATE_INFO);
    }
    return userEntity;
  }

  /**
   * Update users matching the given connections.
   */
  async updateUsersFromConnections(connectionEntities: ConnectionEntity[]): Promise<User[]> {
    // TODO(Federation): Include domain as soon as connections to federated backends are supported.
    const userIds = connectionEntities.map(connectionEntity => connectionEntity.userId);
    const userEntities = await this.getUsersById(userIds);
    userEntities.forEach(userEntity => {
      const connectionEntity = connectionEntities.find(({userId}) => matchQualifiedIds(userId, userEntity));
      userEntity.connection(connectionEntity);
    });
    return this.assignAllClients();
  }

  /**
   * Assign all locally stored clients to the users.
   * @returns Resolves with all user entities where client entities have been assigned to.
   */
  private async assignAllClients(): Promise<User[]> {
    const recipients = await this.clientRepository.getAllClientsFromDb();
    const userIds: QualifiedId[] = Object.entries(recipients).map(([userId, clientEntities]) => {
      return {
        domain: clientEntities[0].domain,
        id: userId,
      };
    });

    this.logger.info(`Found locally stored clients for '${userIds.length}' users`, recipients);
    const userEntities = await this.getUsersById(userIds);
    userEntities.forEach(userEntity => {
      const clientEntities = recipients[userEntity.id];
      const tooManyClients = clientEntities.length > 8;
      if (tooManyClients) {
        this.logger.warn(`Found '${clientEntities.length}' clients for '${userEntity.name()}'`, clientEntities);
      }
      userEntity.devices(clientEntities);
    });
    return userEntities;
  }

  /**
   * Method does:
   * - fetch user locally or from backend
   * - map client payload to client entity
   * - attach client entity to user entity
   * - persist client entity to database
   * - trigger "client added" or "legal hold" system messages
   *
   * TODO(SRP): Split up method because it does not follow the single-responsibility principle
   *
   * @returns Resolves with the new client entity when a client has been added
   */
  addClientToUser = async (
    userId: QualifiedId,
    clientPayload: PublicClient | AddedClient | ClientEntity,
    publishClient: boolean = false,
  ): Promise<ClientEntity | undefined> => {
    const userEntity = await this.getUserById(userId);
    const clientEntity =
      clientPayload instanceof ClientEntity
        ? clientPayload
        : ClientMapper.mapClient(clientPayload, userEntity.isMe, userId.domain);
    const wasClientAdded = userEntity.addClient(clientEntity);
    if (wasClientAdded) {
      await this.clientRepository.saveClientInDb(userId, clientEntity.toJson());
      if (clientEntity.isLegalHold()) {
        const isSelfUser = userId.id === this.userState.self().id;
        if (isSelfUser) {
          amplify.publish(LegalHoldModalViewModel.SHOW_DETAILS);
        }
      }
      if (publishClient) {
        amplify.publish(WebAppEvents.USER.CLIENT_ADDED, userId, clientEntity);
      }
      return clientEntity;
    }
    return undefined;
  };

  /**
   * Will sync all the clients of the users given with the backend and add the missing ones.
   * @param userIds - The users which clients should be updated
   * @return resolves with all the client entities that were added
   */
  async updateMissingUsersClients(userIds: QualifiedId[]): Promise<ClientEntity[]> {
    const clients = await this.getClientsByUsers(userIds, false);
    const users = flattenUserClientsQualifiedIds<ClientEntity>(clients);
    const addedClients = flatten(
      await Promise.all(
        users.map(async ({userId, clients}) => {
          return (await Promise.all(clients.map(client => this.addClientToUser(userId, client, true)))).filter(
            client => !!client,
          );
        }),
      ),
    );
    return addedClients;
  }

  /**
   * Removes a stored client and the session connected with it.
   * @deprecated
   * TODO(Federation): This code cannot be used with federation and will be replaced with our core.
   */
  removeClientFromUser = async (userId: QualifiedId, clientId: string) => {
    await this.clientRepository.removeClient(userId, clientId);
    const userEntity = await this.getUserById(userId);
    userEntity.removeClient(clientId);
    amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, userId, clientId);
    return userEntity;
  };

  /**
   * Update clients for given user.
   */
  private readonly updateClientsFromUser = (userId: QualifiedId, clientEntities: ClientEntity[]): void => {
    this.getUserById(userId).then(userEntity => {
      userEntity.devices(clientEntities);
      amplify.publish(WebAppEvents.USER.CLIENTS_UPDATED, userId);
    });
  };

  private readonly setAvailability = (availability: Availability.Type): void => {
    const hasAvailabilityChanged = availability !== this.userState.self().availability();
    const newAvailabilityValue = valueFromType(availability);
    if (hasAvailabilityChanged) {
      const oldAvailabilityValue = valueFromType(this.userState.self().availability());
      this.logger.log(`Availability was changed from '${oldAvailabilityValue}' to '${newAvailabilityValue}'`);
      this.userState.self().availability(availability);
      amplify.publish(WebAppEvents.TEAM.UPDATE_INFO);
      showAvailabilityModal(availability);
    } else {
      this.logger.log(`Availability was again set to '${newAvailabilityValue}'`);
    }
  };

  private onLegalHoldRequestCanceled(eventJson: UserLegalHoldDisableEvent): void {
    if (this.userState.self().id === eventJson.id) {
      this.userState.self().hasPendingLegalHold(false);
      amplify.publish(LegalHoldModalViewModel.HIDE_REQUEST);
    } else {
      /*
       * TODO:
       * 1) Get User ID from event and check the clients of that user.
       * 2) If there is a legal hold client, remove it (in memory and database).
       * 3) Verify that the removed client is not in the db anymore and not assigned to the user entity.
       */
    }
  }

  private async onLegalHoldRequest(eventJson: UserLegalHoldRequestEvent): Promise<void> {
    if (this.userState.self().id !== eventJson.id) {
      return;
    }
    const self = this.userState.self();
    self.hasPendingLegalHold(true);
    const {
      client: {id: clientId},
      last_prekey,
      id: userId,
    } = eventJson;

    const fingerprint = await this.clientRepository.cryptographyRepository.getRemoteFingerprint(
      {domain: '', id: userId},
      clientId,
      last_prekey,
    );
    amplify.publish(LegalHoldModalViewModel.SHOW_REQUEST, fingerprint);
  }

  /**
   * Request account deletion.
   * @returns Resolves when account deletion process has been initiated
   */
  async deleteMe(): Promise<void> {
    try {
      await this.selfService.deleteSelf();
      this.logger.info('Account deletion initiated');
    } catch (error) {
      this.logger.error(`Unable to delete self: ${error}`);
    }
  }

  /**
   * Get a user from the backend.
   */
  private async fetchUserById(userId: QualifiedId): Promise<User> {
    const [userEntity] = await this.fetchUsersById([userId]);
    return userEntity;
  }

  /**
   * Get users from the backend.
   */
  private async fetchUsersById(userIds: QualifiedId[]): Promise<User[]> {
    if (!userIds.length) {
      return [];
    }

    const getUsers = async (chunkOfUserIds: QualifiedId[]): Promise<User[]> => {
      try {
        const response = await this.userService.getUsers(chunkOfUserIds);
        return response ? this.userMapper.mapUsersFromJson(response) : [];
      } catch (error) {
        const isNotFound =
          (isAxiosError(error) && error.response?.status === HTTP_STATUS.NOT_FOUND) ||
          Number((error as BackendError).code) === HTTP_STATUS.NOT_FOUND;
        const isBadRequest =
          (isAxiosError(error) && error.response?.status === HTTP_STATUS.BAD_REQUEST) ||
          Number((error as BackendError).code) === HTTP_STATUS.BAD_REQUEST;
        if (isNotFound || isBadRequest) {
          return [];
        }
        throw error;
      }
    };

    const chunksOfUserIds = chunk<QualifiedId>(userIds, Config.getConfig().MAXIMUM_USERS_PER_REQUEST);
    const resolveArray = await Promise.all(chunksOfUserIds.map(getUsers));
    const newUserEntities = flatten(resolveArray);
    if (this.userState.isTeam()) {
      this.mapGuestStatus(newUserEntities);
    }
    let fetchedUserEntities = this.saveUsers(newUserEntities);
    // If there is a difference then we most likely have a case with a suspended user
    const isAllUserIds = userIds.length === fetchedUserEntities.length;
    if (!isAllUserIds) {
      fetchedUserEntities = this.addSuspendedUsers(userIds, fetchedUserEntities);
    }
    await this.getTeamMembersFromUsers(fetchedUserEntities);
    return fetchedUserEntities;
  }

  /**
   * Find a local user.
   */
  findUserById(userId: string | QualifiedId): User | undefined {
    return this.userState.users().find(knownUser => {
      return typeof userId === 'string'
        ? knownUser.id === userId
        : // Don't check for the domain when the user query has no domain
          matchQualifiedIds(knownUser, userId);
    });
  }

  /**
   * Get self user from backend.
   */
  async getSelf(traceStates: TraceState[] = []): Promise<User> {
    try {
      traceStates.push({position: 'UserRepository.getSelf', vendor: 'webapp'});
      const userData = await this.selfService.getSelf(traceStates);
      const response = this.upgradePictureAsset(userData);
      const userEntity = this.userMapper.mapSelfUserFromJson(response);
      this.saveUser(userEntity, true);
      await this.initMarketingConsent();
      return userEntity;
    } catch (error) {
      this.logger.error(`Unable to load self user: ${error.message || error}`, [error]);
      throw error;
    }
  }

  /**
   * Detects if the user has a profile picture that uses the outdated picture API.
   * Will migrate the picture to the newer assets API if so.
   */
  private upgradePictureAsset(userData: APIClientSelf): APIClientSelf {
    const hasPicture = userData.picture.length;
    const hasAsset = userData.assets.length;

    if (hasPicture) {
      if (!hasAsset) {
        // if there are no assets, just upload the old picture to the new api
        const {medium} = mapProfileAssetsV1(userData.id, userData.picture);
        this.assetRepository.load(medium).then(imageBlob => this.changePicture(imageBlob as Blob));
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
  async getUserById(userId: QualifiedId): Promise<User> {
    let user = this.findUserById(userId);
    if (!user) {
      try {
        user = await this.fetchUserById(userId);
      } catch (error) {
        const isNotFound = error.type === UserError.TYPE.USER_NOT_FOUND;
        if (!isNotFound) {
          this.logger.warn(
            `Failed to find user with ID '${userId.id}' and domain '${userId.domain}': ${error.message}`,
            error,
          );
        }
        throw error;
      }
    }

    return user;
  }

  async getUserByHandle(fqn: QualifiedHandle): Promise<undefined | APIClientUser> {
    try {
      return await this.userService.getUserByFQN(fqn);
    } catch (error) {
      // When we search for a non-existent handle, the backend will return a HTTP 404, which tells us that there is no user with that handle.
      if (
        !isBackendError(error) ||
        (error.code !== HTTP_STATUS.NOT_FOUND && error.label !== BackendErrorLabel.FEDERATION_NOT_ALLOWED)
      ) {
        throw error;
      }
    }
    return undefined;
  }

  /**
   * Check for users locally and fetch them from the server otherwise.
   */
  async getUsersById(userIds: QualifiedId[] = [], offline: boolean = false): Promise<User[]> {
    if (!userIds.length) {
      return [];
    }

    const allUsers = await Promise.all(userIds.map(userId => this.findUserById(userId) || userId));
    const [knownUserEntities, unknownUserIds] = partition(allUsers, item => item instanceof User) as [
      User[],
      QualifiedId[],
    ];

    if (offline || !unknownUserIds.length) {
      return knownUserEntities;
    }

    const userEntities = await this.fetchUsersById(unknownUserIds);
    return knownUserEntities.concat(userEntities);
  }

  getUserFromBackend(userId: string): Promise<APIClientUser> {
    return this.userService.getUser(userId);
  }

  getUserListFromBackend(userIds: QualifiedId[]): Promise<APIClientUser[]> {
    return this.userService.getUsers(userIds);
  }

  /**
   * Is the user the logged in user?
   */
  isMe(userId: User | string): boolean {
    if (typeof userId !== 'string') {
      userId = userId.id;
    }
    return this.userState.self().id === userId;
  }

  /**
   * Is the user the logged in user?
   * @param isMe `true` if self user
   */
  private saveUser(userEntity: User, isMe: boolean = false): User {
    const user = this.findUserById(userEntity.qualifiedId);
    if (!user) {
      if (isMe) {
        userEntity.isMe = true;
        this.userState.self(userEntity);
      }
      this.userState.users.push(userEntity);
    }
    return userEntity;
  }

  /**
   * Save multiple users at once.
   * @returns Resolves with users passed as parameter
   */
  private saveUsers(userEntities: User[]): User[] {
    const newUsers = userEntities.filter(userEntity => !this.findUserById(userEntity.qualifiedId));
    this.userState.users.push(...newUsers);
    return userEntities;
  }

  /**
   * Update a local user from the backend by ID.
   */
  updateUserById = async (userId: string | QualifiedId): Promise<void> => {
    const localUserEntity = this.findUserById(userId) || new User('', '');
    const updatedUserData = await this.userService.getUser(userId);
    const updatedUserEntity = this.userMapper.updateUserFromObject(localUserEntity, updatedUserData);
    if (this.userState.isTeam()) {
      this.mapGuestStatus([updatedUserEntity]);
    }
    if (updatedUserEntity && updatedUserEntity.inTeam() && updatedUserEntity.isDeleted) {
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, updatedUserEntity.teamId, updatedUserEntity.qualifiedId);
    }
  };

  static findMatchingUser(userId: string | QualifiedId, userEntities: User[]): User | undefined {
    if (isQualifiedId(userId)) {
      return userEntities.find(userEntity => matchQualifiedIds(userEntity, userId));
    }
    return userEntities.find(userEntity => userEntity.id === userId);
  }

  static createDeletedUser(userId: string | QualifiedId): User {
    const userEntity = isQualifiedId(userId) ? new User(userId.id, userId.domain) : new User(userId, null);
    userEntity.isDeleted = true;
    userEntity.name(t('nonexistentUser'));
    return userEntity;
  }

  /**
   * Add user entities for suspended users.
   * @returns User entities
   */
  private addSuspendedUsers(userIds: string[] | QualifiedId[], userEntities: User[]): User[] {
    for (const userId of userIds) {
      const matchingUserIds = UserRepository.findMatchingUser(userId, userEntities);

      if (!matchingUserIds) {
        userEntities.push(UserRepository.createDeletedUser(userId));
      }
    }
    return userEntities;
  }

  /**
   * Change the accent color.
   */
  async changeAccentColor(accentId: AccentColor.AccentColorID): Promise<User> {
    await this.selfService.putSelf({accent_id: accentId} as any);
    return this.userUpdate({user: {accent_id: accentId, id: this.userState.self().id}});
  }

  /**
   * Change name.
   */
  async changeName(name: string): Promise<User> {
    await this.selfService.putSelf({name});
    return this.userUpdate({user: {id: this.userState.self().id, name}});
  }

  async changeEmail(email: string): Promise<void> {
    return this.selfService.putSelfEmail(email);
  }

  /**
   * Change username.
   */
  async changeUsername(username: string): Promise<User> {
    if (username.length >= UserRepository.CONFIG.MINIMUM_USERNAME_LENGTH) {
      try {
        await this.selfService.putSelfHandle(username);
        return await this.userUpdate({user: {handle: username, id: this.userState.self().id}});
      } catch (error) {
        if ([HTTP_STATUS.CONFLICT, HTTP_STATUS.BAD_REQUEST].includes(error.code)) {
          throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
        }
        throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
      }
    }

    throw new UserError(UserError.TYPE.INVALID_UPDATE, UserError.MESSAGE.INVALID_UPDATE);
  }

  /**
   * Verify a user handle against the backend.
   * @returns handle User handle to verify
   */
  async verifyUserHandle(handle: string): Promise<string> {
    try {
      await this.userService.checkUserHandle(handle);
      throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
    } catch (error) {
      const errorCode = error.response?.status;

      if (errorCode === HTTP_STATUS.NOT_FOUND) {
        return handle;
      }

      if (errorCode === HTTP_STATUS.BAD_REQUEST) {
        throw new UserError(UserError.TYPE.USERNAME_TAKEN, UserError.MESSAGE.USERNAME_TAKEN);
      }

      throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
    }
  }

  /**
   * Change the profile image.
   */
  async changePicture(picture: Blob): Promise<User> {
    try {
      const selfUser = this.userState.self();
      const {previewImageKey, mediumImageKey} = await this.assetRepository.uploadProfileImage(picture);
      const assets: APIClientUserAsset[] = [
        {domain: previewImageKey.domain, key: previewImageKey.key, size: APIClientUserAssetType.PREVIEW, type: 'image'},
        {domain: mediumImageKey.domain, key: mediumImageKey.key, size: APIClientUserAssetType.COMPLETE, type: 'image'},
      ];
      await this.selfService.putSelf({assets, picture: []} as any);
      return await this.userUpdate({user: {assets, id: selfUser.id}});
    } catch (error) {
      throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
    }
  }

  /**
   * Set the user's default profile image.
   */
  async setDefaultPicture(): Promise<User> {
    const blob = await loadUrlBlob(UNSPLASH_URL);
    return this.changePicture(blob);
  }

  mapGuestStatus(userEntities = this.userState.users()): void {
    const selfTeamId = this.userState.self().teamId;
    userEntities.forEach(userEntity => {
      if (!userEntity.isMe) {
        const isTeamMember = this.userState.teamMembers().some(teamMember => teamMember.id === userEntity.id);
        const isGuest = !userEntity.isService && !isTeamMember && selfTeamId !== userEntity.teamId;
        userEntity.isGuest(isGuest);
        userEntity.isTeamMember(isTeamMember);
      }
    });
  }

  private async initMarketingConsent(): Promise<void> {
    if (!Config.getConfig().FEATURE.CHECK_CONSENT) {
      this.logger.warn(
        `Consent check feature is disabled. Defaulting to '${this.propertyRepository.marketingConsent()}'`,
      );
      return;
    }

    try {
      const consents = await this.selfService.getSelfConsent();
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
    } catch (error) {
      this.logger.warn(`Failed to retrieve marketing consent: ${error.message || error.code}`, error);
    }
  }
}
