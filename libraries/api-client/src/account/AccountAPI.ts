/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {CustomBackendNotFoundError} from './AccountError';
import {BackendConfigData} from './BackendConfigData';
import {CallConfigData} from './CallConfigData';
import {DomainData} from './DomainData';
import {DomainRedirect, DomainRedirectPayload} from './DomainRedirect';
import {SSOSettings} from './SSOSettings';

import {HttpClient, BackendErrorLabel, BackendError, StatusCode} from '../http';

export class AccountAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    ACTIVATE: '/activate',
    BACKEND_CONFIG: '/config.json',
    BY_DOMAIN: 'by-domain',
    CALLS: '/calls',
    CALLS_CONFIG: 'config',
    CALLS_CONFIG_V2: 'v2',
    CUSTOM_BACKEND: '/custom-backend',
    DELETE: '/delete',
    PASSWORD_RESET: '/password-reset',
    PASSWORD_RESET_COMPLETE: 'complete',
    PROVIDER: '/provider',
    SETTINGS: 'settings',
    SSO: '/sso',
    GET_DOMAIN_REGISTRATION: '/get-domain-registration',
  };

  /**
   * Delete account
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/delete
   */
  public async postDeleteAccount(key: string, code: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        code,
        key,
      },
      method: 'post',
      url: AccountAPI.URL.DELETE,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Start password reset flow
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/password-reset
   */
  public async postPasswordReset(email: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        email,
      },
      method: 'post',
      url: AccountAPI.URL.PASSWORD_RESET,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Start bot password reset flow
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/provider/password-reset
   */
  public async postBotPasswordReset(email: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        email,
      },
      method: 'post',
      url: `${AccountAPI.URL.PROVIDER}${AccountAPI.URL.PASSWORD_RESET}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Finish password reset flow
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/password-reset/complete
   */
  public async postPasswordResetComplete(password: string, key: string, code: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        code,
        key,
        password,
      },
      method: 'post',
      url: `${AccountAPI.URL.PASSWORD_RESET}/${AccountAPI.URL.PASSWORD_RESET_COMPLETE}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Finish bot password reset flow
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/provider/password-reset/complete
   */
  public async postBotPasswordResetComplete(password: string, key: string, code: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        code,
        key,
        password,
      },
      method: 'post',
      url: `${AccountAPI.URL.PROVIDER}${AccountAPI.URL.PASSWORD_RESET}/${AccountAPI.URL.PASSWORD_RESET_COMPLETE}`,
    };

    await this.client.sendJSON(config);
  }
  /**
   * Verify email address
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/activate
   */
  public async getVerifyEmail(key: string, code: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code,
        key,
      },
      url: AccountAPI.URL.ACTIVATE,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Verify service
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/provider/activate
   */
  public async getVerifyBot(key: string, code: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        code,
        key,
      },
      url: `${AccountAPI.URL.PROVIDER}${AccountAPI.URL.ACTIVATE}`,
    };

    await this.client.sendJSON(config);
  }

  public async getDomain(domain: string): Promise<DomainData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${AccountAPI.URL.CUSTOM_BACKEND}/${AccountAPI.URL.BY_DOMAIN}/${domain}`,
    };

    try {
      const response = await this.client.sendJSON<DomainData>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND: {
          throw new CustomBackendNotFoundError(backendError.message);
        }
      }
      throw error;
    }
  }

  public async getSSOSettings(): Promise<SSOSettings> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${AccountAPI.URL.SSO}/${AccountAPI.URL.SETTINGS}`,
    };

    const response = await this.client.sendJSON<SSOSettings>(config);
    return response.data;
  }

  /**
   * Retrieve all TURN server addresses and credentials.
   * Clients are expected to do a DNS lookup to resolve the IP addresses of the given hostnames
   *
   * @param limit Limits the number of ICE-Candidates returned. [1..10]
   */
  public async getCallConfig(limit?: number): Promise<CallConfigData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        limit,
      },
      url: `${AccountAPI.URL.CALLS}/${AccountAPI.URL.CALLS_CONFIG}/${AccountAPI.URL.CALLS_CONFIG_V2}`,
    };

    const response = await this.client.sendJSON<CallConfigData>(config);
    return response.data;
  }

  public async getConfig(): Promise<BackendConfigData> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${AccountAPI.URL.BACKEND_CONFIG}`,
    };

    const response = await this.client.sendJSON<BackendConfigData>(config);
    return response.data;
  }

  public async getDomainRegistration(email: string): Promise<DomainRedirectPayload> {
    const config: AxiosRequestConfig = {
      data: {
        email,
      },
      method: 'post',
      url: AccountAPI.URL.GET_DOMAIN_REGISTRATION,
    };

    try {
      const response = await this.client.sendJSON<DomainRedirectPayload>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      if (backendError.code === StatusCode.SERVICE_UNAVAILABLE) {
        return {
          domain_redirect: DomainRedirect.NONE,
        };
      }
      throw error;
    }
  }
}
