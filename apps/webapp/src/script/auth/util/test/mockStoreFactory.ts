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

import type {Clock} from '@enormora/clock/clock';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import createMockStore, {type MockStoreCreator} from 'redux-mock-store';
import {withExtraArgument} from 'redux-thunk';

import type {APIClient} from '@wireapp/api-client';
import type {TypeUtil} from '@wireapp/commons';
import type {Account} from '../../../core';

import {ActionRoot, actionRoot} from '../../module/action/';
import type {RootState, ThunkDispatch} from '../../module/reducer';

type MockStoreOptions = {
  readonly clock?: Clock;
  readonly actions?: TypeUtil.RecursivePartial<ActionRoot>;
  readonly apiClient?: TypeUtil.RecursivePartial<APIClient>;
  readonly core?: TypeUtil.RecursivePartial<Account>;
  readonly getConfig?: () => MockAuthConfig;
  readonly localStorage?: Storage;
};

type MockAuthConfig = {
  APP_INSTANCE_ID: string;
  FEATURE: {
    CHECK_CONSENT: boolean;
    DEFAULT_LOGIN_TEMPORARY_CLIENT: boolean;
    ENABLE_ACCOUNT_REGISTRATION: boolean;
    ENABLE_DEBUG: boolean;
    ENABLE_SSO: boolean;
  };
};

type MockStoreMiddleware = NonNullable<Parameters<typeof createMockStore>[0]>[number];

function defaultGetConfig(): MockAuthConfig {
  return {
    APP_INSTANCE_ID: 'app-id',
    FEATURE: {
      CHECK_CONSENT: true,
      DEFAULT_LOGIN_TEMPORARY_CLIENT: false,
      ENABLE_ACCOUNT_REGISTRATION: true,
      ENABLE_DEBUG: true,
      ENABLE_SSO: true,
    },
  };
}

export function mockStoreFactory(
  options: MockStoreOptions = {},
): MockStoreCreator<TypeUtil.RecursivePartial<RootState>, ThunkDispatch> {
  const {
    actions = actionRoot,
    apiClient = {},
    core = {},
    getConfig = defaultGetConfig,
    localStorage = window.localStorage,
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
  } = options;

  return createMockStore<TypeUtil.RecursivePartial<RootState>, ThunkDispatch>([
    // redux-mock-store declares Redux 4 middleware while redux-thunk uses Redux 5.
    withExtraArgument({
      clock,
      actions,
      apiClient,
      core,
      getConfig,
      localStorage,
    }) as unknown as MockStoreMiddleware,
  ]);
}
