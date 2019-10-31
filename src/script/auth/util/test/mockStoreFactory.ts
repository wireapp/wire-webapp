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
import {TypeUtil} from '@wireapp/commons';
import {Account} from '@wireapp/core';
import * as StoreEngine from '@wireapp/store-engine';
import Cookies, {CookiesStatic} from 'js-cookie';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import {RootState, ThunkDispatch} from '../..//module/reducer';
import {ActionRoot, actionRoot} from '../../module/action/';

export interface MockStoreParameters {
  actions?: TypeUtil.RecursivePartial<ActionRoot>;
  apiClient?: TypeUtil.RecursivePartial<APIClient>;
  config?: any;
  cookieStore?: CookiesStatic<object>;
  core?: TypeUtil.RecursivePartial<Account>;
  localStorage?: Storage;
}

const defaultActions = actionRoot;
const defaultClient = new APIClient({store: new StoreEngine.MemoryEngine(), urls: APIClient.BACKEND.STAGING});
const defaultCore = new Account(defaultClient);
const defaultLocalStorage = window.localStorage;
const defaultCookieStore = Cookies;

export const mockStoreFactory = (
  parameters: MockStoreParameters = {
    actions: defaultActions,
    apiClient: defaultClient,
    cookieStore: defaultCookieStore,
    core: defaultCore,
    localStorage: defaultLocalStorage,
  },
) => {
  const {actions, apiClient, cookieStore, core, localStorage} = parameters;
  (core as any).apiClient = apiClient;
  return configureStore<TypeUtil.RecursivePartial<RootState>, ThunkDispatch>([
    thunk.withExtraArgument({actions, apiClient, cookieStore, core, localStorage}),
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
