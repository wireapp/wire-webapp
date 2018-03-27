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

const logdown = require('logdown');
const pkg = require('../../package.json');
import APIClient = require('@wireapp/api-client');
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import ClientBackendRepository from './ClientBackendRepository';
import ClientDatabaseRepository from './ClientDatabaseRepository';
import {LoginData, PreKey} from '@wireapp/api-client/dist/commonjs/auth/index';
import {ClientInfo} from './root';
import {
  ClientClassification,
  ClientType,
  Location,
  NewClient,
  RegisteredClient,
} from '@wireapp/api-client/dist/commonjs/client/index';
import {CryptographyService} from '../cryptography/root';

export interface MetaClient extends RegisteredClient {
  meta: {
    primary_key: string;
    is_verified?: boolean;
  };
}

export default class ClientService {
  private logger: any = logdown('@wireapp/core/ClientService', {
    logger: console,
    markdown: false,
  });

  private database: ClientDatabaseRepository;
  private backend: ClientBackendRepository;

  constructor(
    private apiClient: APIClient,
    private storeEngine: CRUDEngine,
    private cryptographyService: CryptographyService
  ) {
    this.database = new ClientDatabaseRepository(this.storeEngine);
    this.backend = new ClientBackendRepository(this.apiClient);
    this.logger.state.isEnabled = true;
  }

  public deleteLocalClient(): Promise<string> {
    this.logger.info('deleteLocalClient');
    return this.database.deleteLocalClient();
  }

  public getLocalClient(): Promise<MetaClient> {
    this.logger.info('getLocalClient');
    return this.database.getLocalClient();
  }

  public createLocalClient(client: RegisteredClient): Promise<MetaClient> {
    this.logger.info('createLocalClient');
    return this.database.createLocalClient(client);
  }

  public synchronizeClients() {
    this.logger.info('synchronizeClients');
    return this.backend
      .getClients()
      .then((registeredClients: RegisteredClient[]) => {
        return registeredClients.filter(client => client.id !== this.apiClient.context!.clientId);
      })
      .then((registeredClients: RegisteredClient[]) => {
        return this.database.createClientList(this.apiClient.context!.userId, registeredClients);
      });
  }

  // TODO: Split functionality into "create" and "register" client
  public async register(
    loginData: LoginData,
    clientInfo: ClientInfo = {
      classification: ClientClassification.DESKTOP,
      cookieLabel: 'default',
      model: `${pkg.name} v${pkg.version}`,
    }
  ): Promise<RegisteredClient> {
    this.logger.info('register');
    if (!this.apiClient.context) {
      throw new Error('Context is not set.');
    }

    const serializedPreKeys: Array<PreKey> = await this.cryptographyService.createCryptobox();

    let newClient: NewClient;
    if (this.cryptographyService.cryptobox.lastResortPreKey) {
      newClient = {
        class: clientInfo.classification,
        cookie: clientInfo.cookieLabel,
        lastkey: this.cryptographyService.cryptobox.serialize_prekey(
          this.cryptographyService.cryptobox.lastResortPreKey
        ),
        location: clientInfo.location,
        password: String(loginData.password),
        prekeys: serializedPreKeys,
        model: clientInfo.model,
        sigkeys: {
          enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
          mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
        },
        type: loginData.persist ? ClientType.PERMANENT : ClientType.TEMPORARY,
      };
    } else {
      throw new Error('Cryptobox got initialized without a last resort PreKey.');
    }

    const client = await this.backend.postClient(newClient);
    await this.createLocalClient(client);
    await this.cryptographyService.initCryptobox();

    return client;
  }
}
