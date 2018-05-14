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

import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {AxiosPromise, AxiosRequestConfig, AxiosResponse} from 'axios';
import {LoginData} from '../auth';
import {HttpClient} from '../http';
import {sendRequestWithCookie} from '../shims/node/cookie';
import {User} from '../user';
import {RegisterData} from './RegisterData';

class AuthAPI {
  constructor(private readonly client: HttpClient, private readonly engine: CRUDEngine) {}

  static get URL() {
    return {
      ACCESS: '/access',
      COOKIES: '/cookies',
      INVITATIONS: '/invitations',
      LOGIN: '/login',
      LOGOUT: 'logout',
      REGISTER: '/register',
    };
  }

  public getCookies(labels?: string[]) {
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

  public postCookiesRemove(password: string, labels?: string[], ids?: string[]): AxiosPromise {
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

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  public postLogin(loginData: LoginData): Promise<AxiosResponse<any>> {
    const login = {
      ...loginData,
      password: loginData.password ? String(loginData.password) : undefined,
      persist: undefined,
    };

    const config: AxiosRequestConfig = {
      data: login,
      method: 'post',
      params: {
        persist: loginData.persist.toString(),
      },
      url: AuthAPI.URL.LOGIN,
      withCredentials: true,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response);
  }

  public postLogout(): AxiosPromise {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`,
      withCredentials: true,
    };

    return sendRequestWithCookie(this.client, config, this.engine).then((response: AxiosResponse) => response.data);
  }

  public postRegister(userAccount: RegisterData): Promise<User> {
    const config: AxiosRequestConfig = {
      data: userAccount,
      method: 'post',
      url: AuthAPI.URL.REGISTER,
      withCredentials: true,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }
}

export {AuthAPI};
