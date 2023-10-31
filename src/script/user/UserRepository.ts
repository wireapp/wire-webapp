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

import type {AddedClient, PublicClient} from '@wireapp/api-client/lib/client';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {
  UserEvent,
  UserLegalHoldDisableEvent,
  UserLegalHoldRequestEvent,
  USER_EVENT,
} from '@wireapp/api-client/lib/event';
import type {BackendError, TraceState} from '@wireapp/api-client/lib/http';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {ConsentType, Self as APIClientSelf} from '@wireapp/api-client/lib/self/';
import type {QualifiedHandle, User as APIClientUser} from '@wireapp/api-client/lib/user';
import {
  QualifiedId,
  UserAsset as APIClientUserAsset,
  UserAssetType as APIClientUserAssetType,
} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {container} from 'tsyringe';
import {flatten, uniq} from 'underscore';

import type {AccentColor} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {chunk, partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {fixWebsocketString} from 'Util/StringUtil';
import {isAxiosError, isBackendError} from 'Util/TypePredicateUtil';

import {valueFromType} from './AvailabilityMapper';
import {showAvailabilityModal} from './AvailabilityModal';
import {ConsentValue} from './ConsentValue';
import {UserMapper} from './UserMapper';
import type {UserService} from './UserService';
import {UserState} from './UserState';

import {mapProfileAssetsV1} from '../assets/AssetMapper';
import {AssetRepository} from '../assets/AssetRepository';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import type {ClientRepository, QualifiedUserClientEntityMap} from '../client';
import {ClientEntity} from '../client/ClientEntity';
import {ClientMapper} from '../client/ClientMapper';
import {Config} from '../Config';
import type {ConnectionEntity} from '../connection/ConnectionEntity';
import {flattenUserClientsQualifiedIds} from '../conversation/userClientsUtils';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {UserError} from '../error/UserError';
import {USER} from '../event/Client';
import {EventRepository} from '../event/EventRepository';
import type {EventSource} from '../event/EventSource';
import type {PropertiesRepository} from '../properties/PropertiesRepository';
import type {SelfService} from '../self/SelfService';
import {UserRecord} from '../storage';
import {TeamState} from '../team/TeamState';
import type {ServerTimeHandler} from '../time/serverTimeHandler';

type GetUserOptions = {
  /**
   * will only lookup for users that are in memory (will avoid a backend request in case the user is not found locally)
   * Note that it will return a user considered `deleted` if the user is not found in memory
   */
  localOnly?: boolean;
};

function generateQualifiedId(userData: {id: string; qualified_id?: QualifiedId; domain?: string}): QualifiedId {
  if (userData.qualified_id) {
    return userData.qualified_id;
  }
  return {
    domain: userData.domain ?? '',
    id: userData.id,
  };
}

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
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.logger = getLogger('UserRepository');

    this.userMapper = new UserMapper(serverTimeHandler);

    this.getTeamMembersFromUsers = async (_: User[]) => undefined;

    amplify.subscribe(WebAppEvents.CLIENT.ADD, this.addClientToUser);
    amplify.subscribe(WebAppEvents.CLIENT.REMOVE, this.removeClientFromUser);
    amplify.subscribe(WebAppEvents.CLIENT.UPDATE, this.updateClientsFromUser);
    amplify.subscribe(WebAppEvents.USER.SET_AVAILABILITY, this.setAvailability);
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
    amplify.subscribe(WebAppEvents.USER.UPDATE, this.refreshUser);
  }

  /**
   * Listener for incoming user events.
   */
  private readonly onUserEvent = async (eventJson: UserEvent | UserAvailabilityEvent, source: EventSource) => {
    this.logger.info(`User Event: '${eventJson.type}' (Source: ${source})`);

    switch (eventJson.type) {
      case USER_EVENT.DELETE:
        this.userDelete(eventJson);
        break;
      case USER_EVENT.UPDATE:
        const user = eventJson.user;
        const userId = generateQualifiedId(user);
        await this.updateUser(userId, user, source === EventRepository.SOURCE.WEB_SOCKET);
        break;
      case USER.AVAILABILITY:
        const {from, data, fromDomain} = eventJson;
        const updates = {
          id: from,
          availability: data.availability,
        };
        await this.updateUser({id: from, domain: fromDomain ?? ''}, updates);
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

  /**
   * Will load all the users in memory (and save new users to the database).
   * @param selfUser the user currently logged in (will be excluded from fetch)
   * @param connections the connection to other users
   * @param conversations the conversation the user is part of (used to compute extra users that are part of those conversations but not directly connected to the user)
   * @param extraUsers other users that would need to be loaded (team users usually that are not direct connections)
   */
  async loadUsers(
    selfUser: User,
    connections: ConnectionEntity[],
    conversations: Conversation[],
    extraUsers: QualifiedId[],
  ): Promise<User[]> {
    const conversationMembers = flatten(conversations.map(conversation => conversation.participating_user_ids()));
    const allUserIds = connections
      .map(connectionEntity => connectionEntity.userId)
      .concat(conversationMembers)
      .concat(extraUsers);
    const users = uniq(allUserIds, false, (userId: QualifiedId) => userId.id);

    // Remove all users that have non-qualified Ids in DB (there could be duplicated entries one qualified and one non-qualified)
    // we want to get rid of the ambiguous entries
    // the entries we get back will be used to feed the availabilities of those users
    const nonQualifiedUsers = await this.userService.clearNonQualifiedUsers();

    const dbUsers = await this.userService.loadUserFromDb();
    /* prior to April 2023, we were only storing the availability in the DB, we need to refetch those users */
    const [localUsers, incompleteUsers] = partition(dbUsers, user => !!user.qualified_id);

    /** users we have in the DB that are not matching any loaded users */
    const orphanUsers = localUsers.filter(
      localUser => !users.find(user => matchQualifiedIds(user, localUser.qualified_id)),
    );

    for (const orphanUser of orphanUsers) {
      // Remove users that are not linked to any loaded users
      await this.userService.removeUserFromDb(orphanUser.qualified_id);
    }

    // The self user doesn't need to be re-fetched
    const usersToFetch = users.filter(user => !matchQualifiedIds(selfUser.qualifiedId, user));

    const {found, failed} = await this.fetchRawUsers(usersToFetch, selfUser.domain);

    const userWithAvailability = found.map(user => {
      const availability = incompleteUsers
        .concat(nonQualifiedUsers)
        .find(incompleteUser => incompleteUser.id === user.id);

      if (availability) {
        return {availability: availability.availability, ...user};
      }
      return user;
    });

    // Save all new users to the database
    await Promise.all(userWithAvailability.map(user => this.saveUserInDb(user)));

    const mappedUsers = this.mapUserResponse(userWithAvailability, failed);

    // Assign connections to users
    mappedUsers.forEach(user => {
      const connection = connections.find(connection => matchQualifiedIds(connection.userId, user.qualifiedId));
      if (connection) {
        user.connection(connection);
      }
    });

    // Map self user's availability status
    const {availability: selfUserAvailability} =
      dbUsers.concat(nonQualifiedUsers).find(user => user.id === selfUser.id) ?? {};
    if (selfUserAvailability !== undefined) {
      await this.updateUser(selfUser.qualifiedId, {availability: selfUserAvailability});
    }

    this.userState.users([selfUser, ...mappedUsers]);
    return mappedUsers;
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
  private readonly saveUserInDb = (user: APIClientUser) => {
    return this.userService.saveUserInDb(user);
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
   * Will update the user both in database and in memory.
   */
  private async updateUser(userId: QualifiedId, user: Partial<UserRecord>, isWebSocket = false): Promise<User> {
    const selfUser = this.userState.self();
    const isSelfUser = matchQualifiedIds(userId, selfUser.qualifiedId);
    const userEntity = isSelfUser ? selfUser : await this.getUserById(userId);

    if (isWebSocket && user.name) {
      user.name = fixWebsocketString(user.name);
    }

    this.userMapper.updateUserFromObject(userEntity, user, selfUser.domain);
    // Update the database record
    await this.userService.updateUser(userEntity.qualifiedId, user);
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
  public async assignAllClients(): Promise<User[]> {
    const recipients = await this.clientRepository.getAllClientsFromDb();
    const userIds: QualifiedId[] = Object.entries(recipients).map(([userId, clientEntities]) => {
      return {
        domain: clientEntities[0].domain,
        id: userId,
      };
    });

    this.logger.log(`Found locally stored clients for '${userIds.length}' users`, recipients);
    const userEntities = await this.getUsersById(userIds);
    userEntities.forEach(userEntity => {
      const clientEntities = recipients[userEntity.id];
      const tooManyClients = clientEntities.length > 8;
      if (tooManyClients) {
        this.logger.warn(`Found '${clientEntities.length}' clients for '${userEntity.name()}'`);
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

      const {showUsers} = useLegalHoldModalState.getState();

      if (clientEntity.isLegalHold()) {
        const isSelfUser = userId.id === this.userState.self().id;
        if (isSelfUser) {
          showUsers(false);
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

  private readonly setAvailability = async (availability: Availability.Type): Promise<void> => {
    const selfUser = this.userState.self();
    if (!selfUser) {
      return;
    }
    const hasAvailabilityChanged = availability !== selfUser.availability();
    const newAvailabilityValue = valueFromType(availability);
    if (hasAvailabilityChanged) {
      const oldAvailabilityValue = valueFromType(selfUser.availability());
      this.logger.log(`Availability was changed from '${oldAvailabilityValue}' to '${newAvailabilityValue}'`);
      await this.updateUser(selfUser.qualifiedId, {availability});
      amplify.publish(WebAppEvents.TEAM.UPDATE_INFO);
      showAvailabilityModal(availability);
    } else {
      this.logger.log(`Availability was again set to '${newAvailabilityValue}'`);
    }
  };

  private onLegalHoldRequestCanceled(eventJson: UserLegalHoldDisableEvent): void {
    if (this.userState.self().id === eventJson.id) {
      this.userState.self().hasPendingLegalHold(false);

      const {closeRequestModal} = useLegalHoldModalState.getState();
      closeRequestModal();
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

    const {showRequestModal} = useLegalHoldModalState.getState();
    showRequestModal(false, false, fingerprint);
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

  private async fetchRawUsers(
    userIds: QualifiedId[],
    defaultDomain: string,
  ): Promise<{found: APIClientUser[]; failed: QualifiedId[]}> {
    const chunksOfUserIds = chunk<QualifiedId>(
      userIds.filter(({id}) => !!id),
      Config.getConfig().MAXIMUM_USERS_PER_REQUEST,
    );

    const getChunk = async (chunkOfUserIds: QualifiedId[]) => {
      const chunkOfQualifiedUserIds = chunkOfUserIds.map(({id, domain}) => ({domain: domain || defaultDomain, id}));

      try {
        const {found, failed = [], not_found = []} = await this.userService.getUsers(chunkOfQualifiedUserIds);
        return {found, failed: [...failed, ...not_found]};
      } catch (error: any) {
        const isNotFound =
          (isAxiosError(error) && error.response?.status === HTTP_STATUS.NOT_FOUND) ||
          Number((error as BackendError).code) === HTTP_STATUS.NOT_FOUND;
        const isBadRequest =
          (isAxiosError(error) && error.response?.status === HTTP_STATUS.BAD_REQUEST) ||
          Number((error as BackendError).code) === HTTP_STATUS.BAD_REQUEST;
        if (isNotFound || isBadRequest) {
          return {found: [], failed: [...chunkOfQualifiedUserIds]};
        }
        throw error;
      }
    };

    const responses = await Promise.all(chunksOfUserIds.map(getChunk));
    return responses.reduce<{found: APIClientUser[]; failed: QualifiedId[]}>(
      (acc, response) => {
        return {found: [...acc.found, ...response.found], failed: [...acc.failed, ...response.failed]};
      },
      {found: [], failed: []},
    );
  }

  private mapUserResponse(found: APIClientUser[], failed: QualifiedId[]): User[] {
    const failedToLoad = failed.map(
      /* When a federated backend is unreachable, we generate placeholder users locally with some default values */
      userId => new User(userId.id, userId.domain),
    );
    const mappedUsers = this.userMapper.mapUsersFromJson(found, this.userState.self().domain).concat(failedToLoad);
    if (this.teamState.isTeam()) {
      this.mapGuestStatus(mappedUsers);
    }
    return mappedUsers;
  }

  /**
   * Get users from the backend.
   *
   * @param userIds - the users to fetch from backend
   * @param raw - if true, the users will not be mapped to User entities
   */
  private async fetchUsers(userIds: QualifiedId[]): Promise<User[]> {
    const {found, failed} = await this.fetchRawUsers(userIds, this.userState.self().domain);
    const users = this.mapUserResponse(found, failed);
    let fetchedUserEntities = this.saveUsers(users);
    // If there is a difference then we most likely have a case with a suspended user
    const isAllUserIds = userIds.length === fetchedUserEntities.length;
    if (!isAllUserIds) {
      fetchedUserEntities = this.addSuspendedUsers(userIds, fetchedUserEntities);
    }
    await this.getTeamMembersFromUsers(fetchedUserEntities);

    return fetchedUserEntities;
  }

  findUsersByIds(userIds: QualifiedId[]): User[] {
    return this.userState.users().filter(user => userIds.find(userId => matchQualifiedIds(user.qualifiedId, userId)));
  }

  /**
   * Find a local user.
   */
  findUserById(userId: QualifiedId): User | undefined {
    return this.userState.users().find(knownUser => matchQualifiedIds(knownUser, userId));
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

  private async fetchUser(userId: QualifiedId): Promise<User> {
    const [userEntity] = await this.fetchUsers([userId]);
    return userEntity;
  }

  /**
   * Check for user locally and fetch it from the server otherwise.
   */
  async getUserById(userId: QualifiedId, {localOnly}: GetUserOptions = {}): Promise<User> {
    const user = this.findUserById(userId);
    if (user) {
      return user;
    }
    if (localOnly) {
      const deletedUser = new User(userId.id, userId.domain);
      deletedUser.isDeleted = true;
      return deletedUser;
    }
    try {
      return this.fetchUser(userId);
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
  async getUsersById(userIds: QualifiedId[] = [], {localOnly}: GetUserOptions = {}): Promise<User[]> {
    if (!userIds.length) {
      return [];
    }

    const allUsers = await Promise.all(userIds.map(userId => this.findUserById(userId) || userId));
    const [knownUserEntities, unknownUserIds] = partition(allUsers, item => item instanceof User) as [
      User[],
      QualifiedId[],
    ];

    if (localOnly || !unknownUserIds.length) {
      return knownUserEntities;
    }

    const userEntities = await this.fetchUsers(unknownUserIds);
    return knownUserEntities.concat(userEntities);
  }

  getUserListFromBackend(userIds: QualifiedId[]) {
    return this.userService.getUsers(userIds);
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
  refreshUser = async (userId: QualifiedId): Promise<User> => {
    const [user] = await this.refreshUsers([userId]);
    return user;
  };

  async refreshUsers(userIds: QualifiedId[]) {
    const {found: users} = await this.fetchRawUsers(userIds, this.userState.self().domain);
    return users.map(user => this.updateSavedUser(user));
  }

  /**
   * Refresh all known users (in local state) from the backend.
   */
  async refreshAllKnownUsers() {
    const userIds = this.userState.users().map(user => user.qualifiedId);
    return this.refreshUsers(userIds);
  }

  /**
   * Will update user entity with provided list of supportedProtocols.
   * @param userId - id of the user to update
   * @param supportedProtocols - an array of new supported protocols
   */
  async updateUserSupportedProtocols(userId: QualifiedId, supportedProtocols: ConversationProtocol[]): Promise<User> {
    return this.updateUser(userId, {supported_protocols: supportedProtocols});
  }

  getSelfSupportedProtocols(): ConversationProtocol[] | null {
    return this.userState.self()?.supportedProtocols() || null;
  }

  public async getAllSelfClients() {
    return this.clientRepository.getAllSelfClients();
  }

  /**
   * will update the local user with fresh data from backend
   * @param user user data from backend
   */
  private async updateSavedUser(user: APIClientUser): Promise<User> {
    const localUserEntity = this.findUserById(generateQualifiedId(user));
    if (!localUserEntity) {
      // If the user could not be found locally, we will get it and save it locally
      return this.getUserById(user.qualified_id);
    }
    const updatedUser = this.userMapper.updateUserFromObject(localUserEntity, user, this.userState.self().domain);
    const {qualifiedId: userId} = updatedUser;

    // update the user in db
    await this.updateUser(userId, user);

    if (this.teamState.isTeam()) {
      this.mapGuestStatus([updatedUser]);
    }
    if (updatedUser && updatedUser.inTeam() && updatedUser.isDeleted) {
      amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, updatedUser.teamId, userId);
    }
    return updatedUser;
  }

  private findMatchingUser(userId: QualifiedId, userEntities: User[]): User | undefined {
    return userEntities.find(userEntity => matchQualifiedIds(userEntity, userId));
  }

  private createDeletedUser(userId: QualifiedId): User {
    const userEntity = new User(userId.id, userId.domain);
    userEntity.isDeleted = true;
    userEntity.name(t('nonexistentUser'));
    return userEntity;
  }

  /**
   * Add user entities for suspended users.
   * @returns User entities
   */
  private addSuspendedUsers(userIds: QualifiedId[], userEntities: User[]): User[] {
    for (const userId of userIds) {
      const matchingUserIds = this.findMatchingUser(userId, userEntities);

      if (!matchingUserIds) {
        userEntities.push(this.createDeletedUser(userId));
      }
    }
    return userEntities;
  }

  /**
   * Change the accent color.
   */
  async changeAccentColor(accentId: AccentColor.AccentColorID): Promise<User> {
    await this.selfService.putSelf({accent_id: accentId} as any);
    return this.updateUser(this.userState.self().qualifiedId, {accent_id: accentId});
  }

  /**
   * Change name.
   */
  async changeName(name: string): Promise<User> {
    await this.selfService.putSelf({name});
    return this.updateUser(this.userState.self().qualifiedId, {name});
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
        return await this.updateUser(this.userState.self().qualifiedId, {handle: username});
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
      return await this.updateUser(selfUser.qualifiedId, {assets});
    } catch (error) {
      throw new Error(`Error during profile image upload: ${error.message || error.code || error}`);
    }
  }

  mapGuestStatus(userEntities = this.userState.users()): void {
    const selfTeamId = this.userState.self().teamId;
    userEntities.forEach(userEntity => {
      if (!userEntity.isMe && selfTeamId) {
        const isTeamMember = selfTeamId === userEntity.teamId;
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
