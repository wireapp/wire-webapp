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

import {ReactNode, useContext} from 'react';

import {renderHook} from '@testing-library/react';

import {StartupFeatureToggleName} from '../featureToggles/startupFeatureToggles';
import {createDeterministicWallClock} from '../clock/deterministicWallClock';
import {reliableWebsocketConnectionFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import {MainViewModel} from '../view_model/MainViewModel';
import {RootContext, RootContextValue, RootProvider, useApplicationContext, useMainViewModel} from './RootProvider';

interface WrapperProperties {
  children: ReactNode;
}

interface RootProviderWrapper {
  wrapper: (properties: WrapperProperties) => ReactNode;
  isFeatureToggleEnabled: jest.Mock<boolean, [StartupFeatureToggleName]>;
  deterministicWallClock: ReturnType<typeof createDeterministicWallClock>;
}

function createRootProviderWrapper(
  mainViewModel: MainViewModel,
  wallClockTimestampInMilliseconds: number,
  doesApplicationNeedForceReload: boolean,
): RootProviderWrapper {
  const deterministicWallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: wallClockTimestampInMilliseconds,
  });
  function isFeatureToggleEnabledForTest(featureName: StartupFeatureToggleName): boolean {
    return featureName === reliableWebsocketConnectionFeatureToggleName;
  }

  const isFeatureToggleEnabled = jest.fn(isFeatureToggleEnabledForTest);

  function wrapper(properties: WrapperProperties): ReactNode {
    const wrappedChildren = (
      <RootProvider
        value={{
          mainViewModel,
          wallClock: deterministicWallClock,
          doesApplicationNeedForceReload,
          isFeatureToggleEnabled,
        }}
      >
        {properties.children}
      </RootProvider>
    );

    return wrappedChildren;
  }

  return {wrapper, deterministicWallClock, isFeatureToggleEnabled};
}

function getRootContextValue(): RootContextValue | null {
  const rootContextValue = useContext(RootContext);

  return rootContextValue;
}

describe('RootProvider', () => {
  const mainViewModel = {} as MainViewModel;

  it('provides the injected wall clock through context', () => {
    const {wrapper, deterministicWallClock} = createRootProviderWrapper(mainViewModel, 1_234, false);

    const {result} = renderHook(getRootContextValue, {wrapper});

    expect(result.current?.mainViewModel).toBe(mainViewModel);
    expect(result.current?.wallClock).toBe(deterministicWallClock);
    expect(result.current?.wallClock.currentTimestampInMilliseconds).toBe(1_234);
    expect(result.current?.doesApplicationNeedForceReload).toBe(false);
  });

  it('provides the main view model through useMainViewModel()', () => {
    const {wrapper, deterministicWallClock} = createRootProviderWrapper(mainViewModel, 8_765, false);

    const {result} = renderHook(useMainViewModel, {wrapper});

    expect(result.current).toBe(mainViewModel);
    expect(deterministicWallClock.currentTimestampInMilliseconds).toBe(8_765);
  });

  it('provides force reload status through RootContext', () => {
    const {wrapper} = createRootProviderWrapper(mainViewModel, 5_555, true);

    const {result} = renderHook(getRootContextValue, {wrapper});

    expect(result.current?.doesApplicationNeedForceReload).toBe(true);
  });

  it('provides force reload status through useApplicationContext()', () => {
    const {wrapper} = createRootProviderWrapper(mainViewModel, 9_999, true);

    const {result} = renderHook(useApplicationContext, {wrapper});

    expect(result.current.doesApplicationNeedForceReload).toBe(true);
  });

  it('provides startup feature toggle helper through useApplicationContext()', function () {
    const {wrapper, isFeatureToggleEnabled} = createRootProviderWrapper(mainViewModel, 9_999, true);

    const {result} = renderHook(useApplicationContext, {wrapper});

    expect(result.current.isFeatureToggleEnabled(reliableWebsocketConnectionFeatureToggleName)).toBe(true);
    expect(isFeatureToggleEnabled).toHaveBeenCalledWith(reliableWebsocketConnectionFeatureToggleName);
  });
});
