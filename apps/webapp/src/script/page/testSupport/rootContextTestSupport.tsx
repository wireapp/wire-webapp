/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import {FireAndForgetInvoker} from '@wireapp/core';

import {WallClock} from '../../clock/wallClock';
import {StartupFeatureToggleName} from '../../featureToggles/startupFeatureToggles';
import {MainViewModel} from '../../view_model/MainViewModel';
import {RootContextValue, RootProvider} from '../RootProvider';

type CreateRootContextValueForTestParameters = {
  readonly doesApplicationNeedForceReload?: boolean;
  readonly fireAndForgetInvoker?: FireAndForgetInvoker;
  readonly isFeatureToggleEnabled?: (featureName: StartupFeatureToggleName) => boolean;
  readonly mainViewModel: MainViewModel;
  readonly wallClock: WallClock;
};

type RootProviderWrapperProperties = {
  readonly children: ReactNode;
};

function isFeatureToggleDisabledForTest(): boolean {
  return false;
}

export function createFireAndForgetInvokerForTest(): FireAndForgetInvoker {
  return {
    fireAndForget: jest.fn(),
    waitUntilAllSettled: jest.fn(async () => {}),
  } as FireAndForgetInvoker;
}

export function createRootContextValueForTest(parameters: CreateRootContextValueForTestParameters): RootContextValue {
  const {
    doesApplicationNeedForceReload = false,
    fireAndForgetInvoker = createFireAndForgetInvokerForTest(),
    isFeatureToggleEnabled = isFeatureToggleDisabledForTest,
    mainViewModel,
    wallClock,
  } = parameters;

  return {
    doesApplicationNeedForceReload,
    fireAndForgetInvoker,
    isFeatureToggleEnabled,
    mainViewModel,
    wallClock,
  };
}

export function createRootProviderWrapperForTest(rootContextValue: RootContextValue) {
  function wrapper(properties: RootProviderWrapperProperties): ReactNode {
    return <RootProvider value={rootContextValue}>{properties.children}</RootProvider>;
  }

  return wrapper;
}
