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

import {act, renderHook} from '@testing-library/react';

import {useOffline} from './useOffline';

import {useNoInternetState} from '../view_model/WarningsContainer/noInternetState';

describe('useOffline', () => {
  afterEach(() => {
    act(() => {
      useNoInternetState.setState({hasNoInternet: false});
    });
  });

  it('is true without internet while the toggle is on', () => {
    useNoInternetState.setState({hasNoInternet: true});

    expect(
      renderHook(() => {
        return useOffline(true);
      }).result.current,
    ).toBe(true);
  });

  it('is false with internet while the toggle is on', () => {
    expect(
      renderHook(() => {
        return useOffline(true);
      }).result.current,
    ).toBe(false);
  });

  it('is false without internet while the toggle is off', () => {
    useNoInternetState.setState({hasNoInternet: true});

    expect(
      renderHook(() => {
        return useOffline(false);
      }).result.current,
    ).toBe(false);
  });
});
