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

import {useIsOffline} from './useIsOffline';
import {useOutboxOffline} from './useOutboxOffline';

import {useNoInternetState} from '../view_model/WarningsContainer/noInternetState';

describe('the offline hooks', () => {
  afterEach(() => {
    useNoInternetState.setState({hasNoInternet: false});
  });

  it('report what the no-internet banner shows', () => {
    const {result} = renderHook(() => {
      return useIsOffline();
    });
    expect(result.current).toBe(false);

    act(() => {
      useNoInternetState.setState({hasNoInternet: true});
    });

    expect(result.current).toBe(true);
  });

  it('are combined with the toggle: offline only with the outbox on', () => {
    useNoInternetState.setState({hasNoInternet: true});

    const on = renderHook(() => {
      return useOutboxOffline(true);
    });
    const off = renderHook(() => {
      return useOutboxOffline(false);
    });

    expect(on.result.current).toBe(true);
    expect(off.result.current).toBe(false);
  });
});
