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

import {AxiosRequestConfig, AxiosResponse} from 'axios';

import {HttpClient, TraceState} from '../http/';
import {CONVERSATION_PROTOCOL} from '../team';
import {UserUpdate} from '../user/';

import {ChangePassword, Consent, ConsentResults, Delete, Name, Self} from './';

export class SelfAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    CONSENT: 'consent',
    EMAIL: 'email',
    HANDLE: 'handle',
    LOCALE: 'locale',
    NAME: 'name',
    PASSWORD: 'password',
    SUPPORTED_PROTOCOLS: 'supported-protocols',
    SELF: '/self',
  };

  /**
   * Remove your email address.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/removeEmail
   */
  public async deleteEmail(): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.EMAIL}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Initiate account deletion.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteUser
   */
  public async deleteSelf(deleteData: Delete): Promise<void> {
    const config: AxiosRequestConfig = {
      data: deleteData,
      method: 'delete',
      url: SelfAPI.URL.SELF,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Get your profile name.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/selfName
   */
  public async getName(): Promise<Name> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.NAME}`,
    };

    const response = await this.client.sendJSON<Name>(config);
    return response.data;
  }

  /**
   * Get your consents.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/consent
   */
  public async getConsents(): Promise<ConsentResults> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.CONSENT}`,
    };

    const response = await this.client.sendJSON<{results: Consent[]}>(config);
    return response.data;
  }

  /**
   * Put your consent.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/consent
   */
  public async putConsent(consent: Consent): Promise<void> {
    const config: AxiosRequestConfig = {
      data: consent,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.CONSENT}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Get your profile
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/self
   */
  public async getSelf(traceStates: TraceState[] = []): Promise<Self> {
    traceStates.push({position: 'SelfAPI.getSelf', vendor: 'api-client'});
    const config: AxiosRequestConfig = {
      headers: {
        tracestate: traceStates.map(state => `${state.vendor}=${state.position}`).join(','),
      },
      method: 'get',
      url: SelfAPI.URL.SELF,
    };
    const response = await this.client.sendJSON<Self>(config);
    return response.data;
  }

  /**
   * Change your handle.
   * @param handleData The new handle
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeHandle
   */
  public async putHandle(handleData: {handle: string}): Promise<void> {
    const config: AxiosRequestConfig = {
      data: handleData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.HANDLE}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Change your locale.
   * @param localeData The new locale
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeLocale
   */
  public async putLocale(localeData: {locale: string}): Promise<void> {
    const config: AxiosRequestConfig = {
      data: localeData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.LOCALE}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Change your password.
   * @param passwordData The new password
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePassword
   */
  public async putPassword(passwordData: ChangePassword): Promise<void> {
    const config: AxiosRequestConfig = {
      data: passwordData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PASSWORD}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Update your profile.
   * @param profileData The new profile data
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSelf
   */
  public async putSelf(profileData: UserUpdate): Promise<void> {
    const config: AxiosRequestConfig = {
      data: profileData,
      method: 'put',
      url: SelfAPI.URL.SELF,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Update self user's list of supported-protocols
   * @param supportedProtocols The list of supported protocols
   */
  public async putSupportedProtocols(supportedProtocols: CONVERSATION_PROTOCOL[]) {
    const config: AxiosRequestConfig = {
      data: {supported_protocols: supportedProtocols},
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.SUPPORTED_PROTOCOLS}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Check if password is set.
   */
  public headPassword(): Promise<AxiosResponse<void>> {
    const config: AxiosRequestConfig = {
      method: 'head',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PASSWORD}`,
    };

    return this.client.sendJSON(config);
  }
}
