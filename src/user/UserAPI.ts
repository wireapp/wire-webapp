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

import Axios, {AxiosRequestConfig} from 'axios';

import {ArrayUtil} from '@wireapp/commons';

import {RichInfo} from './RichInfo';
import {RequestCancellationError} from './UserError';
import {QualifiedUserPreKeyBundleMap} from './UserPreKeyBundleMap';

import {BackendFeatures} from '../APIClient';
import {ClientPreKey, PreKeyBundle} from '../auth/';
import {VerificationActionType} from '../auth/VerificationActionType';
import {PublicClient, QualifiedPublicClients} from '../client/';
import {ConversationProtocol, QualifiedUserClients} from '../conversation/';
import {BackendError, BackendErrorLabel, HttpClient, RequestCancelable, SyntheticErrorLabel} from '../http/';
import {
  Activate,
  ActivationResponse,
  CheckHandles,
  CompletePasswordReset,
  HandleInfo,
  LimitedQualifiedUserIdList,
  NewPasswordReset,
  QualifiedHandle,
  QualifiedId,
  SearchResult,
  SendActivationCode,
  User,
  VerifyDelete,
} from '../user/';

type PrekeysResponse = {
  qualified_user_client_prekeys: QualifiedUserPreKeyBundleMap;
  failed_to_list?: QualifiedId[];
};
function isPrekeysResponse(object: any): object is PrekeysResponse {
  return object.qualified_user_client_prekeys;
}

type UsersReponse = {
  found: User[];
  failed?: QualifiedId[];
  not_found?: QualifiedId[];
};
function isUsersResponse(object: any): object is UsersReponse {
  return object.found || object.failed || object.not_found;
}

const apiBreakpoint = {
  version2: 2,
  // API V7 and up introduce new endpoints to conversations and users
  version7: 7,
  version8: 8,
};

export class UserAPI {
  public static readonly DEFAULT_USERS_CHUNK_SIZE = 50;
  public static readonly DEFAULT_USERS_PREKEY_BUNDLE_CHUNK_SIZE = 128;
  public static readonly URL = {
    ACTIVATE: 'activate',
    BY_HANDLE: 'by-handle',
    CALLS: 'calls',
    CLIENTS: 'clients',
    CONFIG: 'config',
    CONTACTS: 'contacts',
    DELETE: 'delete',
    EMAIL: 'email',
    HANDLES: 'handles',
    LIST_CLIENTS: 'list-clients',
    LIST_PREKEYS: 'list-prekeys',
    LIST_USERS: 'list-users',
    PASSWORD_RESET: 'password-reset',
    PRE_KEYS: 'prekeys',
    PROPERTIES: 'properties',
    RICH_INFO: 'rich-info',
    SEARCH: 'search',
    SEND: 'send',
    USERS: 'users',
    V2: 'v2',
    VERIFICATION: 'verification-code',
    SUPPORTED_PROTOCOLS: 'supported-protocols',
  };

  constructor(
    private readonly client: HttpClient,
    private readonly backendFeatures: BackendFeatures,
  ) {}

