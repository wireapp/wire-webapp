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

import configureStore from 'redux-mock-store';
import {withExtraArgument} from 'redux-thunk';

import {APIClient} from '@wireapp/api-client';
import type {TypeUtil} from '@wireapp/commons';
import {Account} from '@wireapp/core';

import {ActionRoot, actionRoot} from '../../module/action/';
import type {RootState, ThunkDispatch} from '../../module/reducer';

export interface MockStoreParameters {
  actions?: TypeUtil.RecursivePartial<ActionRoot>;
  apiClient?: TypeUtil.RecursivePartial<APIClient>;
  core?: TypeUtil.RecursivePartial<Account>;
  getConfig?: () => any;
  localStorage?: Storage;
}

const defaultActions = actionRoot;
const defaultClient = new APIClient({urls: APIClient.BACKEND.STAGING});
const defaultCore = new Account(defaultClient);
const defaultLocalStorage = window.localStorage;
const defaultGetConfig = () => ({
  APP_INSTANCE_ID: 'app-id',
  FEATURE: {
    CHECK_CONSENT: true,
    DEFAULT_LOGIN_TEMPORARY_CLIENT: false,
    ENABLE_ACCOUNT_REGISTRATION: true,
    ENABLE_DEBUG: true,
    ENABLE_SSO: true,
  },
});

export const mockStoreFactory = (
  parameters: MockStoreParameters = {
    actions: defaultActions,
    apiClient: defaultClient,
    core: defaultCore,
    getConfig: defaultGetConfig,
    localStorage: defaultLocalStorage,
  },
) => {
  const {actions, apiClient, core, getConfig, localStorage} = parameters;
  if (core) {
    (core as any).apiClient = apiClient;
  }
  return configureStore<TypeUtil.RecursivePartial<RootState>, ThunkDispatch>([
    withExtraArgument({
      actions,
      apiClient,
      core,
      getConfig: getConfig || defaultGetConfig,
      localStorage,
    }) as any,
  ]);
};
