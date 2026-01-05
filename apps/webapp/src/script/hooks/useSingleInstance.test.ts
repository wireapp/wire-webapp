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
import {act} from 'react-dom/test-utils';

import {useSingleInstance} from './useSingleInstance';

describe('useSingleInstance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('can create multiple new instance listeners', () => {
    const {
      result: {current: firstIntance},
    } = renderHook(() => useSingleInstance());
    expect(firstIntance.hasOtherInstance).toBeFalsy();

    const {
      result: {current: secondInstance},
    } = renderHook(() => useSingleInstance());
    expect(secondInstance.hasOtherInstance).toBeFalsy();
  });

  it('only allows a single registered instance', () => {
    const {
      result: {current: firstIntance},
    } = renderHook(() => useSingleInstance());
    expect(firstIntance.hasOtherInstance).toBeFalsy();

    firstIntance.registerInstance();

    const {
      result: {current: secondInstance},
    } = renderHook(() => useSingleInstance());
    expect(secondInstance.hasOtherInstance).toBeTruthy();

    firstIntance.killRunningInstance();
  });

  it('detects a new instance that has started', () => {
    const {
      result: {current: firstIntance},
    } = renderHook(() => useSingleInstance());
    expect(firstIntance.hasOtherInstance).toBeFalsy();

    const {result: secondInstance} = renderHook(() => useSingleInstance());
    expect(secondInstance.current.hasOtherInstance).toBeFalsy();

    firstIntance.registerInstance();

    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(secondInstance.current.hasOtherInstance).toBeTruthy();

    firstIntance.killRunningInstance();
  });
});
