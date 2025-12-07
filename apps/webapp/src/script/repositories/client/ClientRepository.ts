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

import {ClientType, PublicClient, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {UserClientAddEvent, UserClientRemoveEvent, USER_EVENT} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import ko from 'knockout';
import murmurhash from 'murmurhash';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import type {User} from 'Repositories/entity/User';
import {ClientRecord} from 'Repositories/storage';
import {StorageKey} from 'Repositories/storage/StorageKey';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {loadValue} from 'Util/StorageUtil';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ClientEntity} from './ClientEntity';
import {constructClientId, parseClientId} from './ClientIdUtil';
import {ClientMapper} from './ClientMapper';
import type {ClientService} from './ClientService';
import {ClientState} from './ClientState';
import {isClientMLSCapable, wasClientActiveWithinLast4Weeks} from './ClientUtils';

import {SIGN_OUT_REASON} from '../../auth/SignOutReason';
import {ClientError} from '../../error/ClientError';
import {Core} from '../../service/CoreSingleton';

export type UserClientEntityMap = {[userId: string]: ClientEntity[]};
export type QualifiedUserClientEntityMap = {[domain: string]: UserClientEntityMap};

export class ClientRepository {
  private readonly logger: Logger;
  public selfUser: ko.Observable<User>;

  static get CONFIG() {
    return {
      AVERAGE_NUMBER_OF_CLIENTS: 4,
    };
  }

  static get PRIMARY_KEY_CURRENT_CLIENT() {
    return 'local_identity';
  }

  constructor(
    public readonly clientService: ClientService,
    public readonly cryptographyRepository: CryptographyRepository,
    private readonly clientState = container.resolve(ClientState),
    private readonly core = container.resolve(Core),
  ) {
    this.cryptographyRepository = cryptographyRepository;
    this.selfUser = ko.observable(undefined);
    this.logger = getLogger('ClientRepository');

    amplify.subscribe(WebAppEvents.LIFECYCLE.ASK_TO_CLEAR_DATA, this.logoutClient);
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
  }

  init(selfUser: User): void {
    this.selfUser(selfUser);
  }

  //##############################################################################
  // Service interactions
  //##############################################################################

  private deleteClientFromDb(userId: QualifiedId, clientId: string): Promise<string> {
    return this.clientService.deleteClientFromDb(constructClientId(userId, clientId));
  }

  /**
   * Delete the temporary client on the backend.
   * @returns Resolves when the temporary client was deleted on the backend
   */
  private deleteLocalTemporaryClient() {
    return this.core.service!.client.deleteLocalClient();
  }

  /**
   * Load all known clients from the database.
   * @returns Resolves with all the clients found in the local database
   */
  getAllClientsFromDb(): Promise<{[userId: string]: ClientEntity[]}> {
    return this.clientService.loadAllClientsFromDb().then(clientRecords => {
      // TODO(Federation): Add domain to identifier
      const recipients: {[userId: string]: ClientEntity[]} = {};
      const skippedUserIds = [this.selfUser().id, ClientRepository.PRIMARY_KEY_CURRENT_CLIENT];

      for (const clientRecord of clientRecords) {
        const {userId} = parseClientId(clientRecord.meta.primary_key);
        if (userId && !skippedUserIds.includes(userId)) {
          recipients[userId] ||= [];
          recipients[userId].push(ClientMapper.mapClient(clientRecord, false, clientRecord.domain));
        }
      }
      return recipients;
    });
  }

  /**
   * Retrieves meta information about specific client of the self user.
   * @param clientId ID of client to be retrieved
   * @returns Resolves with the retrieved client information
   */
  private getClientByIdFromBackend(clientId: string): Promise<RegisteredClient> {
    return this.clientService.getClientById(clientId).catch(error => {
      const status = error.response?.status;
      const clientNotFoundBackend = status === HTTP_STATUS.NOT_FOUND;
      if (clientNotFoundBackend) {
        this.logger.warn(`Local client no longer exists on the backend`, error);
        throw new ClientError(ClientError.TYPE.NO_VALID_CLIENT, ClientError.MESSAGE.NO_VALID_CLIENT);
      }

      throw error;
    });
  }

