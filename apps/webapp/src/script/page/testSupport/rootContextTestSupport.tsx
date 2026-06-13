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

import {noop} from 'noop-esm';

import {FireAndForgetInvoker} from '@wireapp/core';

import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {WallClock, createWallClock} from '../../clock/wallClock';
import {StartupFeatureToggleName} from '../../featureToggles/startupFeatureToggles';
import {MainViewModel} from '../../view_model/MainViewModel';
import {RootContextValue, RootProvider} from '../RootProvider';

type CreateRootContextValueForTestParameters = {
  readonly doesApplicationNeedForceReload?: boolean;
  readonly fireAndForgetInvoker?: FireAndForgetInvoker;
  readonly isFeatureToggleEnabled?: (featureName: StartupFeatureToggleName) => boolean;
  readonly mainViewModel?: MainViewModel;
  readonly translate?: Translate;
  readonly wallClock?: WallClock;
};

type RootProviderWrapperProperties = {
  readonly children: ReactNode;
};

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
  const activePromises = new Set<Promise<unknown>>();

  async function observePromise(activePromise: Promise<unknown>): Promise<void> {
    try {
      await activePromise;
    } catch {
      return undefined;
    } finally {
      activePromises.delete(activePromise);
    }
  }

  function fireAndForget(asyncAction: () => Promise<unknown>): void {
    const activePromise = asyncAction();
    activePromises.add(activePromise);
    observePromise(activePromise).catch(() => undefined);
  }

  async function waitUntilAllSettled(): Promise<void> {
    await Promise.allSettled(activePromises);
  }

  return {
    fireAndForget,
    waitUntilAllSettled,
  };
}

export function createRootContextValueForTest(parameters: CreateRootContextValueForTestParameters): RootContextValue {
  const {
    doesApplicationNeedForceReload = false,
    fireAndForgetInvoker = createFireAndForgetInvokerForTest(),
    isFeatureToggleEnabled = isFeatureToggleDisabledForTest,
    mainViewModel = createMainViewModelForTest(),
    translate = translateForTest,
    wallClock = createWallClock(),
  } = parameters;

  return {
    doesApplicationNeedForceReload,
    fireAndForgetInvoker,
    isFeatureToggleEnabled,
    mainViewModel,
    translate,
    wallClock,
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
