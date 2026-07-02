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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {withThemeAndRootContext} from 'src/script/auth/util/test/TestUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import type {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';
import type {PropertiesRepository} from 'Repositories/properties/propertiesRepository';

import {CallOptions} from './callOptions';

interface RenderCallOptionsParameters {
  hasActiveCall?: boolean;
  agcPreference?: boolean;
  refreshAudioInput?: jest.Mock<Promise<MediaStream>>;
}

function createPropertiesRepositoryForTest(): PropertiesRepository {
  return {
    properties: {
      settings: {
        call: {
          enable_press_space_to_unmute: false,
          enable_soundless_incoming_calls: false,
          enable_vbr_encoding: true,
        },
      },
    },
    savePreference: jest.fn(),
  } as unknown as PropertiesRepository;
}

function renderCallOptions(parameters: RenderCallOptionsParameters = {}) {
  const {hasActiveCall = false, agcPreference = false} = parameters;
  const constraintsHandler = {
    getAgcPreference: jest.fn(() => {
      return agcPreference;
    }),
    setAgcPreference: jest.fn(),
  } as unknown as MediaConstraintsHandler;
  const propertiesRepository = createPropertiesRepositoryForTest();
  const refreshAudioInput =
    parameters.refreshAudioInput ??
    jest.fn(async (): Promise<MediaStream> => {
      return {} as MediaStream;
    });
  const rootContextValue = createRootContextValueForTest({translate: translateForTest});
  const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

  render(
    withThemeAndRootContext(
      <CallOptions
        constraintsHandler={constraintsHandler}
        hasActiveCall={() => {
          return hasActiveCall;
        }}
        propertiesRepository={propertiesRepository}
        refreshAudioInput={refreshAudioInput}
      />,
      rootProviderWrapper,
    ),
  );

  return {constraintsHandler, refreshAudioInput};
}

function getAgcCheckbox(): HTMLInputElement {
  return screen.getByLabelText(translateForTest('preferencesOptionsEnableAgcCheckbox')) as HTMLInputElement;
}

describe('CallOptions', () => {
  it('shows AGC as enabled by default when the stored AGC preference is enabled', () => {
    renderCallOptions({
      agcPreference: true,
    });

    expect(getAgcCheckbox().checked).toBe(true);
  });

  it('stores the AGC preference when the AGC checkbox changes', () => {
    const {constraintsHandler} = renderCallOptions();

    fireEvent.click(getAgcCheckbox());

    expect(constraintsHandler.setAgcPreference).toHaveBeenCalledWith(true);
  });

  it('refreshes active audio input after AGC changes during an active call', async () => {
    const {refreshAudioInput} = renderCallOptions({
      hasActiveCall: true,
    });

    fireEvent.click(getAgcCheckbox());

    await waitFor(() => {
      expect(refreshAudioInput).toHaveBeenCalledTimes(1);
    });
  });

  it('does not refresh active audio input after AGC changes when there is no active call', () => {
    const {refreshAudioInput} = renderCallOptions({
      hasActiveCall: false,
    });

    fireEvent.click(getAgcCheckbox());

    expect(refreshAudioInput).not.toHaveBeenCalled();
  });

  it('handles audio input refresh failures after AGC changes', async () => {
    const refreshAudioInput = jest.fn(async (): Promise<MediaStream> => {
      throw new Error('refresh failed');
    });

    renderCallOptions({
      hasActiveCall: true,
      refreshAudioInput,
    });

    fireEvent.click(getAgcCheckbox());

    await waitFor(() => {
      expect(refreshAudioInput).toHaveBeenCalledTimes(1);
    });
  });
});
