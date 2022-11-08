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

import {AxiosRequestConfig} from 'axios';

import {ClientCapabilityData} from './ClientCapabilityData';
import {ClientCapabilityRemovedError} from './ClientError';

import {PreKeyBundle} from '../auth/';
import {CreateClientPayload, RegisteredClient, UpdateClientPayload} from '../client/';
import {BackendError, BackendErrorLabel, HttpClient} from '../http/';

type ClaimedKeyPackages = {
  key_packages: {
    client: string;
    domain: string;
    key_package: string;
    key_package_ref: string;
    user: string;
  }[];
};

type PublicKeys = {
  removal: {
    [algorithm: string]: string;
  };
};

export class ClientAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    CLIENTS: '/clients',
    MLS_CLIENTS: 'mls',
    MLS_KEY_PACKAGES: 'key-packages',
    CAPABILITIES: 'capabilities',
    PREKEYS: 'prekeys',
    PUBLIC_KEYS: 'public-keys',
  };

  public async postClient(newClient: CreateClientPayload): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      data: newClient,
      method: 'post',
      url: ClientAPI.URL.CLIENTS,
    };

    const response = await this.client.sendJSON<RegisteredClient>(config);
    return response.data;
  }

  public async putClient(clientId: string, updatedClient: UpdateClientPayload): Promise<void> {
    const config: AxiosRequestConfig = {
      data: updatedClient,
      method: 'put',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    try {
      await this.client.sendJSON(config);
    } catch (error) {
      switch ((error as BackendError).label) {
        case BackendErrorLabel.CLIENT_CAPABILITY_REMOVED: {
          throw new ClientCapabilityRemovedError((error as BackendError).message);
        }
      }
      throw error;
    }
  }

  public async getClientCapabilities(clientId: string): Promise<ClientCapabilityData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}/${ClientAPI.URL.CAPABILITIES}`,
    };

    const response = await this.client.sendJSON<ClientCapabilityData>(config);
    return response.data;
  }

  /**
   * Deletes a client on the backend
   * @param clientId
   * @param password? password can be omitted if the client is a temporary client
   */
  public async deleteClient(clientId: string, password?: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        password,
      },
      method: 'delete',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    await this.client.sendJSON(config);
  }

  public async getClient(clientId: string): Promise<RegisteredClient> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}`,
    };

    const response = await this.client.sendJSON<RegisteredClient>(config);
    return response.data;
  }

  public async getClients(): Promise<RegisteredClient[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: ClientAPI.URL.CLIENTS,
    };

    const response = await this.client.sendJSON<RegisteredClient[]>(config);
    return response.data;
  }

  public async getClientPreKeys(clientId: string): Promise<PreKeyBundle> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ClientAPI.URL.CLIENTS}/${clientId}/${ClientAPI.URL.PREKEYS}`,
    };

    const response = await this.client.sendJSON<PreKeyBundle>(config, true);
    return response.data;
  }

  /**
   * Will upload keypackages for an MLS capable client
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_mls_key_packages_self__client_
   * @param {string} clientId The client to upload the key packages for
   * @param {string[]} keyPackages The key packages to upload
   */
  public async uploadMLSKeyPackages(clientId: string, keyPackages: string[]) {
    const config: AxiosRequestConfig = {
      data: {key_packages: keyPackages},
      method: 'POST',
      url: `/${ClientAPI.URL.MLS_CLIENTS}/${ClientAPI.URL.MLS_KEY_PACKAGES}/self/${clientId}`,
    };

    await this.client.sendJSON<PreKeyBundle>(config, true);
  }

  /**
   * Claim one key package for each client of the given user
   * @param  {string} userId The user to claim the key packages for
   * @param {string} userDomain The domain of the user
   * @param  {string} skipOwn Do not claim a key package for the given own client id
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_mls_key_packages_claim__user_domain___user_
   */
  public async claimMLSKeyPackages(userId: string, userDomain: string, skipOwn?: string): Promise<ClaimedKeyPackages> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `/${ClientAPI.URL.MLS_CLIENTS}/${ClientAPI.URL.MLS_KEY_PACKAGES}/claim/${userDomain}/${userId}${
        skipOwn ? `?skip_own=${skipOwn}` : ''
      }`,
    };
    const response = await this.client.sendJSON<ClaimedKeyPackages>(config, true);
    return response.data;
  }

  /**
   * Get the number of unused key packages for the given client
   * @param {string} clientId
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/get_mls_key_packages_self__client__count
   */
  public async getMLSKeyPackageCount(clientId: string): Promise<number> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `/${ClientAPI.URL.MLS_CLIENTS}/${ClientAPI.URL.MLS_KEY_PACKAGES}/self/${clientId}/count`,
    };

    const response = await this.client.sendJSON<{count: number}>(config, true);
    return response.data.count;
  }

  /**
   * Get the public keys from the backend, used for removing users from groups.
   * In the future this may be used for other purposes as well.
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/get_mls_public_keys
   */
  public async getPublicKeys(): Promise<PublicKeys> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `/${ClientAPI.URL.MLS_CLIENTS}/${ClientAPI.URL.PUBLIC_KEYS}`,
    };

    const response = await this.client.sendJSON<PublicKeys>(config, true);
    return response.data;
  }
}
