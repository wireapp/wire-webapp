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

import type {Clock} from '@enormora/clock/clock';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {createFireAndForgetInvoker, type FireAndForgetInvoker} from '@enormora/fire-and-forget';
import {isNullOrUndefined} from '@sindresorhus/is';
import {noop} from 'noop-esm';

import type {Translate} from 'Util/localizerUtil';

import {StartupFeatureToggleName} from '../../featureToggles/startupFeatureToggles';
import {MainViewModel} from '../../view_model/MainViewModel';
import {RootContextValue, RootProvider} from '../rootProvider';

type CreateRootContextValueForTestParameters = {
  readonly doesApplicationNeedForceReload?: boolean;
  readonly fireAndForgetInvoker?: FireAndForgetInvoker;
  readonly isFeatureToggleEnabled?: (featureName: StartupFeatureToggleName) => boolean;
  readonly mainViewModel?: MainViewModel;
  readonly translate: Translate;
  readonly clock?: Clock;
};

type RootProviderWrapperProperties = {
  readonly children: ReactNode;
};

export function requireValueForTest<Value>(value: Value | null | undefined): Value {
  if (isNullOrUndefined(value)) {
    throw new Error('Expected test value to be available');
  }

  return value;
}

function isFeatureToggleDisabledForTest(): boolean {
  return false;
}

function createMainViewModelForTest(): MainViewModel {
  return {} as MainViewModel;
}

export function createFireAndForgetInvokerForTest(): FireAndForgetInvoker {
  return {
    fireAndForget: jest.fn(),
    waitUntilAllSettled: jest.fn(async (): Promise<void> => {
      return undefined;
    }),
  };
}

export function createExecutingFireAndForgetInvokerForTest(): FireAndForgetInvoker {
  return createFireAndForgetInvoker({
    reportError() {
      return undefined;
    },
  });
}

export function createRootContextValueForTest(parameters: CreateRootContextValueForTestParameters): RootContextValue {
  const {
    doesApplicationNeedForceReload = false,
    fireAndForgetInvoker = createFireAndForgetInvokerForTest(),
    isFeatureToggleEnabled = isFeatureToggleDisabledForTest,
    mainViewModel = createMainViewModelForTest(),
    translate,
    clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
  } = parameters;

  return {
    doesApplicationNeedForceReload,
    fireAndForgetInvoker,
    isFeatureToggleEnabled,
    mainViewModel,
    clock,
    translate,
    applicationNavigation: {
      get currentPathname(): string {
        return '/';
      },
      get currentSearch(): string {
        return '';
      },
      get currentHash(): string {
        return '';
      },
      navigateTo: noop,
    },
  };
}

export function createRootProviderWrapperForTest(
  rootContextValue: RootContextValue,
): (properties: RootProviderWrapperProperties) => ReactNode {
  function wrapper(properties: RootProviderWrapperProperties): ReactNode {
    return <RootProvider value={rootContextValue}>{properties.children}</RootProvider>;
  }

  return wrapper;
}