  /**
   * Loads a client from the database (if it exists).
   * @returns Resolves with the local client
   */
  private getCurrentClientFromDb(): Promise<ClientEntity> {
    return this.clientService
      .loadClientFromDb(ClientRepository.PRIMARY_KEY_CURRENT_CLIENT)
      .catch(() => {
        throw new ClientError(ClientError.TYPE.DATABASE_FAILURE, ClientError.MESSAGE.DATABASE_FAILURE);
      })
      .then(clientRecord => {
        if (typeof clientRecord === 'string') {
          this.logger.warn('No local client found in database');
          throw new ClientError(ClientError.TYPE.NO_VALID_CLIENT, ClientError.MESSAGE.NO_VALID_CLIENT);
        }

        const currentClient = ClientMapper.mapClient(clientRecord, true, clientRecord.domain);
        this.clientState.currentClient = currentClient;
        return this.clientState.currentClient;
      });
  }

  /**
   * Save a client into the database.
   *
   * @param userId ID of user client to be stored belongs to
   * @param clientPayload Client data to be stored in database
   * @returns Resolves with the record stored in database
   */
  saveClientInDb(userId: QualifiedId, clientPayload: ClientRecord): Promise<ClientRecord> {
    const primaryKey = constructClientId(userId, clientPayload.id);
    return this.clientService.saveClientInDb(primaryKey, clientPayload);
  }

  /**
   * Updates properties for a client record in database.
   *
   * @todo Merge "meta" property before updating it, Object.assign(payload.meta, changes.meta)
   * @param userId Qualified User ID of the client owner
   * @param clientId Client ID which needs to get updated
   * @param changes New values which should be updated on the client
   * @returns Number of updated records
   */
  private updateClientInDb(primaryKey: string, changes: Partial<ClientRecord>): Promise<number> {
    // Preserve primary key on update
    changes.meta.primary_key = primaryKey;
    return this.clientService.updateClientInDb(primaryKey, changes);
  }

  /**
   * Change verification state of client.
   *
   * @param userId User ID of the client owner
   * @param clientEntity Client which needs to get updated
   * @param isVerified New state to apply
   * @returns Resolves when the verification state has been updated
   */
  async verifyClient(userId: QualifiedId, clientEntity: ClientEntity, isVerified: boolean): Promise<void> {
    const primaryKey = clientEntity.meta.primaryKey ?? constructClientId(userId, clientEntity.id);
    await this.updateClientInDb(primaryKey, {meta: {is_verified: isVerified}});
    clientEntity.meta.isVerified(isVerified);
    amplify.publish(WebAppEvents.CLIENT.VERIFICATION_STATE_CHANGED, userId, clientEntity, isVerified);
  }

  /**
   * Updates a client payload if it does not fit the current database structure.
   *
   * @param userId User ID of the client owner
   * @param clientPayload Client data to be stored in database
   * @returns Resolves with the record stored in database
   */
  private updateClientSchemaInDb(userId: QualifiedId, clientPayload: PublicClient): Promise<ClientRecord> {
    const clientRecord: ClientRecord = {
      ...clientPayload,
      domain: userId.domain,
      meta: {
        is_verified: false,
        is_mls_verified: false,
        primary_key: constructClientId(userId, clientPayload.id),
      },
    };
    return this.saveClientInDb(userId, clientRecord);
  }

  //##############################################################################
  // Login and registration
  //##############################################################################

  /**
   * Constructs the key for a cookie label.
   * @param login Email or phone number of the user
   * @param clientType Temporary or permanent client type
   * @returns Cookie label key
   */
  constructCookieLabelKey(login: string, clientType: ClientType = this.loadCurrentClientType()): string {
    const loginHash = murmurhash.v3(login || this.selfUser().id, 42);
    return `${StorageKey.AUTH.COOKIE_LABEL}@${loginHash}@${clientType}`;
  }

