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

import {HttpClient} from '../http';
import {ChangePassword, Delete, SearchableStatus, Self} from '../self';
import {UserUpdate} from '../user';

class SelfAPI {
  constructor(private client: HttpClient) {}

  static get URL() {
    return {
      EMAIL: 'email',
      HANDLE: 'handle',
      LOCALE: 'locale',
      NAME: 'name',
      PASSWORD: 'password',
      PHONE: 'phone',
      SEARCHABLE: 'searchable',
      SELF: '/self',
    };
  }

  /**
   * Remove your email address.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/removeEmail
   */
  public deleteEmail(): Promise<{}> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.EMAIL}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Remove your phone number.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/removePhone
   */
  public deletePhone(): Promise<{}> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PHONE}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Initiate account deletion.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/deleteUser
   */
  public deleteSelf(deleteData: Delete): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: deleteData,
      method: 'delete',
      url: SelfAPI.URL.SELF,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
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

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
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

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
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

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Change your email address.
   * @param emailData The new email address
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeEmail
   */
  public putEmail(emailData: {email: string}): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: emailData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.EMAIL}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Change your handle.
   * @param handleData The new handle
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeHandle
   */
  public putHandle(handleData: {handle: string}): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: handleData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.HANDLE}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Change your locale.
   * @param localeData The new locale
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changeLocale
   */
  public putLocale(localeData: {locale: string}): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: localeData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.LOCALE}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Change your password.
   * @param passwordData The new password
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePassword
   */
  public putPassword(passwordData: ChangePassword): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: passwordData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PASSWORD}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Change your phone number.
   * @param phoneData The new phone number (E.164 format)
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/changePhone
   */
  public putPhone(phoneData: {phone: string}): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: phoneData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.PHONE}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Opt in or out of being included in search results.
   * @param statusData The new search status
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSearchableStatus
   */
  public putSearchable(statusData: SearchableStatus): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: statusData,
      method: 'put',
      url: `${SelfAPI.URL.SELF}/${SelfAPI.URL.SEARCHABLE}`,
    };

    return this.client.sendJSON(config).then(() => ({}));
  }

  /**
   * Update your profile.
   * @param profileData The new profile data
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/users/updateSelf
   */
  public putSelf(profileData: UserUpdate): Promise<{}> {
    const config: AxiosRequestConfig = {
      data: profileData,
      method: 'put',
      url: SelfAPI.URL.SELF,
    };

    return this.client.sendJSON(config).then(() => ({}));
  }
}

export {SelfAPI};
