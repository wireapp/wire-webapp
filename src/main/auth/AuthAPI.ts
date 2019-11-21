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

import {AccessTokenData, LoginData, SendLoginCode} from '../auth/';
import {ClientType} from '../client/';
import {HttpClient} from '../http/';
import {retrieveCookie, sendRequestWithCookie} from '../shims/node/cookie';
import {User} from '../user/';
import {CookieList} from './CookieList';
import {LoginCodeResponse} from './LoginCodeResponse';
import {RegisterData} from './RegisterData';

export class AuthAPI {
  constructor(private readonly client: HttpClient) {}

  static URL = {
    ACCESS: '/access',
    COOKIES: '/cookies',
    INITIATE_BIND: '/sso-initiate-bind',
    INITIATE_LOGIN: 'initiate-login',
    LOGIN: '/login',
    LOGOUT: 'logout',
    REGISTER: '/register',
    SEND: 'send',
    SSO: '/sso',
  };

  public getCookies(labels?: string[]): Promise<AxiosResponse<CookieList>> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {},
      url: AuthAPI.URL.COOKIES,
    };

    if (labels) {
      config.params.labels = labels.join(',');
    }

    return this.client.sendRequest(config);
  }

  public async postCookiesRemove(password: string, labels?: string[], ids?: string[]): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        ids,
        labels,
        password,
      },
      method: 'post',
      url: `${AuthAPI.URL.COOKIES}/remove`,
      withCredentials: true,
    };

    await this.client.sendJSON(config);
  }

  public async postLogin(loginData: LoginData): Promise<AccessTokenData> {
    const login = {
      ...loginData,
      clientType: undefined,
      password: loginData.password ? String(loginData.password) : undefined,
    };

    const config: AxiosRequestConfig = {
      data: login,
      method: 'post',
      params: {
        persist: loginData.clientType === ClientType.PERMANENT,
      },
      url: AuthAPI.URL.LOGIN,
      withCredentials: true,
    };

    const response = await this.client.sendJSON<AccessTokenData>(config);
    return retrieveCookie(response);
  }

  /**
   * This operation generates and sends a login code. A login code can be used only once and times out after 10
   * minutes. Only one login code may be pending at a time.
   * @param loginRequest Phone number to use for login SMS or voice call.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/sendLoginCode
   */
  public postLoginSend(loginRequest: SendLoginCode): Promise<AxiosResponse<LoginCodeResponse>> {
    // https://github.com/zinfra/backend-issues/issues/974
    const defaultLoginRequest = {force: false};
    const config: AxiosRequestConfig = {
      data: {...defaultLoginRequest, ...loginRequest},
      method: 'post',
      url: `${AuthAPI.URL.LOGIN}/${AuthAPI.URL.SEND}`,
    };

    return this.client.sendJSON(config);
  }

  public async postLogout(): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`,
      withCredentials: true,
    };

    await sendRequestWithCookie(this.client, config);
  }

  public async postRegister(userAccount: RegisterData): Promise<User> {
    const config: AxiosRequestConfig = {
      data: userAccount,
      method: 'post',
      url: AuthAPI.URL.REGISTER,
      withCredentials: true,
    };

    const response = await this.client.sendJSON<User>(config);
    return retrieveCookie(response);
  }

  public async headInitiateLogin(ssoCode: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'head',
      url: `${AuthAPI.URL.SSO}/${AuthAPI.URL.INITIATE_LOGIN}/${ssoCode}`,
    };

    await this.client.sendJSON(config);
  }

  public async headInitiateBind(ssoCode: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'head',
      url: `${AuthAPI.URL.INITIATE_BIND}/${ssoCode}`,
    };

    await this.client.sendJSON(config);
  }
}
