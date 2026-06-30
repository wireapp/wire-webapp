/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {act, render, screen, waitFor} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import type {AppLockRepository} from 'Repositories/user/appLockRepository';
import {ElectronDesktopCapturerSource, MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {ContentViewModel} from 'src/script/view_model/ContentViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {MainContent} from './mainContent';

import {withTheme} from '../../auth/util/test/TestUtil';
import {MainViewModel} from '../../view_model/MainViewModel';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {createRootContextValueForTest} from '../testSupport/rootContextTestSupport';
import {RootProvider} from '../rootProvider';
import {ContentState, useAppState} from '../useAppState';

jest.mock('./panels/preferences/accountPreferences', () => ({
  AccountPreferences: () => <span>AccountPreferences</span>,
  __esModule: true,
}));

jest.mock('@formkit/auto-animate/react', () => ({
  __esModule: true,
  useAutoAnimate: jest.fn(),
}));

jest.mock('react-transition-group', () => ({
  CSSTransition: ({children}: any) => children,
  SwitchTransition: ({children}: any) => children,
}));

const mockDevicesHandler = {
  availableDevices: (): (MediaDeviceInfo | ElectronDesktopCapturerSource)[] => [],
  currentDeviceId: () => 'mock-device-id',
} as unknown as MediaDevicesHandler;

function isFeatureToggleDisabledForTest(): boolean {
  return false;
}

describe('Preferences', () => {
  const mainViewModel = {
    content: {
      repositories: {
        media: {
          devicesHandler: mockDevicesHandler,
        },
      } as any,
    } as ContentViewModel,
  } as MainViewModel;

  const defaultParams = {
    appLockRepository: {} as AppLockRepository,
    openRightSidebar: jest.fn(),
    selfUser: new User('selfUser', '', translateForTest),
    reloadApp: jest.fn(),
  };
  const wallClock = createDeterministicWallClock();

  it('renders the right component according to view state', () => {
    const {setContentState} = useAppState.getState();

    jest.useFakeTimers();
    render(
      withTheme(
        <RootProvider
          value={createRootContextValueForTest({
            translate: translateForTest,
            isFeatureToggleEnabled: isFeatureToggleDisabledForTest,
            mainViewModel,
            wallClock,
          })}
        >
          <MainContent {...defaultParams} />
        </RootProvider>,
      ),
    );

    expect(screen.queryByText('accessibility.headings.preferencesAbout')).toBeNull();

    act(() => {
      setContentState(ContentState.PREFERENCES_ABOUT);
    });

    waitFor(() => screen.getByText('accessibility.headings.preferencesAbout'));

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('AccountPreferences')).toBeNull();
    expect(screen.queryByText('accessibility.headings.preferencesAbout')).not.toBeNull();
    jest.useRealTimers();
  });
});
