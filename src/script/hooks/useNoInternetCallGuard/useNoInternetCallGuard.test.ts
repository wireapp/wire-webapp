/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {useNoInternetCallGuard} from './useNoInternetCallGuard';

import {useWarningsState} from '../../view_model/WarningsContainer/WarningsState';
import {TYPE} from '../../view_model/WarningsContainer/WarningsTypes';

jest.mock('../../view_model/WarningsContainer/WarningsState');
jest.mock('Components/Modals/PrimaryModal', () => ({
  PrimaryModal: {
    type: {ACKNOWLEDGE: 'ACKNOWLEDGE'},
    show: jest.fn(),
  },
}));
jest.mock('Util/LocalizerUtil', () => ({
  t: (key: string) => key,
}));

const mockedUseWarningsState = jest.mocked(useWarningsState);

describe('useNoInternetCallGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show modal and not call startCall when warning is NO_INTERNET', () => {
    mockedUseWarningsState.mockReturnValue([TYPE.NO_INTERNET]);
    const {result} = renderHook(() => useNoInternetCallGuard());
    const startCall = jest.fn();

    act(() => {
      result.current(startCall);
    });

    expect(PrimaryModal.show).toHaveBeenCalledTimes(1);
    expect(PrimaryModal.show).toHaveBeenCalledWith(PrimaryModal.type.ACKNOWLEDGE, {
      text: {
        message: expect.any(Object),
        title: 'callNotEstablishedTitle',
      },
    });
    expect(startCall).not.toHaveBeenCalled();
  });

  it('should call startCall when there is no warning', () => {
    mockedUseWarningsState.mockReturnValue([]);
    const {result} = renderHook(() => useNoInternetCallGuard());
    const startCall = jest.fn();

    act(() => {
      result.current(startCall);
    });

    expect(startCall).toHaveBeenCalledTimes(1);
    expect(PrimaryModal.show).not.toHaveBeenCalled();
  });

  it('should call startCall when warning is different from NO_INTERNET', () => {
    mockedUseWarningsState.mockReturnValue(['SOME_OTHER_WARNING']);
    const {result} = renderHook(() => useNoInternetCallGuard());
    const startCall = jest.fn();

    act(() => {
      result.current(startCall);
    });

    expect(startCall).toHaveBeenCalledTimes(1);
    expect(PrimaryModal.show).not.toHaveBeenCalled();
  });

  it('should update behavior when warnings change between renders', () => {
    mockedUseWarningsState.mockReturnValue([TYPE.NO_INTERNET]);
    const {result, rerender} = renderHook(() => useNoInternetCallGuard());
    const startCall = jest.fn();

    act(() => {
      result.current(startCall);
    });
    expect(startCall).not.toHaveBeenCalled();
    expect(PrimaryModal.show).toHaveBeenCalledTimes(1);

    mockedUseWarningsState.mockReturnValue([]);
    rerender();

    act(() => {
      result.current(startCall);
    });
    expect(startCall).toHaveBeenCalledTimes(1);
  });

  it('should work with different startCall implementations', () => {
    mockedUseWarningsState.mockReturnValue([]);
    const {result} = renderHook(() => useNoInternetCallGuard());
    const startAudio = jest.fn();
    const startVideo = jest.fn();

    act(() => {
      result.current(startAudio);
    });
    act(() => {
      result.current(startVideo);
    });

    expect(startAudio).toHaveBeenCalledTimes(1);
    expect(startVideo).toHaveBeenCalledTimes(1);
  });
});
