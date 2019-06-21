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

import {chunk, flatten, removeDuplicates} from '@wireapp/commons/dist/commonjs/util/ArrayUtil';
import {ClientPreKey, PreKeyBundle} from '../auth/';
import {PublicClient} from '../client/';
import {UserClients} from '../conversation/UserClients';
import {HttpClient} from '../http/';
import {
  Activate,
  ActivationResponse,
  CheckHandles,
  CompletePasswordReset,
  HandleInfo,
  NewPasswordReset,
  SearchResult,
  SendActivationCode,
  User,
  UserPreKeyBundleMap,
  VerifyDelete,
} from '../user/';

export class UserAPI {
  static readonly DEFAULT_USERS_CHUNK_SIZE = 50;
  static readonly URL = {
    ACTIVATE: '/activate',
    CALLS: '/calls',
    CLIENTS: 'clients',
    CONTACTS: 'contacts',
    DELETE: '/delete',
    HANDLES: 'handles',
    PASSWORDRESET: '/password-reset',
    PRE_KEYS: 'prekeys',
    PROPERTIES: '/properties',
    SEARCH: '/search',
    SEND: 'send',
    USERS: '/users',
  };

  constructor(private readonly client: HttpClient) {}

  /**
   * Clear all properties.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
   */
  public async deleteProperties(): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: UserAPI.URL.PROPERTIES,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Delete a property.
   * @param propertyKey The property key to delete
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteProperty
   */
  public async deleteProperty(propertyKey: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Activate (i.e. confirm) an email address or phone number.
   * @param activationCode Activation code
   * @param activationKey Activation key
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/activate
   */
  public getActivation(activationCode: string, activationKey: string): Promise<ActivationResponse> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code: activationCode,
        key: activationKey,
      },
      url: UserAPI.URL.ACTIVATE,
    };

    return this.client.sendJSON<ActivationResponse>(config).then(response => response.data);
  }

  /**
   * Retrieve TURN server addresses and credentials.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getCallsConfig
   */
  public getCallsConfiguration(): Promise<RTCConfiguration> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.CALLS}/config`,
    };

    return this.client.sendJSON<RTCConfiguration>(config).then(response => response.data);
  }

  /**
   * Get a specific client of a user.
   * @param userId The user ID
   * @param clientId The client ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserClient
   */
  public getClient(userId: string, clientId: string): Promise<PublicClient> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.CLIENTS}/${clientId}`,
    };

    return this.client.sendJSON<PublicClient>(config).then(response => response.data);
  }

  /**
   * Get a prekey for a specific client of a user.
   * @param userId The user ID
   * @param clientId The client ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getPrekey
   */
  public getClientPreKey(userId: string, clientId: string): Promise<ClientPreKey> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.PRE_KEYS}/${clientId}`,
    };

    return this.client.sendJSON<ClientPreKey>(config).then(response => response.data);
  }

  /**
   * Get all of a user's clients.
   * @param userId The user ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserClients
   */
  public getClients(userId: string): Promise<PublicClient[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.CLIENTS}`,
    };

    return this.client.sendJSON<PublicClient[]>(config).then(response => response.data);
  }

  /**
   * Get information on a user handle.
   * @param handle The user's handle
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserHandleInfo
   */
  public getHandle(handle: string): Promise<HandleInfo> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${UserAPI.URL.HANDLES}/${handle}`,
    };

    return this.client.sendJSON<HandleInfo>(config).then(response => response.data);
  }

  /**
   * List all property keys.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listPropertyKeys
   */
  public getProperties(): Promise<string[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: UserAPI.URL.PROPERTIES,
    };

    return this.client.sendJSON<string[]>(config).then(response => response.data);
  }

  /**
   * Get a property value.
   * @param propertyKey The property key to get
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getProperty
   */
  public getProperty<T extends string>(propertyKey: string): Promise<Record<T, any>> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    return this.client.sendJSON<Record<T, any>>(config).then(response => response.data);
  }

  /**
   * Search for users.
   * @param query The search query
   * @param limit Number of results to return
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/search
   */
  public getSearchContacts(query: string, limit?: number): Promise<SearchResult> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        q: query,
      },
      url: `${UserAPI.URL.SEARCH}/${UserAPI.URL.CONTACTS}`,
    };

    if (limit) {
      config.params.size = limit;
    }

    return this.client.sendJSON<SearchResult>(config).then(response => response.data);
  }

  /**
   * Get a user by ID.
   * @param userId The user ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
   */
  public getUser(userId: string): Promise<User> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${userId}`,
    };

    return this.client.sendJSON<User>(config).then(response => response.data);
  }

  /**
   * Get a prekey for each client of a user.
   * @param userId
   */
  public getUserPreKeys(userId: string): Promise<PreKeyBundle> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.PRE_KEYS}`,
    };

    return this.client.sendJSON<PreKeyBundle>(config).then(response => response.data);
  }

  /**
   * List users.
   * Note: The 'ids' and 'handles' parameters are mutually exclusive.
   * @param parameters Multiple user's handles or IDs
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   */
  public async getUsers(parameters: {ids: string[]}, limit?: number): Promise<User[]>;
  public async getUsers(parameters: {handles: string[]}, limit?: number): Promise<User[]>;
  public async getUsers(
    parameters: {ids?: string[]; handles?: string[]},
    limit: number = UserAPI.DEFAULT_USERS_CHUNK_SIZE,
  ): Promise<User[]> {
    const {handles, ids} = parameters;

    if (handles && handles.length) {
      const uniqueHandles = removeDuplicates(handles);
      const handleChunks = chunk(uniqueHandles, limit);
      const tasks = handleChunks.map(handleChunk => this._getUsers({handles: handleChunk}));
      return Promise.all(tasks).then(flatten);
    }

    if (ids && ids.length) {
      const uniqueIds = removeDuplicates(ids);
      const idChunks = chunk(uniqueIds, limit);
      const tasks = idChunks.map(idChunk => this._getUsers({ids: idChunk}));
      return Promise.all(tasks).then(flatten);
    }

    return [];
  }

  private async _getUsers(parameters: {ids: string[]}): Promise<User[]>;
  private async _getUsers(parameters: {handles: string[]}): Promise<User[]>;
  private async _getUsers(parameters: {handles?: string[]; ids?: string[]}): Promise<User[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {},
      url: UserAPI.URL.USERS,
    };

    if (parameters.handles) {
      config.params.handles = parameters.handles.join(',');
    } else if (parameters.ids) {
      config.params.ids = parameters.ids.join(',');
    }

    return this.client.sendJSON<User[]>(config).then(response => response.data);
  }

  /**
   * DEPRECATED: List users.
   * @deprecated
   * @param userIds Multiple user's IDs
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   */
  public async getUsersByIds(userIds: string[]): Promise<User[]> {
    const maxChunkSize = 100;
    return this.getUsers({ids: userIds}, maxChunkSize);
  }

  /**
   * Activate (i.e. confirm) an email address or phone number.
   * Note: Activation only succeeds once and the number of failed attempts for a valid key is limited.
   * @param activationData Data to activate an account
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/activate_0
   */
  public postActivation(activationData: Activate): Promise<ActivationResponse> {
    const config: AxiosRequestConfig = {
      data: activationData,
      method: 'post',
      url: UserAPI.URL.ACTIVATE,
    };

    return this.client.sendJSON<ActivationResponse>(config).then(response => response.data);
  }

  /**
   * Send (or resend) an email or phone activation code.
   * @param activationCodeData Data to send an activation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendActivationCode
   */
  public async postActivationCode(activationCodeData: SendActivationCode): Promise<void> {
    const config: AxiosRequestConfig = {
      data: activationCodeData,
      method: 'post',
      url: `${UserAPI.URL.ACTIVATE}/${UserAPI.URL.SEND}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Verify account deletion with a code.
   * @param verificationData Data to verify the account deletion
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/verifyDeleteUser
   */
  public async postDelete(verificationData: VerifyDelete): Promise<void> {
    const config: AxiosRequestConfig = {
      data: verificationData,
      method: 'post',
      url: UserAPI.URL.DELETE,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Check availability of user handles.
   * @param handles The handles to check
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandles
   */
  public postHandles(handles: CheckHandles): Promise<string[]> {
    const config: AxiosRequestConfig = {
      data: handles,
      method: 'post',
      url: `${UserAPI.URL.USERS}/${UserAPI.URL.HANDLES}`,
    };

    return this.client.sendJSON<string[]>(config).then(response => response.data);
  }

  /**
   * Given a map of user IDs to client IDs return a prekey for each one.
   * Note: The maximum map size is 128 entries.
   * @param userClientMap A map of the user's clients
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getMultiPrekeyBundles
   */
  public postMultiPreKeyBundles(userClientMap: UserClients): Promise<UserPreKeyBundleMap> {
    const config: AxiosRequestConfig = {
      data: userClientMap,
      method: 'post',
      url: `${UserAPI.URL.USERS}/${UserAPI.URL.PRE_KEYS}`,
    };

    return this.client.sendJSON<UserPreKeyBundleMap>(config).then(response => response.data);
  }

  /**
   * Initiate or complete a password reset.
   * @param resetData The data needed to initiate or complete the reset
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/beginPasswordReset
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/completePasswordReset
   */
  public async postPasswordReset(resetData: NewPasswordReset | CompletePasswordReset): Promise<void> {
    const config: AxiosRequestConfig = {
      data: resetData,
      method: 'post',
      url: UserAPI.URL.PASSWORDRESET,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Set a user property.
   * @param propertyKey The property key to set
   * @param propertyData The property data to set
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/setProperty
   */
  public async putProperty(propertyKey: string, propertyData: Object): Promise<void> {
    const config: AxiosRequestConfig = {
      data: propertyData,
      method: 'put',
      url: `${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    await this.client.sendJSON(config);
  }
}
