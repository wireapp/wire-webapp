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

import {act, fireEvent, render} from '@testing-library/react';
import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {CallOptions} from './CallOptions';

import {Config} from '../../../../../Config';

jest.mock('Util/localizerUtil', () => ({
  t: (key: string) => key,
}));

type DesktopSettingsMock = {
  isHardwareAccelerationEnabled: jest.Mock;
  setHardwareAccelerationEnabled: jest.Mock;
};

type PrimaryModalOptions = Parameters<typeof PrimaryModal.show>[1];

const mockDesktopSettings = (hwEnabled: boolean): DesktopSettingsMock => ({
  isHardwareAccelerationEnabled: jest.fn().mockReturnValue(hwEnabled),
  setHardwareAccelerationEnabled: jest.fn(),
});

const getDefaultProps = () => {
  const constraintsHandler = {
    getAgcPreference: jest.fn().mockReturnValue(false),
    setAgcPreference: jest.fn(),
  } as unknown as MediaConstraintsHandler;

  const propertiesRepository = {
    properties: {
      settings: {
        call: {
          enable_vbr_encoding: false,
          enable_soundless_incoming_calls: false,
          enable_press_space_to_unmute: false,
        },
      },
    } as PropertiesRepository['properties'],
    savePreference: jest.fn(),
  } as unknown as PropertiesRepository;

  return {
    constraintsHandler,
    propertiesRepository,
  };
};

const setupDesktop = (hwEnabled: boolean): DesktopSettingsMock => {
  const desktopSettings = mockDesktopSettings(hwEnabled);
  jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);
  jest
    .spyOn(Config, 'getDesktopSettings')
    .mockReturnValue(desktopSettings as ReturnType<typeof Config.getDesktopSettings>);
  return desktopSettings;
};

beforeEach(() => {
  jest.restoreAllMocks();

  jest.spyOn(Config, 'getConfig').mockReturnValue({
    FEATURE: {
      ENFORCE_CONSTANT_BITRATE: false,
      ENABLE_PRESS_SPACE_TO_UNMUTE: false,
    },
  } as ReturnType<typeof Config.getConfig>);
});

describe('CallOptions — hardware acceleration checkbox', () => {
  it('is not shown in a browser (non-desktop)', () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(false);
    jest.spyOn(Config, 'getDesktopSettings').mockReturnValue(undefined);

    const {queryByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));

    expect(queryByTestId('status-preference-hardware-acceleration')).toBeNull();
  });

  it('is not shown when desktopSettings is null even on desktop', () => {
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);
    jest.spyOn(Config, 'getDesktopSettings').mockReturnValue(undefined);

    const {queryByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));

    expect(queryByTestId('status-preference-hardware-acceleration')).toBeNull();
  });

  it('is shown and checked when hardware acceleration is enabled', () => {
    setupDesktop(true);

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    const checkbox = getByTestId('status-preference-hardware-acceleration') as HTMLInputElement;

    expect(checkbox.checked).toBe(true);
  });

  it('is shown and unchecked when hardware acceleration is disabled', () => {
    setupDesktop(false);

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    const checkbox = getByTestId('status-preference-hardware-acceleration') as HTMLInputElement;

    expect(checkbox.checked).toBe(false);
  });

  it('opens a confirmation modal when the checkbox is clicked without immediately applying the change', () => {
    const desktopSettings = setupDesktop(true);
    const showModalSpy = jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    fireEvent.click(getByTestId('status-preference-hardware-acceleration'));

    expect(showModalSpy).toHaveBeenCalledTimes(1);
    expect(showModalSpy).toHaveBeenCalledWith(
      PrimaryModal.type.CONFIRM,
      expect.objectContaining({
        primaryAction: expect.objectContaining({action: expect.any(Function)}),
      }),
    );
    expect(desktopSettings.setHardwareAccelerationEnabled).not.toHaveBeenCalled();
  });

  it('does not publish a restart event when the modal is merely opened', () => {
    setupDesktop(true);
    jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});
    const publishSpy = jest.spyOn(amplify, 'publish');

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    fireEvent.click(getByTestId('status-preference-hardware-acceleration'));

    expect(publishSpy).not.toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.RESTART);
  });

  it('disables hardware acceleration and triggers restart when confirmed', () => {
    const desktopSettings = setupDesktop(true);
    let capturedAction: (() => void) | undefined;

    jest.spyOn(PrimaryModal, 'show').mockImplementation((_type, options: PrimaryModalOptions) => {
      const primaryAction = options?.primaryAction;
      if (primaryAction && 'action' in primaryAction && typeof primaryAction.action === 'function') {
        capturedAction = primaryAction.action as () => void;
      }
    });

    const publishSpy = jest.spyOn(amplify, 'publish');

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    fireEvent.click(getByTestId('status-preference-hardware-acceleration'));

    expect(capturedAction).toBeDefined();
    act(() => capturedAction?.());

    expect(desktopSettings.setHardwareAccelerationEnabled).toHaveBeenCalledWith(false);
    expect(publishSpy).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.RESTART);

    const checkbox = getByTestId('status-preference-hardware-acceleration') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('enables hardware acceleration and triggers restart when confirmed', () => {
    const desktopSettings = setupDesktop(false);
    let capturedAction: (() => void) | undefined;

    jest.spyOn(PrimaryModal, 'show').mockImplementation((_type, options: PrimaryModalOptions) => {
      const primaryAction = options?.primaryAction;
      if (primaryAction && 'action' in primaryAction && typeof primaryAction.action === 'function') {
        capturedAction = primaryAction.action as () => void;
      }
    });

    const publishSpy = jest.spyOn(amplify, 'publish');

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    fireEvent.click(getByTestId('status-preference-hardware-acceleration'));

    expect(capturedAction).toBeDefined();
    act(() => capturedAction?.());

    expect(desktopSettings.setHardwareAccelerationEnabled).toHaveBeenCalledWith(true);
    expect(publishSpy).toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.RESTART);

    const checkbox = getByTestId('status-preference-hardware-acceleration') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('makes no changes when the confirmation modal is dismissed', () => {
    const desktopSettings = setupDesktop(true);
    jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});
    const publishSpy = jest.spyOn(amplify, 'publish');

    const {getByTestId} = render(withTheme(<CallOptions {...getDefaultProps()} />));
    fireEvent.click(getByTestId('status-preference-hardware-acceleration'));

    expect(desktopSettings.setHardwareAccelerationEnabled).not.toHaveBeenCalled();
    expect(publishSpy).not.toHaveBeenCalledWith(WebAppEvents.LIFECYCLE.RESTART);

    const checkbox = getByTestId('status-preference-hardware-acceleration') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