  /**
   * Get and validate the local client.
   * @returns Resolves with an observable containing the client if valid
   */
  async getValidLocalClient(): Promise<ClientEntity> {
    try {
      const clientEntity = await this.getCurrentClientFromDb();
      await this.getClientByIdFromBackend(clientEntity.id);
      const currentClient = this.clientState.currentClient;

      if (!currentClient) {
        throw new ClientError(ClientError.TYPE.CLIENT_NOT_SET, ClientError.MESSAGE.CLIENT_NOT_SET);
      }

      return currentClient;
    } catch (error) {
      const clientNotValidated = error.type === ClientError.TYPE.NO_VALID_CLIENT;
      if (!clientNotValidated) {
        this.logger.error(`Getting valid local client failed: ${error.code || error.message}`, error);
      }

      throw error;
    }
  }

  /**
   * Load current client type from amplify store.
   * @returns Type of current client
   */
  private loadCurrentClientType(): ClientType.PERMANENT | ClientType.TEMPORARY | undefined {
    if (this.clientState.currentClient) {
      return this.clientState.currentClient.type;
    }
    const isPermanent = loadValue(StorageKey.AUTH.PERSIST);
    const type = isPermanent ? ClientType.PERMANENT : ClientType.TEMPORARY;
    return Runtime.isDesktopApp() ? ClientType.PERMANENT : type;
  }

  //##############################################################################
  // Client handling
  //##############################################################################

