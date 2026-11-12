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

import type {Clock} from '@enormora/clock/clock';
import {isError, isUndefined} from '@sindresorhus/is';
import axios from 'axios';
import {StatusCodes} from 'http-status-codes';
import {Maybe, task, type Task} from 'true-myth';

import {APIClient} from '../../apiClient/apiClient';
import {LoginData} from '../../apiClient/auth/loginData';
import {ClientCapability} from '../../apiClient/client/clientCapability';
import {ClientCapabilityData} from '../../apiClient/client/clientCapabilityData';
import {ClientType} from '../../apiClient/client/clientType';
import {CreateClientPayload} from '../../apiClient/client/newClient';
import {RegisteredClient} from '../../apiClient/client/registeredClient';
import {BackendError} from '../../apiClient/http/backendError';
import {QualifiedId} from '../../apiClient/user/qualifiedId';
import {LogFactory} from '../../commons/LogFactory';
import type {ProteusService} from '../messagingProtocols/proteus';
import {InitialPrekeys} from '../messagingProtocols/proteus/proteusService/cryptoClient';
import {wipeCoreCryptoDb} from '../messagingProtocols/proteus/proteusService/cryptoClient/coreCryptoWrapper';
import type {CRUDEngine} from '../storage/engine/crudEngine';
import {RecordNotFoundError} from '../storage/engine/error';

import {ClientInfo, ClientBackendRepository, ClientDatabaseRepository} from './';

/** `HttpClient` turns error responses with a body into a `BackendError`, other failures stay an `AxiosError`. */
function isNotFoundError(error: unknown): boolean {
  if (error instanceof BackendError) {
    return Number(error.code) === StatusCodes.NOT_FOUND;
  }

  return axios.isAxiosError(error) && error.response?.status === StatusCodes.NOT_FOUND;
}

export interface MetaClient extends RegisteredClient {
  domain?: string;
  meta: {
    is_verified?: boolean;
    is_mls_verified?: boolean;
    primary_key: string;
  };
}

