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

import {act, render, waitFor} from '@testing-library/react';

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {createUuid} from 'Util/uuid';

import {DeviceDetailsPreferences} from './DeviceDetailsPreferences';

describe('DeviceDetailsPreferences', () => {
  const device = new ClientEntity(true, '', createUuid());
  device.model = 'test';
  device.time = new Date().toISOString();
  const defaultParams = {
    device,
    getFingerprint: jest.fn().mockResolvedValue('00000000'),
    getCertificate: jest.fn().mockResolvedValue('00000000'),
    onClose: jest.fn(),
    onRemove: jest.fn(),
    onResetSession: jest.fn().mockResolvedValue(undefined),
    onVerify: jest.fn((_, isVerified) => device.meta?.isVerified(isVerified)),
  };
  it('shows device details', async () => {
    const {getByText, getAllByText} = render(withTheme(<DeviceDetailsPreferences {...defaultParams} />));
    await waitFor(() => getAllByText('00'));

    expect(getByText(device.model)).toBeDefined();
  });

  it('resets session with device', async () => {
    const {getByText, getAllByText, queryByText} = render(withTheme(<DeviceDetailsPreferences {...defaultParams} />));
    await waitFor(() => getAllByText('00'));
    jest.useFakeTimers();
    act(() => {
      getByText('preferencesDevicesSessionReset').click();
    });
    expect(defaultParams.onResetSession).toHaveBeenCalled();
    expect(getByText('preferencesDevicesSessionOngoing')).toBeDefined();
    act(() => {
      jest.advanceTimersToNextTimer();
    });
    await waitFor(() => getAllByText('preferencesDevicesSessionConfirmation'));
    expect(getByText('preferencesDevicesSessionConfirmation')).toBeDefined();

    act(() => {
      jest.advanceTimersToNextTimer();
      jest.advanceTimersToNextTimer();
    });
    await waitFor(() => getAllByText('preferencesDevicesSessionReset'));
    expect(queryByText('preferencesDevicesSessionConfirmation')).toBeNull();
    expect(queryByText('preferencesDevicesSessionOngoing')).toBeNull();
    expect(getByText('preferencesDevicesSessionReset')).toBeDefined();
  });

  it('toggles verification', async () => {
    const {getByText, getAllByText} = render(withTheme(<DeviceDetailsPreferences {...defaultParams} />));
    await waitFor(() => getAllByText('00'));

    act(() => {
      getByText('preferencesDevicesVerification').click();
    });

    expect(defaultParams.onVerify).toHaveBeenCalledWith(defaultParams.device, true);

    act(() => {
      getByText('preferencesDevicesVerification').click();
    });

    expect(defaultParams.onVerify).toHaveBeenCalledWith(defaultParams.device, false);
  });
});