  /**
   * Clear all properties.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/clearProperties
   */
  public async deleteProperties(): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `/${UserAPI.URL.PROPERTIES}`,
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
      url: `/${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Activate (i.e. confirm) an email address.
   * @param activationCode Activation code
   * @param activationKey Activation key
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/activate
   */
  public async getActivation(activationCode: string, activationKey: string): Promise<ActivationResponse> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code: activationCode,
        key: activationKey,
      },
      url: `/${UserAPI.URL.ACTIVATE}`,
    };

    const response = await this.client.sendJSON<ActivationResponse>(config);
    return response.data;
  }

  /**
   * Retrieve TURN server addresses and credentials.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getCallsConfig
   */
  public async getCallsConfiguration(): Promise<RTCConfiguration> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url:
        this.backendFeatures.version >= apiBreakpoint.version8
          ? `/${UserAPI.URL.CALLS}/${UserAPI.URL.CONFIG}/${UserAPI.URL.V2}`
          : `/${UserAPI.URL.CALLS}/${UserAPI.URL.CONFIG}`,
    };

    const response = await this.client.sendJSON<RTCConfiguration>(config);
    return response.data;
  }

  /**
   * Get a specific client of a user.
   * @param userId The user ID
   * @param clientId The client ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserClient
   */
  public async getClient(userId: QualifiedId, clientId: string): Promise<PublicClient> {
    const url = `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}/${UserAPI.URL.CLIENTS}/${clientId}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<PublicClient>(config);
    return response.data;
  }

  /**
   * Get a prekey for a specific client of a user.
   * @param userId The user ID
   * @param clientId The client ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getPrekey
   */
  public async getClientPreKey(userId: QualifiedId, clientId: string): Promise<ClientPreKey> {
    const {id, domain} = userId;
    const url = `/${UserAPI.URL.USERS}/${domain}/${id}/${UserAPI.URL.PRE_KEYS}/${clientId}`;
    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<ClientPreKey>(config);
    return response.data;
  }

  /**
   * Get all of a user's clients.
   * @param userId The user ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserClients
   */
  public async getClients(userId: QualifiedId): Promise<PublicClient[]> {
    const url = `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}/${UserAPI.URL.CLIENTS}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<PublicClient[]>(config);
    return response.data;
  }

  /**
   * @deprecated use getSearchContacts instead
   * Get information on a user handle.
   * @param handle The user's handle
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getUserHandleInfo
   */
  public async getHandle(handle: string): Promise<HandleInfo> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/${UserAPI.URL.USERS}/${UserAPI.URL.HANDLES}/${handle}`,
    };

    const response = await this.client.sendJSON<HandleInfo>(config);
    return response.data;
  }

  /**
   * List all property keys.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/listPropertyKeys
   */
  public async getProperties(): Promise<string[]> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/${UserAPI.URL.PROPERTIES}`,
    };

    const response = await this.client.sendJSON<string[]>(config);
    return response.data;
  }

  /**
   * Get a property value.
   * @param propertyKey The property key to get
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getProperty
   */
  public async getProperty<T>(propertyKey: string): Promise<T> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    const response = await this.client.sendJSON<T>(config);
    return response.data;
  }

  /**
   * Search for users.
   * @param query The search query
   * @param domain The domain where the user should be hosted
   * @param limit Number of results to return
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/search
   */
  public async getSearchContacts(
    query: string,
    limit?: number,
    domain?: string,
  ): Promise<RequestCancelable<SearchResult>> {
    const cancelSource = Axios.CancelToken.source();
    const config: AxiosRequestConfig = {
      cancelToken: cancelSource.token,
      method: 'get',
      params: {
        q: query,
      },
      url: `/${UserAPI.URL.SEARCH}/${UserAPI.URL.CONTACTS}`,
    };

    if (domain) {
      config.params.domain = domain;
    }
    if (limit) {
      config.params.size = limit;
    }

    const handleRequest = async () => {
      try {
        const response = await this.client.sendJSON<SearchResult>(config);
        return response.data;
      } catch (error) {
        if ((error as BackendError).message === SyntheticErrorLabel.REQUEST_CANCELLED) {
          throw new RequestCancellationError('Search request got cancelled');
        }
        throw error;
      }
    };

    return {
      cancel: () => cancelSource.cancel(SyntheticErrorLabel.REQUEST_CANCELLED),
      response: handleRequest(),
    };
  }

  /**
   * Get a user by ID.
   * @note If you want to get all properties (`sso_id`, `managed_by`, etc.) for your own user, use "/self".
   *       Otherwise you will get a user payload with a limited set of properties (what's publicly available).
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/user
   */
  public async getUser(userId: string | QualifiedId): Promise<User> {
    const url =
      typeof userId === 'string'
        ? `/${UserAPI.URL.USERS}/${userId}`
        : `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<User>(config);
    return response.data;
  }

  public async getUserPreKeys(userId: QualifiedId): Promise<PreKeyBundle> {
    const url = `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}/${UserAPI.URL.PRE_KEYS}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<PreKeyBundle>(config, true);
    return response.data;
  }

  public async getUserSupportedProtocols(userId: QualifiedId): Promise<ConversationProtocol[]> {
    const url = `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}/${UserAPI.URL.SUPPORTED_PROTOCOLS}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };

    const response = await this.client.sendJSON<ConversationProtocol[]>(config, true);
    return response.data;
  }

  /**
   * @deprecated use getUser, getSearchContacts or postListUsers instead
   * List users.
   * Note: The 'ids' and 'handles' parameters are mutually exclusive.
   * @param parameters Multiple user's handles or IDs
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   */
  public async getUsers(
    parameters: {ids: string[]} | {handles: string[]},
    limit: number = UserAPI.DEFAULT_USERS_CHUNK_SIZE,
  ): Promise<User[]> {
    const fetchUsers = async (params: {ids: string[]} | {handles: string[]}): Promise<User[]> => {
      const config: AxiosRequestConfig = {
        method: 'get',
        params: {},
        url: UserAPI.URL.USERS,
      };

      if ('handles' in params) {
        config.params.handles = params.handles.join(',');
      } else if ('ids' in params) {
        config.params.ids = params.ids.join(',');
      }

      const response = await this.client.sendJSON<User[]>(config);
      return response.data;
    };

    if ('handles' in parameters && parameters.handles.length) {
      const uniqueHandles = ArrayUtil.removeDuplicates(parameters.handles);
      const handleChunks = ArrayUtil.chunk(uniqueHandles, limit);
      const resolvedTasks = await Promise.all(handleChunks.map(handleChunk => fetchUsers({handles: handleChunk})));
      return ArrayUtil.flatten(resolvedTasks);
    }

    if ('ids' in parameters && parameters.ids.length) {
      const uniqueIds = ArrayUtil.removeDuplicates(parameters.ids);
      const idChunks = ArrayUtil.chunk(uniqueIds, limit);
      const resolvedTasks = await Promise.all(idChunks.map(idChunk => fetchUsers({ids: idChunk})));
      return ArrayUtil.flatten(resolvedTasks);
    }

    return [];
  }

  /**
   * List users.
   * @param userIds Multiple user's IDs
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/users
   */
  public async getUsersByIds(userIds: string[]): Promise<User[]> {
    const maxChunkSize = 100;
    return this.getUsers({ids: userIds}, maxChunkSize);
  }

  /**
   * Check if a user ID exists.
   */
  public async headUsers(userId: string | QualifiedId): Promise<void> {
    const url =
      typeof userId === 'string'
        ? `/${UserAPI.URL.USERS}/${userId}`
        : `/${UserAPI.URL.USERS}/${userId.domain}/${userId.id}`;

    const config: AxiosRequestConfig = {
      method: 'head',
      url,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Activate (i.e. confirm) an email address.
   * Note: Activation only succeeds once and the number of failed attempts for a valid key is limited.
   * @param activationData Data to activate an account
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/activate_0
   */
  public async postActivation(activationData: Activate): Promise<ActivationResponse> {
    const config: AxiosRequestConfig = {
      data: activationData,
      method: 'post',
      url: `/${UserAPI.URL.ACTIVATE}`,
    };

    const response = await this.client.sendJSON<ActivationResponse>(config);
    return response.data;
  }

  /**
   * Send (or resend) an email activation code.
   * @param activationCodeData Data to send an activation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/sendActivationCode
   */
  public async postActivationCode(activationCodeData: SendActivationCode): Promise<void> {
    const config: AxiosRequestConfig = {
      data: activationCodeData,
      method: 'post',
      url: `/${UserAPI.URL.ACTIVATE}/${UserAPI.URL.SEND}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Generates a verification code to be sent to the email address provided
   * @param email users email address
   * @param action whether the action is for a SCIM code generation or a user login
   */
  public async postVerificationCode(email: string, action: VerificationActionType): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {email, action},
      method: 'post',
      url: `/${UserAPI.URL.VERIFICATION}/${UserAPI.URL.SEND}`,
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
      url: `/${UserAPI.URL.DELETE}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Check availability of user handles.
   * @param handles The handles to check
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandles
   */
  public async postHandles(handles: CheckHandles): Promise<string[]> {
    const config: AxiosRequestConfig = {
      data: handles,
      method: 'post',
      url:
        this.backendFeatures.version >= apiBreakpoint.version7
          ? `/${UserAPI.URL.HANDLES}`
          : `/${UserAPI.URL.USERS}/${UserAPI.URL.HANDLES}`,
    };

    const response = await this.client.sendJSON<string[]>(config);
    return response.data;
  }

  /**
   * Check availability of a single user handle.
   * @param handle The handle to check
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/checkUserHandle
   */
  public async headHandle(handle: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'head',
      url:
        this.backendFeatures.version >= apiBreakpoint.version7
          ? `/${UserAPI.URL.HANDLES}/${handle}`
          : `/${UserAPI.URL.USERS}/${UserAPI.URL.HANDLES}/${handle}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * @deprecated use getSearchContacts instead
   * Get a user by fully qualified handle.
   * @param handle The handle of a user to search for
   */
  public async getUserByHandle(handle: QualifiedHandle): Promise<User> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/${UserAPI.URL.USERS}/${UserAPI.URL.BY_HANDLE}/${handle.domain}/${handle.handle}`,
    };

    const response = await this.client.sendJSON<User>(config);
    return response.data;
  }

  private async postMultiPreKeyBundlesChunk(userClientMap: QualifiedUserClients): Promise<PrekeysResponse> {
    const config: AxiosRequestConfig = {
      data: userClientMap,
      method: 'post',
      url: `/${UserAPI.URL.USERS}/${UserAPI.URL.LIST_PREKEYS}`,
    };

    const response = await this.client.sendJSON<QualifiedUserPreKeyBundleMap | PrekeysResponse>(config, true);
    return isPrekeysResponse(response.data) ? response.data : {qualified_user_client_prekeys: response.data};
  }

  /**
   * List users.
   * Note: The 'qualified_ids' and 'qualified_handles' parameters are mutually exclusive.
   */
  public async postListUsers(
    users: {qualified_ids: QualifiedId[]} | {qualified_handles: QualifiedHandle[]},
  ): Promise<UsersReponse> {
    const config: AxiosRequestConfig = {
      data: users,
      method: 'post',
      url: `/${UserAPI.URL.LIST_USERS}`,
    };
    try {
      /**
       * We expect two differents responses depending on which version of the API the back-end is running
       * of type UserResponse in the case of a newer back-end
       * of type User[] in the case of an older back-end
       */
      const {data: userData} = await this.client.sendJSON<User[] | UsersReponse>(config);
      /* If the response is of type UserResponse, the webapp consumes it as is */
      if (isUsersResponse(userData)) {
        return userData;
      }
      /* If the response is of type User[], we format it in a way that the webapp can consume */
      return {found: userData};
    } catch (error: any) {
      /* We handle errors with the older API by re-fetching users on the same back-end and returning all federated users as "failed" */
      if (
        [
          BackendErrorLabel.FEDERATION_NOT_AVAILABLE,
          BackendErrorLabel.FEDERATION_BACKEND_NOT_FOUND,
          BackendErrorLabel.FEDERATION_REMOTE_ERROR,
          BackendErrorLabel.FEDERATION_TLS_ERROR,
        ].includes(error.label) &&
        'qualified_ids' in users
      ) {
        const selfDomain = this.backendFeatures.domain;
        const sameBackendUsers = users.qualified_ids.filter(userId => userId.domain === selfDomain);
        const federatedUsers = users.qualified_ids.filter(userId => userId.domain !== selfDomain);

        const {data: sameBackendUserData} = await this.client.sendJSON<User[]>({
          data: {qualified_ids: sameBackendUsers},
          method: 'post',
          url: `/${UserAPI.URL.LIST_USERS}`,
        });
        return {found: sameBackendUserData, failed: federatedUsers};
      }
      throw error;
    }
  }

  /**
   * Get client infos from a list of users.
   */
  public async postListClients(userIdList: LimitedQualifiedUserIdList): Promise<QualifiedPublicClients> {
    const config: AxiosRequestConfig = {
      data: userIdList,
      method: 'post',
      url:
        this.backendFeatures.version >= apiBreakpoint.version2
          ? `/${UserAPI.URL.USERS}/${UserAPI.URL.LIST_CLIENTS}`
          : `/${UserAPI.URL.USERS}/${UserAPI.URL.LIST_CLIENTS}/${UserAPI.URL.V2}`,
    };

    const response = await this.client.sendJSON<QualifiedPublicClients>(config);
    return response.data;
  }

  /**
   * Given a map of qualified user IDs to client IDs return a prekey for each one.
   * @param userClientMap A map of the qualified user's clients
   */
  public async postMultiPreKeyBundles(
    userClientMap: QualifiedUserClients,
    limit: number = UserAPI.DEFAULT_USERS_PREKEY_BUNDLE_CHUNK_SIZE,
  ): Promise<PrekeysResponse> {
    const flattenUsers = Object.entries(userClientMap).reduce(
      (users, [domain, domainUsersClients]) => {
        const domainUsers = Object.entries(domainUsersClients).map(([userId, clients]) => ({
          userId: {id: userId, domain},
          clients,
        }));
        return users.concat(domainUsers);
      },
      [] as {userId: QualifiedId; clients: string[]}[],
    );

    const chunksPromises = ArrayUtil.chunk(flattenUsers, limit)
      .map(chunk => {
        return chunk.reduce<QualifiedUserClients>((chunkedMap, {userId, clients}) => {
          return {
            ...chunkedMap,
            [userId.domain]: {
              ...chunkedMap[userId.domain],
              [userId.id]: clients,
            },
          };
        }, {});
      })
      .map(chunkedMap => this.postMultiPreKeyBundlesChunk(chunkedMap));

    const userPreKeyBundleMapChunks = await Promise.all(chunksPromises);

    return userPreKeyBundleMapChunks.reduce(
      (response, userPreKeyBundleMapChunk) => {
        Object.entries(userPreKeyBundleMapChunk.qualified_user_client_prekeys).forEach(([domain, userClientMap]) => {
          response.qualified_user_client_prekeys[domain] = {
            ...response.qualified_user_client_prekeys[domain],
            ...userClientMap,
          };
        });
        response.failed_to_list?.push(...(userPreKeyBundleMapChunk.failed_to_list ?? []));
        return response;
      },
      {qualified_user_client_prekeys: {}, failed_to_list: []},
    );
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
      url: `/${UserAPI.URL.PASSWORD_RESET}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Set a user property.
   * @param propertyKey The property key to set
   * @param propertyData The property data to set
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/setProperty
   */
  public async putProperty<T>(propertyKey: string, propertyData: T): Promise<void> {
    const config: AxiosRequestConfig = {
      data: propertyData,
      method: 'put',
      url: `/${UserAPI.URL.PROPERTIES}/${propertyKey}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Get rich info of a user
   * @param userId The user ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getRichInfo
   */
  public async getRichInfo(userId: string): Promise<RichInfo> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `/${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.RICH_INFO}`,
    };

    const response = await this.client.sendJSON<RichInfo>(config);
    return response.data;
  }

  /**
   * Resend email address validation
   * @param userId The user ID
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/put_users__uid__email
   */
  public async putRevalidateEmail(userId: string, email: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {email},
      method: 'put',
      url: `/${UserAPI.URL.USERS}/${userId}/${UserAPI.URL.EMAIL}`,
    };
    await this.client.sendJSON(config);
  }

  /**
   * Mark a user as searchable / non-searchable
   * @param userId
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_users__uid__searchable
   */
  public async postUserSearchable(userId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `/${UserAPI.URL.USERS}/${userId}/searchable`,
    };

    await this.client.sendJSON(config);
  }
}
