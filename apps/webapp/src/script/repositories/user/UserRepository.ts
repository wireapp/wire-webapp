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
import {
  UserEvent,
  UserLegalHoldDisableEvent,
  UserLegalHoldRequestEvent,
  USER_EVENT,
  UserUpdateEvent,
} from '@wireapp/api-client/lib/event';
import type {BackendError, TraceState} from '@wireapp/api-client/lib/http';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {ConsentType} from '@wireapp/api-client/lib/self/';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
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

import {TypedEventEmitter, type AccentColor} from '@wireapp/commons';
import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import type {ClientRepository, QualifiedUserClientEntityMap} from 'Repositories/client';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientMapper} from 'Repositories/client/ClientMapper';
import type {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {flattenUserClientsQualifiedIds} from 'Repositories/conversation/userClientsUtils';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {USER} from 'Repositories/event/Client';
import {EventRepository} from 'Repositories/event/EventRepository';
import type {EventSource} from 'Repositories/event/EventSource';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import type {SelfService} from 'Repositories/self/SelfService';
import {UserRecord} from 'Repositories/storage';
import {TeamState} from 'Repositories/team/TeamState';
import {chunk, partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {fixWebsocketString} from 'Util/StringUtil';
import {isAxiosError, isBackendError} from 'Util/TypePredicateUtil';

import {showAvailabilityModal} from './AvailabilityModal';
import {ConsentValue} from './ConsentValue';
import {UserMapper} from './UserMapper';
import type {UserService} from './UserService';
import {UserState} from './UserState';

import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {Config} from '../../Config';
import {UserError} from '../../error/UserError';
import type {ServerTimeHandler} from '../../time/serverTimeHandler';

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

type Events = {supportedProtocolsUpdated: {user: User; supportedProtocols: CONVERSATION_PROTOCOL[]}};
export class UserRepository extends TypedEventEmitter<Events> {
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
    super();
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
        await this.onUserUpdate(eventJson, source);
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
   * @param extraUsers the users that should be loaded additionally
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

    const dbUsers = await this.userService.loadUsersFromDb();

    // The self user doesn't need to be re-fetched
    const usersToFetch = users.filter(user => !matchQualifiedIds(selfUser.qualifiedId, user));

    const {found, failed} = await this.fetchRawUsers(usersToFetch, selfUser.domain);

    const usersWithAvailability = found.map(user => {
      const localUser = dbUsers.find(
        dbUser => dbUser.id === user.id || matchQualifiedIds(dbUser.qualified_id, user.qualified_id),
      );

      const userWithAvailability = [...dbUsers, ...nonQualifiedUsers].find(userRecord => userRecord.id === user.id);

      const userWithEscapedDefaultName = this.replaceDeletedUserNameWithNameInDb(user, localUser);

      if (userWithAvailability) {
        return {
          availability: userWithAvailability.availability,
          ...userWithEscapedDefaultName,
        };
      }

      return userWithEscapedDefaultName;
    });

    // Save all new users to the database
    await Promise.all(usersWithAvailability.map(user => this.saveUserInDb(user)));

    const mappedUsers = this.mapUserResponse(usersWithAvailability, failed, dbUsers);

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

  private async onUserUpdate(eventJson: UserUpdateEvent, source: EventSource): Promise<void> {
    const user = eventJson.user;
    const userId = generateQualifiedId(user);

    // Check if user's supported protocols were updated, if they were, we need to re-evaluate a 1:1 conversation to use with that user
    const newSupportedProtocols = user.supported_protocols;
    if (newSupportedProtocols) {
      await this.onUserSupportedProtocolsUpdate(userId, newSupportedProtocols);
    }

    await this.updateUser(userId, user, source === EventRepository.SOURCE.WEB_SOCKET);
  }

  private async onUserSupportedProtocolsUpdate(
    userId: QualifiedId,
    newSupportedProtocols: CONVERSATION_PROTOCOL[],
  ): Promise<void> {
    const localSupportedProtocols = this.findUserById(userId)?.supportedProtocols();

    const hasSupportedProtocolsChanged =
      !localSupportedProtocols ||
      !(
        localSupportedProtocols.length === newSupportedProtocols.length &&
        [...localSupportedProtocols].every(protocol => newSupportedProtocols.includes(protocol))
      );

    if (hasSupportedProtocolsChanged) {
      const user = await this.getUserById(userId);
      await this.updateUserSupportedProtocols(user, newSupportedProtocols);
      this.emit('supportedProtocolsUpdated', {user, supportedProtocols: newSupportedProtocols});
    }
  }

  /**
   * Will update the user both in database and in memory.
   */
  private async updateUser(userId: QualifiedId, user: Partial<UserRecord>, isWebSocket = false): Promise<User> {
    if (user.deleted && user.name) {
      const dbUser = await this.userService.loadUserFromDb(userId);

      if (dbUser && dbUser.name) {
        user.name = dbUser.name;
      }
    }

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
      if (connectionEntity) {
        userEntity.connection(connectionEntity);
      }
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

    const userEntities = await this.getUsersById(userIds);
    userEntities.forEach(userEntity => {
      const clientEntities = recipients[userEntity.id];
      const tooManyClients = clientEntities.length > 8;
      if (tooManyClients) {
        this.logger.debug(`Found '${clientEntities.length}' clients for '${userEntity.name()}'`);
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
    if (hasAvailabilityChanged) {
      await this.updateUser(selfUser.qualifiedId, {availability});
      amplify.publish(WebAppEvents.TEAM.UPDATE_INFO);
      showAvailabilityModal(availability);
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

  // Replaces a deleted user name ("default") with the name from the local database.
  private replaceDeletedUserNameWithNameInDb(user: APIClientUser, localUser?: UserRecord): UserRecord {
    if (!user.deleted) {
      return user;
    }

    if (localUser && localUser.name) {
      return {
        ...user,
        name: localUser.name,
      };
    }

    return {...user, name: t('deletedUser')};
  }

  private mapUserResponse(found: APIClientUser[], failed: QualifiedId[], dbUsers: UserRecord[]): User[] {
    const selfUser = this.userState.self();

    if (!selfUser) {
      throw new Error('Self user is not defined');
    }

    const selfDomain = selfUser.qualifiedId.domain;

    const failedToLoad = failed.map(userId => {
      // When a federated backend is unreachable, we try to load a user from the local database.
      const dbUserRecord = dbUsers?.find(user => matchQualifiedIds(user.qualified_id, userId));

      if (dbUserRecord && selfUser) {
        return this.userMapper.mapUserFromJson(dbUserRecord, selfDomain);
      }

      // Otherwise, we generate placeholder users locally with some default values.
      return new User(userId.id, userId.domain);
    });

    const mappedUsers = this.userMapper.mapUsersFromJson(found, selfDomain).concat(failedToLoad);

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
    const dbUsers = await this.userService.loadUsersFromDb();
    const users = this.mapUserResponse(found, failed, dbUsers);

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
      const userEntity = this.userMapper.mapSelfUserFromJson(userData);
      this.saveUser(userEntity, true);
      await this.initMarketingConsent();
      return userEntity;
    } catch (error) {
      this.logger.error(`Unable to load self user: ${error.message || error}`, [error]);
      throw error;
    }
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
      deletedUser.name(t('deletedUser'));
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

  /**
   * Will refetch supported protocols for the given user and (if they changed) update the local user entity.
   * @param user - the user to fetch the supported protocols for
   */
  private async refreshUserSupportedProtocols(user: User): Promise<void> {
    try {
      const localSupportedProtocols = user.supportedProtocols();
      const supportedProtocols = await this.userService.getUserSupportedProtocols(user.qualifiedId);

      const haveSupportedProtocolsChanged =
        !localSupportedProtocols ||
        !(
          localSupportedProtocols.length === supportedProtocols.length &&
          [...localSupportedProtocols].every(protocol => supportedProtocols.includes(protocol))
        );

      if (!haveSupportedProtocolsChanged) {
        return;
      }

      await this.updateUserSupportedProtocols(user.qualifiedId, supportedProtocols);
      this.emit('supportedProtocolsUpdated', {user, supportedProtocols});
    } catch (error) {
      this.logger.warn(`Failed to refresh supported protocols for user ${user.qualifiedId.id}`, error);
    }
  }

  /**
   * Check for supported protocols on user entity locally, otherwise fetch them from the backend.
   * @param userId - the user to fetch the supported protocols for
   * @param forceRefetch - if true, the supported protocols will be fetched from the backend even if they are already stored locally
   */
  public async getUserSupportedProtocols(
    userId: QualifiedId,
    shouldRefreshUser = false,
  ): Promise<CONVERSATION_PROTOCOL[]> {
    const localUser = this.findUserById(userId);
    const localSupportedProtocols = localUser?.supportedProtocols();

    if (shouldRefreshUser && localUser) {
      // Trigger a refresh of the supported protocols in the background. No need to await for this one.
      void this.refreshUserSupportedProtocols(localUser);
    }

    if (localSupportedProtocols) {
      return localSupportedProtocols;
    }

    try {
      const supportedProtocols = await this.userService.getUserSupportedProtocols(userId);

      //update local user entity with new supported protocols
      await this.updateUserSupportedProtocols(userId, supportedProtocols);
      return supportedProtocols;
    } catch (error) {
      if (localSupportedProtocols) {
        this.logger.warn(
          `Failed when fetching supported protocols of user ${userId.id}, using local supported protocols as fallback: `,
          localSupportedProtocols,
        );
        return localSupportedProtocols;
      }

      this.logger.error(`Couldn't specify supported protocols of user ${userId.id}.`, error);
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
  public readonly refreshAllKnownUsers = async (): Promise<void> => {
    const userIds = this.userState.users().map(user => user.qualifiedId);
    void this.refreshUsers(userIds);
  };

  /**
   * Will update user entity with provided list of supportedProtocols.
   * @param userId - id of the user to update
   * @param supportedProtocols - an array of new supported protocols
   */
  async updateUserSupportedProtocols(userId: QualifiedId, supportedProtocols: CONVERSATION_PROTOCOL[]): Promise<User> {
    return this.updateUser(userId, {supported_protocols: supportedProtocols});
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
    if (updatedUser && this.teamState.isInTeam(updatedUser) && updatedUser.isDeleted) {
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
  async changePicture(picture: File): Promise<User> {
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
        const isTeamMember = this.teamState.isInTeam(userEntity);
        const isGuest = !userEntity.isService && !isTeamMember;
        userEntity.isGuest(isGuest);
        userEntity.isTeamMember(isTeamMember);
      }
    });
  }

  private async initMarketingConsent(): Promise<void> {
    if (!Config.getConfig().FEATURE.CHECK_CONSENT) {
      this.logger.warn(
        `Consent check feature is disabled. Defaulting to '${this.propertyRepository.getPreference(PROPERTIES_TYPE.PRIVACY.MARKETING_CONSENT)}'`,
      );
      return;
    }

    try {
      const consents = await this.selfService.getSelfConsent();
      for (const {type: consentType, value: consentValue} of consents) {
        const isMarketingConsent = consentType === ConsentType.MARKETING;
        if (isMarketingConsent) {
          const hasGivenConsent = consentValue === ConsentValue.GIVEN;
          await this.propertyRepository.updateProperty(PROPERTIES_TYPE.PRIVACY.MARKETING_CONSENT, hasGivenConsent);
          return;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to retrieve marketing consent: ${error.message || error.code}`, error);
    }
  }
}
