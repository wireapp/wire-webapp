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

import {fireEvent, render, screen} from '@testing-library/react';

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
  isEnhancedCallAudioProcessingEnabled?: boolean;
  hasActiveCall?: boolean;
  agcPreference?: boolean;
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
  const {isEnhancedCallAudioProcessingEnabled = false, hasActiveCall = false, agcPreference = false} = parameters;
  const constraintsHandler = {
    getAgcPreference: jest.fn(() => {
      return agcPreference;
    }),
    setAgcPreference: jest.fn(),
  } as unknown as MediaConstraintsHandler;
  const propertiesRepository = createPropertiesRepositoryForTest();
  const refreshAudioInput = jest.fn(async (): Promise<MediaStream> => {
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
        isEnhancedCallAudioProcessingEnabled={isEnhancedCallAudioProcessingEnabled}
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
  it('shows AGC as enabled by default when enhanced call audio processing is enabled', () => {
    renderCallOptions({
      agcPreference: true,
      isEnhancedCallAudioProcessingEnabled: true,
    });

    expect(getAgcCheckbox().checked).toBe(true);
  });

  it('stores the AGC preference when the AGC checkbox changes', () => {
    const {constraintsHandler} = renderCallOptions();

    fireEvent.click(getAgcCheckbox());

    expect(constraintsHandler.setAgcPreference).toHaveBeenCalledWith(true);
  });

  it('refreshes active audio input after AGC changes when enhanced call audio processing is enabled during an active call', () => {
    const {refreshAudioInput} = renderCallOptions({
      hasActiveCall: true,
      isEnhancedCallAudioProcessingEnabled: true,
    });

    fireEvent.click(getAgcCheckbox());

    expect(refreshAudioInput).toHaveBeenCalledTimes(1);
  });

  it('does not refresh active audio input after AGC changes when enhanced call audio processing is disabled', () => {
    const {refreshAudioInput} = renderCallOptions({
      hasActiveCall: true,
      isEnhancedCallAudioProcessingEnabled: false,
    });

    fireEvent.click(getAgcCheckbox());

    expect(refreshAudioInput).not.toHaveBeenCalled();
  });
});
