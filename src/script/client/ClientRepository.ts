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
import {ClientType, PublicClient, RegisteredClient, ClientCapability} from '@wireapp/api-client/src/client/';
import {USER_EVENT, UserClientAddEvent, UserClientRemoveEvent} from '@wireapp/api-client/src/event';
import {QualifiedId} from '@wireapp/api-client/src/user/';
import {Runtime} from '@wireapp/commons';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {container} from 'tsyringe';
import murmurhash from 'murmurhash';
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';
import {SIGN_OUT_REASON} from '../auth/SignOutReason';
import {StorageKey} from '../storage/StorageKey';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {ClientEntity} from './ClientEntity';
import {ClientMapper} from './ClientMapper';
import type {ClientService} from './ClientService';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {User} from '../entity/User';
import {ClientError} from '../error/ClientError';
import {ClientRecord, StorageRepository} from '../storage';
import {ClientState} from './ClientState';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {Core} from '../service/CoreSingleton';

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
    private readonly storageRepository: StorageRepository,
    private readonly clientState = container.resolve(ClientState),
    private readonly core = container.resolve(Core),
  ) {
    this.cryptographyRepository = cryptographyRepository;
    this.selfUser = ko.observable(undefined);
    this.logger = getLogger('ClientRepository');

    this.clientState.clients = ko.pureComputed(() => (this.selfUser() ? this.selfUser().devices() : []));

    amplify.subscribe(WebAppEvents.LIFECYCLE.ASK_TO_CLEAR_DATA, this.logoutClient);
    amplify.subscribe(WebAppEvents.USER.EVENT_FROM_BACKEND, this.onUserEvent);
  }

  init(selfUser: User): void {
    this.selfUser(selfUser);
    this.logger.info(`Initialized repository with user ID '${this.selfUser().id}'`);
  }

  //##############################################################################
  // Service interactions
  //##############################################################################

  private deleteClientFromDb(userId: QualifiedId, clientId: string): Promise<string> {
    return this.clientService.deleteClientFromDb(this.core.service!.cryptography.constructSessionId(userId, clientId));
  }

  /**
   * Delete the temporary client on the backend.
   * @returns Resolves when the temporary client was deleted on the backend
   */
  private deleteTemporaryClient(): Promise<void> {
    return this.clientService.deleteTemporaryClient(this.clientState.currentClient().id);
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
        const {userId} = ClientEntity.dismantleUserClientId(clientRecord.meta.primary_key);
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
        this.logger.warn(`Local client '${clientId}' no longer exists on the backend`, error);
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
          this.logger.info('No local client found in database');
          throw new ClientError(ClientError.TYPE.NO_VALID_CLIENT, ClientError.MESSAGE.NO_VALID_CLIENT);
        }

        const currentClient = ClientMapper.mapClient(clientRecord, true, clientRecord.domain);
        this.clientState.currentClient(currentClient);
        this.logger.info(`Loaded local client '${currentClient.id}'`, this.clientState.currentClient());
        return this.clientState.currentClient();
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
    const primaryKey = this.core.service!.cryptography.constructSessionId(userId, clientPayload.id);
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
  private updateClientInDb(userId: QualifiedId, clientId: string, changes: Partial<ClientRecord>): Promise<number> {
    const primaryKey = this.core.service!.cryptography.constructSessionId(userId, clientId);
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
    await this.updateClientInDb(userId, clientEntity.id, {meta: {is_verified: isVerified}});
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
      domain: this.core.backendFeatures.federationEndpoints ? userId.domain : undefined,
      meta: {
        is_verified: false,
        primary_key: this.core.service!.cryptography.constructSessionId(userId, clientPayload.id),
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
  async getValidLocalClient(): Promise<ko.Observable<ClientEntity>> {
    try {
      const clientEntity = await this.getCurrentClientFromDb();
      const clientPayload = await this.getClientByIdFromBackend(clientEntity.id);
      this.logger.info(`Client with ID '${clientPayload.id}' (${clientPayload.type}) validated on backend`);
      const currentClient = this.clientState.currentClient;

      await this.clientService.putClientCapabilities(currentClient().id, {
        capabilities: [ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT],
      });

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
  private loadCurrentClientType(): ClientType.PERMANENT | ClientType.TEMPORARY {
    if (this.clientState.currentClient()) {
      return this.clientState.currentClient().type;
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
  async deleteClient(clientId: string, password: string): Promise<ClientEntity[]> {
    const selfUser = this.selfUser();
    await this.clientService.deleteClient(clientId, password);
    await this.deleteClientFromDb(selfUser.qualifiedId, clientId);
    selfUser.removeClient(clientId);
    amplify.publish(WebAppEvents.USER.CLIENT_REMOVED, selfUser.qualifiedId, clientId);
    return this.clientState.clients();
  }

  removeLocalClient(): void {
    this.storageRepository.deleteCryptographyStores().then(() => {
      const shouldClearData = this.clientState.currentClient().isTemporary();
      amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.CLIENT_REMOVED, shouldClearData);
    });
  }

  logoutClient = async (): Promise<void> => {
    if (this.clientState.currentClient()) {
      if (this.clientState.isTemporaryClient()) {
        await this.deleteTemporaryClient();
        amplify.publish(WebAppEvents.LIFECYCLE.SIGN_OUT, SIGN_OUT_REASON.USER_REQUESTED, true);
      } else {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.OPTION, {
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
              ? await this.updateClientsOfUserById({domain, id: userId}, clients, true)
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
      const {userId, domain} = ClientEntity.dismantleUserClientId(client.meta.primary_key);
      return matchQualifiedIds({domain, id: userId}, userQualifiedId);
    });
  }

  /**
   * Retrieves meta information about all other locally known clients of the self user.
   * @returns Resolves with all locally known clients except the current one
   */
  async getClientsForSelf(): Promise<ClientEntity[]> {
    this.logger.info('Retrieving all clients of the self user from database');
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
    if (!this.clientState.currentClient()) {
      throw new ClientError(ClientError.TYPE.CLIENT_NOT_SET, ClientError.MESSAGE.CLIENT_NOT_SET);
    }
    return Runtime.isDesktopApp() || this.clientState.currentClient().isPermanent();
  }

  /**
   * Update clients of the self user.
   * @returns Resolves when the clients have been updated
   */
  async updateClientsForSelf(): Promise<ClientEntity[]> {
    const clientsData = await this.clientService.getClients();
    const {domain, id} = this.selfUser();
    return this.updateClientsOfUserById({domain, id}, clientsData, false);
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
  private updateClientsOfUserById(
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
      .then(clientsFromDatabase => {
        const promises = [];

        for (const databaseClient of clientsFromDatabase) {
          const clientId = databaseClient.id;
          const backendClient = clientsFromBackend[clientId];

          if (backendClient) {
            const {client, wasUpdated} = ClientMapper.updateClient(databaseClient, {
              ...backendClient,
              domain: this.core.backendFeatures.federationEndpoints ? userId.domain : undefined,
            });

            delete clientsFromBackend[clientId];

            if (this.clientState.currentClient() && this.isCurrentClient(userId, clientId)) {
              this.logger.warn(`Removing duplicate self client '${clientId}' locally`);
              this.removeClient(userId, clientId);
            }

            // Locally known client changed on backend
            if (wasUpdated) {
              // Clear the previous client in DB (in case the domain changes the primary key will also change, thus invalidating the previous client)
              this.clientService.deleteClientFromDb(client.meta.primary_key);
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

          if (this.clientState.currentClient() && this.isCurrentClient(userId, clientId)) {
            continue;
          }

          // Locally unknown client new on backend
          this.logger.info(`New client '${clientId}' of user '${userId}' will be stored locally`);
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
    if (!this.clientState.currentClient()) {
      throw new ClientError(ClientError.TYPE.CLIENT_NOT_SET, ClientError.MESSAGE.CLIENT_NOT_SET);
    }
    if (!userId) {
      throw new ClientError(ClientError.TYPE.NO_USER_ID, ClientError.MESSAGE.NO_USER_ID);
    }
    if (!clientId) {
      throw new ClientError(ClientError.TYPE.NO_CLIENT_ID, ClientError.MESSAGE.NO_CLIENT_ID);
    }
    return matchQualifiedIds(userId, this.selfUser()) && clientId === this.clientState.currentClient().id;
  }

  //##############################################################################
  // Conversation Events
  //##############################################################################

  /**
   * Listener for incoming user events.
   *
   * @param eventJson JSON data for event
   */
  private readonly onUserEvent = (eventJson: UserClientAddEvent | UserClientRemoveEvent): void => {
    if (eventJson.type === USER_EVENT.CLIENT_ADD) {
      return this.onClientAdd(eventJson);
    }

    if (eventJson.type === USER_EVENT.CLIENT_REMOVE) {
      this.onClientRemove(eventJson);
    }
  };

  /**
   * A client was added by the self user.
   * @param eventJson JSON data of 'user.client-add' event
   */
  private onClientAdd(eventJson: Pick<UserClientAddEvent, 'client'>): void {
    this.logger.info('Client of self user added', eventJson);
    amplify.publish(WebAppEvents.CLIENT.ADD, this.selfUser().qualifiedId, eventJson.client, true);
  }

  /**
   * A client was removed by the self user.
   * @param JSON data of 'user.client-remove' event
   * @returns Resolves when the event has been handled
   */
  private async onClientRemove(eventJson?: UserClientRemoveEvent): Promise<void> {
    const clientId = eventJson?.client ? eventJson.client.id : undefined;
    if (!clientId) {
      return;
    }

    const isCurrentClient = clientId === this.clientState.currentClient().id;
    if (isCurrentClient) {
      return this.removeLocalClient();
    }
    const localClients = await this.getClientsForSelf();
    const removedClient = localClients.find(client => client.id === clientId);
    if (removedClient?.isLegalHold()) {
      amplify.publish(
        WebAppEvents.WARNING.MODAL,
        ModalsViewModel.TYPE.ACKNOWLEDGE,
        {
          text: {
            message: t('modalLegalHoldDeactivatedMessage'),
            title: t('modalLegalHoldDeactivatedTitle'),
          },
        },
        'legalHoldDeactivated',
      );
    }
    amplify.publish(WebAppEvents.CLIENT.REMOVE, this.selfUser().qualifiedId, clientId);
  }
}