export class ClientService {
  private readonly database: ClientDatabaseRepository;
  private readonly backend: ClientBackendRepository;
  private readonly logger = LogFactory.getLogger('@wireapp/core/Client');

  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
    private readonly storeEngine: CRUDEngine,
    private readonly clock: Clock,
  ) {
    this.database = new ClientDatabaseRepository(this.storeEngine);
    this.backend = new ClientBackendRepository(this.apiClient);
  }

  public getClients(): Promise<RegisteredClient[]> {
    return this.backend.getClients();
  }

  /**
   * Will delete the given client from backend and will also delete it from the local database
   *
   * note: use deleteLocalClient if you wish to delete the client currently used by the user
   *
   * @param clientId The id of the client to delete
   * @param password? Password of the owning user. Can be omitted for temporary devices
   */
  public async deleteClient(clientId: string, password?: string): Promise<unknown> {
    const userId: QualifiedId = {id: this.apiClient.userId as string, domain: this.apiClient.domain ?? ''};
    await this.backend.deleteClient(clientId, password);
    return this.database.deleteClient(this.proteusService.constructSessionId(userId, clientId));
  }

  /**
   * Will delete the local client (client currently in use by the user) from backend and will also delete it from the local database
   * @param password? Password of the owning user. Can be omitted for temporary devices
   */
  public async deleteLocalClient(password?: string): Promise<string> {
    const localClientId = this.apiClient.context?.clientId;
    if (localClientId === undefined || localClientId.length === 0) {
      // No client in context -> there's nothing to delete on backend, just drop local state
      this.logger.warn('No local client id in context; deleting local client data from DB only.');
      return this.database.deleteLocalClient();
    }
    try {
      await this.backend.deleteClient(localClientId, password);
    } catch (error: unknown) {
      this.logger.warn('Failed to delete client on backend', error);
    }
    return this.database.deleteLocalClient();
  }

  private getLocalClient(): Task<Maybe<MetaClient>, Error> {
    return task
      .tryOrElse(
        error => {
          return isError(error) ? error : new Error('Failed to read the local client', {cause: error});
        },
        () => {
          return this.database.getLocalClient();
        },
      )
      .map<Maybe<MetaClient>>(client => {
        return Maybe.just(client);
      })
      .orElse(error => {
        if (error instanceof RecordNotFoundError) {
          return task.resolve(Maybe.nothing<MetaClient>());
        }

        return task.reject(error);
      });
  }

  /**
   * Will try to load the local client from the database into memory.
   * Returns Nothing if the local record is missing or the backend confirms the client was removed.
   * If the client doesn't exist on the backend it will clean up the identity before returning Nothing.
   * If the client is found on the backend it will update the local client in the database and return it.
   * Any other failure (database error, network error, ...) is a rejected Task.
   *
   * @return Just the loaded client, or Nothing for confirmed absence
   */
  public loadClient(): Task<Maybe<MetaClient>, Error> {
    return this.getLocalClient().andThen(loadedClient => {
      if (loadedClient.isNothing) {
        return task.resolve(loadedClient);
      }

      return task.tryOrElse(
        error => {
          return isError(error) ? error : new Error('Failed to load the local client', {cause: error});
        },
        async () => {
          let remoteClient: RegisteredClient;
          try {
            remoteClient = await this.apiClient.api.client.getClient(loadedClient.value.id);
          } catch (error: unknown) {
            if (!isNotFoundError(error)) {
              throw error;
            }
            if (this.storeEngine !== undefined) {
              const shouldDeleteWholeDatabase = loadedClient.value.type === ClientType.TEMPORARY;
              await this.proteusService.wipe();
              // The keystore is scoped to the user, so a new client must not inherit stale MLS key material.
              await wipeCoreCryptoDb(this.storeEngine, this.clock);
              if (shouldDeleteWholeDatabase) {
                await this.storeEngine.clearTables();
              }
              const log = `No valid client on backend, deleting identity (deleting content: ${shouldDeleteWholeDatabase ? 'yes' : 'no'})`;
              this.logger.warn(log);
            }

            return Maybe.nothing<MetaClient>();
          }

          return Maybe.just(await this.database.updateLocalClient(remoteClient));
        },
      );
    });
  }

  private createLocalClient(client: RegisteredClient, domain?: string): Promise<MetaClient> {
    return this.database.createLocalClient(client, domain);
  }

  public putClientCapabilities(clientId: string, capabilities: ClientCapabilityData): Promise<void> {
    return this.backend.putClient(clientId, capabilities);
  }

  /**
   * Will download all the clients of the self user (excluding the current client) and will store them in the database
   * @param currentClient - the id of the current client (to be excluded from the list)
   */
  public async synchronizeClients(currentClient: string): Promise<MetaClient[]> {
    const registeredClients = await this.backend.getClients();
    const filteredClients = registeredClients.filter(client => {
      return client.id !== currentClient;
    });
    const context = this.apiClient.context;
    if (isUndefined(context)) {
      throw new Error('Context is not set.');
    }

    return this.database.createClientList({id: context.userId, domain: context.domain ?? ''}, filteredClients);
  }

  // TODO: Split functionality into "create" and "register" client
  public async register(
    loginData: LoginData,
    clientInfo: ClientInfo,
    {prekeys, lastPrekey}: InitialPrekeys,
    useLegacyNotificationStream: boolean = true,
  ): Promise<RegisteredClient> {
    if (this.apiClient.context === undefined) {
      throw new Error('Context is not set.');
    }

    if (loginData.clientType === ClientType.NONE) {
      throw new Error(`Can't register client of type "${ClientType.NONE}"`);
    }

    const capabilities: ClientCapability[] = [ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT];
    if (!useLegacyNotificationStream) {
      capabilities.push(ClientCapability.CONSUMABLE_NOTIFICATIONS);
    }

    const newClient: CreateClientPayload = {
      class: clientInfo.classification,
      capabilities,
      cookie: clientInfo.cookieLabel,
      label: clientInfo.label,
      lastkey: lastPrekey,
      location: clientInfo.location,
      model: clientInfo.model,
      password: loginData.password !== undefined ? String(loginData.password) : undefined,
      verification_code: loginData.verificationCode,
      prekeys: prekeys,
      type: loginData.clientType,
    };

    const client = await this.backend.postClient(newClient);

    await this.createLocalClient(client, this.apiClient.context.domain);

    return client;
  }
}
