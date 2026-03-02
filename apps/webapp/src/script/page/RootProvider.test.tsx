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

import {createFakeWallClock} from '../clock/fakeWallClock';
import {MainViewModel} from '../view_model/MainViewModel';
import {
  RootContext,
  RootContextValue,
  RootProvider,
  useMainViewModel,
} from './RootProvider';

interface WrapperProperties {
  children: ReactNode;
}

interface RootProviderWrapper {
  wrapper: (properties: WrapperProperties) => ReactNode;
  fakeWallClock: ReturnType<typeof createFakeWallClock>;
}

function createRootProviderWrapper(
  mainViewModel: MainViewModel,
  wallClockTimestampInMilliseconds: number,
  doesApplicationNeedForceReload: boolean,
): RootProviderWrapper {
  const fakeWallClock = createFakeWallClock({
    initialCurrentTimestampInMilliseconds: wallClockTimestampInMilliseconds,
  });

  function wrapper(properties: WrapperProperties): ReactNode {
    const wrappedChildren = (
      <RootProvider value={{mainViewModel, wallClock: fakeWallClock, doesApplicationNeedForceReload}}>
        {properties.children}
      </RootProvider>
    );

    return wrappedChildren;
  }

  return {wrapper, fakeWallClock};
}

function getRootContextValue(): RootContextValue | null {
  const rootContextValue = useContext(RootContext);

  return rootContextValue;
}

describe('RootProvider', () => {
  const mainViewModel = {} as MainViewModel;

  it('provides the injected wall clock through context', () => {
    const {wrapper, fakeWallClock} = createRootProviderWrapper(mainViewModel, 1_234, false);

    const {result} = renderHook(getRootContextValue, {wrapper});

    expect(result.current?.mainViewModel).toBe(mainViewModel);
    expect(result.current?.wallClock).toBe(fakeWallClock);
    expect(result.current?.wallClock.currentTimestampInMilliseconds).toBe(1_234);
    expect(result.current?.doesApplicationNeedForceReload).toBe(false);
  });

  it('provides the main view model through useMainViewModel()', () => {
    const {wrapper, fakeWallClock} = createRootProviderWrapper(mainViewModel, 8_765, false);

    const {result} = renderHook(useMainViewModel, {wrapper});

    expect(result.current).toBe(mainViewModel);
    expect(fakeWallClock.currentTimestampInMilliseconds).toBe(8_765);
  });

  it('provides force reload status through RootContext', () => {
    const {wrapper} = createRootProviderWrapper(mainViewModel, 5_555, true);

    const {result} = renderHook(getRootContextValue, {wrapper});

    expect(result.current?.doesApplicationNeedForceReload).toBe(true);
  });
});
