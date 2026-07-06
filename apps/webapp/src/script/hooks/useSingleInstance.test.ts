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

import {renderHook} from '@testing-library/react';
import {act} from 'react';

import {useSingleInstance} from './useSingleInstance';

describe('useSingleInstance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  it('can create multiple new instance listeners', () => {
    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    const {
      result: {current: secondInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.hasOtherInstance).toBeFalsy();
  });

  it('only allows a single registered instance', () => {
    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    firstInstance.registerInstance();

    const {
      result: {current: secondInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.hasOtherInstance).toBeTruthy();

    firstInstance.killRunningInstance();
  });

  it('detects a new instance that has started', () => {
    const {
      result: {current: firstInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });
    expect(firstInstance.hasOtherInstance).toBeFalsy();

    const {result: secondInstance} = renderHook(() => {
      return useSingleInstance();
    });
    expect(secondInstance.current.hasOtherInstance).toBeFalsy();

    firstInstance.registerInstance();

    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(secondInstance.current.hasOtherInstance).toBeTruthy();

    firstInstance.killRunningInstance();
  });

  it('does not crash when stored instance data is malformed', () => {
    window.localStorage.setItem('app_opened', 'not-json');

    const {
      result: {current: currentInstance},
    } = renderHook(() => {
      return useSingleInstance();
    });

    expect(currentInstance.hasOtherInstance).toBeFalsy();
    expect(window.localStorage.getItem('app_opened')).toBeNull();
  });
});
