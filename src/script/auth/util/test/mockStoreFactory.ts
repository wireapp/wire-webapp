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

const {createLogger} = require('redux-logger');
import {APIClient} from '@wireapp/api-client';
import type {TypeUtil} from '@wireapp/commons';
import {Account} from '@wireapp/core';
import Cookies, {CookiesStatic} from 'js-cookie';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import type {RootState, ThunkDispatch} from '../..//module/reducer';
import {ActionRoot, actionRoot} from '../../module/action/';

export interface MockStoreParameters {
  actions?: TypeUtil.RecursivePartial<ActionRoot>;
  apiClient?: TypeUtil.RecursivePartial<APIClient>;
  cookieStore?: CookiesStatic<object>;
  core?: TypeUtil.RecursivePartial<Account>;
  getConfig?: () => any;
  localStorage?: Storage;
}

const defaultActions = actionRoot;
const defaultClient = new APIClient({urls: APIClient.BACKEND.STAGING});
const defaultCore = new Account(defaultClient);
const defaultLocalStorage = window.localStorage;
const defaultCookieStore = Cookies;
const defaultGetConfig = () => ({
  APP_INSTANCE_ID: 'app-id',
  FEATURE: {
    CHECK_CONSENT: true,
    DEFAULT_LOGIN_TEMPORARY_CLIENT: false,
    ENABLE_ACCOUNT_REGISTRATION: true,
    ENABLE_DEBUG: true,
    ENABLE_PHONE_LOGIN: true,
    ENABLE_SSO: true,
    PERSIST_TEMPORARY_CLIENTS: true,
  },
});

export const mockStoreFactory = (
  parameters: MockStoreParameters = {
    actions: defaultActions,
    apiClient: defaultClient,
    cookieStore: defaultCookieStore,
    core: defaultCore,
    getConfig: defaultGetConfig,
    localStorage: defaultLocalStorage,
  },
) => {
  const {actions, apiClient, cookieStore, core, getConfig, localStorage} = parameters;
  if (core) {
    (core as any).apiClient = apiClient;
  }
  return configureStore<TypeUtil.RecursivePartial<RootState>, ThunkDispatch>([
    thunk.withExtraArgument({
      actions,
      apiClient,
      cookieStore,
      core,
      getConfig: getConfig || defaultGetConfig,
      localStorage,
    }),
    createLogger({
      actionTransformer(action: any): string {
        return JSON.stringify(action);
      },
      colors: {
        action: false,
        error: false,
        nextState: false,
        prevState: false,
        title: false,
      },
      level: {
        action: 'info',
        nextState: false,
        prevState: false,
      },
    }),
  ]);
};
