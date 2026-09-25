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
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {applockRefactoredFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';
import {MainViewModel} from '../view_model/MainViewModel';
import {createRootContextValueForTest, createRootProviderWrapperForTest} from './testSupport/rootContextTestSupport';
import {RootContext, RootContextValue, RootProvider, useApplicationContext, useMainViewModel} from './rootProvider';
import {translateForTest} from 'Util/test/translateForTest';

interface WrapperProperties {
  children: ReactNode;
}

interface RootProviderWrapper {
  wrapper: (properties: WrapperProperties) => ReactNode;
  isFeatureToggleEnabled: jest.Mock<boolean, [StartupFeatureToggleName]>;
  clock: ReturnType<typeof createDeterministicClock>;
  rootContextValue: RootContextValue;
}

function createRootProviderWrapper(
  mainViewModel: MainViewModel,
  initialTimestampInMilliseconds: number,
  doesApplicationNeedForceReload: boolean,
): RootProviderWrapper {
  const clock = createDeterministicClock({
    initialUnixEpochMicroseconds: BigInt(initialTimestampInMilliseconds) * 1_000n,
  });
  function isFeatureToggleEnabledForTest(featureName: StartupFeatureToggleName): boolean {
    return featureName === applockRefactoredFeatureToggleName;
  }

  const isFeatureToggleEnabled = jest.fn(isFeatureToggleEnabledForTest);
  const rootContextValue = createRootContextValueForTest({
    translate: translateForTest,
    doesApplicationNeedForceReload,
    isFeatureToggleEnabled,
    mainViewModel,
    clock,
  });
  const wrapper = createRootProviderWrapperForTest(rootContextValue);

  return {wrapper, clock, isFeatureToggleEnabled, rootContextValue};
}

function getRootContextValue(): RootContextValue | null {
  const rootContextValue = useContext(RootContext);

  return rootContextValue;
}

describe('RootProvider', () => {
  const mainViewModel = {} as MainViewModel;

  it('provides the injected clock through context', () => {
    const {wrapper, clock, rootContextValue} = createRootProviderWrapper(mainViewModel, 1_234, false);

    const {result} = renderHook(getRootContextValue, {wrapper});

    expect(result.current?.mainViewModel).toBe(mainViewModel);
    expect(result.current?.fireAndForgetInvoker).toBe(rootContextValue.fireAndForgetInvoker);
    expect(result.current?.clock).toBe(clock);
    expect(result.current?.clock.currentUnixEpochMilliseconds).toBe(1_234);
    expect(result.current?.doesApplicationNeedForceReload).toBe(false);
  });

  it('provides the main view model through useMainViewModel()', () => {
    const {wrapper, clock} = createRootProviderWrapper(mainViewModel, 8_765, false);

    const {result} = renderHook(useMainViewModel, {wrapper});

    expect(result.current).toBe(mainViewModel);
    expect(clock.currentUnixEpochMilliseconds).toBe(8_765);
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

    expect(result.current.isFeatureToggleEnabled(applockRefactoredFeatureToggleName)).toBe(true);
    expect(isFeatureToggleEnabled).toHaveBeenCalledWith(applockRefactoredFeatureToggleName);
  });

  it('provides the injected translate function through useApplicationContext()', () => {
    const translate = jest.fn((identifier: Parameters<RootContextValue['translate']>[0]) => {
      return identifier;
    }) as RootContextValue['translate'];
    const rootContextValue = createRootContextValueForTest({mainViewModel, translate});
    const wrapper = createRootProviderWrapperForTest(rootContextValue);

    const {result} = renderHook(useApplicationContext, {wrapper});

    expect(result.current.translate).toBe(translate);
    expect(result.current.translate('conversationYouNominative')).toBe('conversationYouNominative');
    expect(translate).toHaveBeenCalledWith('conversationYouNominative');
  });
});
