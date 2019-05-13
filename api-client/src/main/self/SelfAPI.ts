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

import {HttpClient} from '../http/';
import {ChangePassword, Delete, SearchableStatus, Self} from '../self/';
import {UserUpdate} from '../user/';
import {Consent} from './Consent';

class SelfAPI {
  constructor(private readonly client: HttpClient) {}

  static URL = {
    CONSENT: 'consent',
    EMAIL: 'email',
    HANDLE: 'handle',
    LOCALE: 'locale',
    NAME: 'name',
    PASSWORD: 'password',
    PHONE: 'phone',
    SEARCHABLE: 'searchable',
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
   * Remove your phone number.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/removePhone
   */
  public async deletePhone(): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PHONE}`,
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
  public getName(): Promise<{name: string}> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.NAME}`,
    };

    return this.client.sendJSON<{name: string}>(config).then(response => response.data);
  }

  /**
   * Get your consents.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/consent
   */
  public getConsents(): Promise<{results: Consent[]}> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.CONSENT}`,
    };

    return this.client.sendJSON<{results: Consent[]}>(config).then(response => response.data);
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
   * Determine whether you are discoverable via /search/contacts.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/getSearchableStatus
   */
  public getSearchable(): Promise<SearchableStatus> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.SEARCHABLE}`,
    };

    return this.client.sendJSON<SearchableStatus>(config).then(response => response.data);
  }

  /**
   * Get your profile
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/self
   */
  public getSelf(): Promise<Self> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: SelfAPI.URL.SELF,
    };

    return this.client.sendJSON<Self>(config).then(response => response.data);
  }

  /**
   * Change your email address.
   * @param emailData The new email address
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeEmail
   */
  public async putEmail(emailData: {email: string}): Promise<void> {
    const config: AxiosRequestConfig = {
      data: emailData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.EMAIL}`,
    };

    await this.client.sendJSON(config);
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
   * Change your phone number.
   * @param phoneData The new phone number (E.164 format)
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePhone
   */
  public async putPhone(phoneData: {phone: string}): Promise<void> {
    const config: AxiosRequestConfig = {
      data: phoneData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PHONE}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Opt in or out of being included in search results.
   * @param statusData The new search status
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSearchableStatus
   */
  public async putSearchable(statusData: SearchableStatus): Promise<void> {
    const config: AxiosRequestConfig = {
      data: statusData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.SEARCHABLE}`,
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
}

export {SelfAPI};