  /**
   * Delete client of a user on backend and removes it locally.
   *
   * @param clientId ID of the client that should be deleted
   * @param password Password entered by user
   * @returns Resolves with the remaining user devices
   */
  async deleteClient(clientId: string, password?: string): Promise<ClientEntity[]> {
    const selfUser = this.selfUser();
    await this.core.service!.client.deleteClient(clientId, password);
    selfUser.removeClient(clientId);
    amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, selfUser.qualifiedId, clientId);
    return selfUser.devices();
  }

  logoutClient = async (): Promise<void> => {
    if (this.clientState.currentClient) {
      if (this.clientState.currentClient.isTemporary()) {
        await this.deleteLocalTemporaryClient();
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
      } else {
        PrimaryModal.show(PrimaryModal.type.OPTION, {
          preventClose: true,
          primaryAction: {
            action: (clearData: boolean) => {
              return amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, clearData);
            },
            text: t('modalAccountLogoutAction'),
          },
          text: {
            option: t('modalAccountLogoutOption'),
            title: t('modalAccountLogoutHeadline'),
          },
        });
      }
    }
  };

  /**
   * Removes a stored client and the session connected with it.
   *
   * @param userId ID of user
   * @param clientId ID of client to be deleted
   * @returns Resolves when a client and its session have been deleted
   */
  async removeClient(userId: QualifiedId, clientId: string): Promise<string> {
    await this.cryptographyRepository.deleteSession(userId, clientId);
    return this.deleteClientFromDb(userId, clientId);
  }

  /**
   * Retrieves meta information about all the clients of a given user.
   * @note If you want to get very detailed information about the devices from the own user, then use `getClients()`.
   *
   * @param userIds User IDs to retrieve client information for
   * @param updateClients Automatically update the clients
   * @returns Resolves with an array of client entities
   */
  async getClientsByUserIds(userIds: QualifiedId[], updateClients: boolean): Promise<QualifiedUserClientEntityMap> {
    const clientEntityMap: QualifiedUserClientEntityMap = {};
    const qualifiedUserClientsMap = await this.clientService.getClientsByUserIds(userIds);

    await Promise.all(
      Object.entries(qualifiedUserClientsMap).map(([domain, userClientMap]) =>
        Promise.all(
          Object.entries(userClientMap).map(async ([userId, clients]) => {
            const isSelfClient = matchQualifiedIds({domain, id: userId}, this.selfUser().qualifiedId);
            clientEntityMap[domain] ||= {};
            clientEntityMap[domain][userId] = updateClients
              ? await this.updateUserClients({domain, id: userId}, clients, true)
              : ClientMapper.mapClients(clients, isSelfClient, domain);
          }),
        ),
      ),
    );

    return clientEntityMap;
  }

  private async getClientByUserIdFromDb(userQualifiedId: QualifiedId): Promise<ClientRecord[]> {
    const clients = await this.clientService.loadAllClientsFromDb();
    return clients.filter(client => {
      const {userId, domain} = parseClientId(client.meta.primary_key);
      return matchQualifiedIds({domain, id: userId}, userQualifiedId);
    });
  }

  /**
   * Retrieves meta information about all other locally known clients of the self user.
   * @returns Resolves with all locally known clients except the current one
   */
  async getClientsForSelf(): Promise<ClientEntity[]> {
    const {domain, id} = this.selfUser();
    const clientRecords = await this.getClientByUserIdFromDb({domain, id});
    const clientEntities = ClientMapper.mapClients(clientRecords, true, domain);
    clientEntities.forEach(clientEntity => this.selfUser().addClient(clientEntity));
    return this.selfUser().devices();
  }

  /**
   * Is the current client permanent.
   * @returns Type of current client is permanent
   */
  isCurrentClientPermanent(): boolean {
    if (!this.clientState.currentClient) {
      throw new ClientError(ClientError.TYPE.CLIENT_NOT_SET, ClientError.MESSAGE.CLIENT_NOT_SET);
    }
    return Runtime.isDesktopApp() || this.clientState.currentClient.isPermanent();
  }

  /**
   * Update clients of the self user.
   * @returns Resolves when the clients have been updated
   */
  async updateClientsForSelf(): Promise<ClientEntity[]> {
    const clientsData = await this.getAllSelfClients();
    const {domain, id} = this.selfUser();
    return this.updateUserClients({domain, id}, clientsData, false);
  }

  /**
   * Fetches metadata of all the self user's clients.
   */
  public async getAllSelfClients(): Promise<RegisteredClient[]> {
    return this.clientService.getClients();
  }

  /**
   * Update clients of a user with the given backend data.
   * @note This function matches clients retrieved from the backend with the data stored in the local database.
   *   Clients will then be updated with the backend payload in the database and mapped into entities.
   *
   * @param userId ID of user whose clients are updated
   * @param clientsData Clients data from backend
   * @param publish Change clients using amplify
   * @returns Resolves with the entities once clients have been updated
   */
  private async updateUserClients(
    userId: QualifiedId,
    clientsData: RegisteredClient[] | PublicClient[],
    publish: boolean = true,
  ): Promise<ClientEntity[]> {
    const clientsFromBackend: {[clientId: string]: RegisteredClient | PublicClient} = {};
    const clientsStoredInDb: ClientRecord[] = [];
    const isSelfUser = matchQualifiedIds(userId, this.selfUser());

    for (const client of clientsData) {
      clientsFromBackend[client.id] = client;
    }

    // Find clients in database
    return this.getClientByUserIdFromDb(userId)
      .then(async clientsFromDatabase => {
        const promises = [];

        for (const databaseClient of clientsFromDatabase) {
          const clientId = databaseClient.id;
          const backendClient = clientsFromBackend[clientId];

          if (backendClient) {
            const {client, wasUpdated} = ClientMapper.updateClient(databaseClient, {
              ...backendClient,
              domain: userId.domain,
            });

            delete clientsFromBackend[clientId];

            if (this.clientState.currentClient && this.isCurrentClient(userId, clientId)) {
              this.logger.warn(`Removing duplicate local self client`);
              await this.removeClient(userId, clientId);
            }

            // Locally known client changed on backend
            if (wasUpdated) {
              // Clear the previous client in DB (in case the domain changes the primary key will also change, thus invalidating the previous client)
              await this.clientService.deleteClientFromDb(client.meta.primary_key);
              this.logger.debug(`Updating local client`);
              promises.push(this.saveClientInDb(userId, client));
              continue;
            }

            // Locally known client unchanged on backend
            clientsStoredInDb.push(client);
            continue;
          }

          // Locally known client deleted on backend
          this.logger.warn(`Removing local client`);
          await this.removeClient(userId, clientId);
        }

        for (const clientId in clientsFromBackend) {
          const clientPayload = clientsFromBackend[clientId];

          if (this.clientState.currentClient && this.isCurrentClient(userId, clientId)) {
            continue;
          }

          // Locally unknown client new on backend
          this.logger.debug(`New client will be stored locally`);
          if (matchQualifiedIds(this.selfUser(), userId)) {
            this.onClientAdd({client: clientPayload as RegisteredClient});
          }
          promises.push(this.updateClientSchemaInDb(userId, clientPayload));
        }

        return Promise.all(promises);
      })
      .then(newRecords => ClientMapper.mapClients(clientsStoredInDb.concat(newRecords), isSelfUser, userId.domain))
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
   * @param userId User ID to be checked
   * @param clientId ID of client to be checked
   * @returns Is the client the current local client
   */
  private isCurrentClient(userId: QualifiedId, clientId: string): boolean {
    if (!this.clientState.currentClient) {
      throw new ClientError(ClientError.TYPE.CLIENT_NOT_SET, ClientError.MESSAGE.CLIENT_NOT_SET);
    }
    if (!userId) {
      throw new ClientError(ClientError.TYPE.NO_USER_ID, ClientError.MESSAGE.NO_USER_ID);
    }
    if (!clientId) {
      throw new ClientError(ClientError.TYPE.NO_CLIENT_ID, ClientError.MESSAGE.NO_CLIENT_ID);
    }
    return matchQualifiedIds(userId, this.selfUser()) && clientId === this.clientState.currentClient.id;
  }

  //##############################################################################
  // Conversation Events
  //##############################################################################

  /**
   * Listener for incoming user events.
   *
   * @param eventJson JSON data for event
   */
  private readonly onUserEvent = async (
    eventJson: UserClientAddEvent | UserClientRemoveEvent,
    source: EventSource,
  ): Promise<void> => {
    if (eventJson.type === USER_EVENT.CLIENT_ADD) {
      return this.onClientAdd(eventJson);
    }

    if (eventJson.type === USER_EVENT.CLIENT_REMOVE) {
      return this.onClientRemove(eventJson, source);
    }
  };

  /**
   * A client was added by the self user.
   * @param eventJson JSON data of 'user.client-add' event
   */
  private onClientAdd(eventJson: Pick<UserClientAddEvent, 'client'>): void {
    this.logger.debug('Client of self user added');
    amplify.publish(WebAppEvents.CLIENT.ADD, this.selfUser().qualifiedId, eventJson.client, true);
  }

  /**
   * A client was removed by the self user.
   * @param JSON data of 'user.client-remove' event
   * @returns Resolves when the event has been handled
   */
  private async onClientRemove(eventJson: UserClientRemoveEvent, source: EventSource): Promise<void> {
    const clientId = eventJson?.client ? eventJson.client.id : undefined;
    if (!clientId) {
      return;
    }

    const isCurrentClient = clientId === this.clientState.currentClient.id;
    if (isCurrentClient) {
      // If the current client has been removed, we need to sign out
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.CLIENT_REMOVED, true);
      return;
    }
    const localClients = await this.getClientsForSelf();
    const removedClient = localClients.find(client => client.id === clientId);
    if (removedClient?.isLegalHold()) {
      PrimaryModal.show(
        PrimaryModal.type.ACKNOWLEDGE,
        {
          text: {
            message: t('modalLegalHoldDeactivatedMessage'),
            title: t('modalLegalHoldDeactivatedTitle'),
          },
        },
        'legalHoldDeactivated',
      );
    }
    amplify.publish(WebAppEvents.CLIENT.REMOVE, this.selfUser().qualifiedId, clientId, source);
  }

  public async haveAllActiveSelfClientsRegisteredMLSDevice(): Promise<boolean> {
    const selfClients = await this.getAllSelfClients();
    //we consider client active if it was active within last 4 weeks
    const activeClients = selfClients.filter(wasClientActiveWithinLast4Weeks);
    return activeClients.every(isClientMLSCapable);
  }
}
