/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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
import {FeatureStatus, FEATURE_KEY} from '@wireapp/api-client/lib/team/feature';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';

import {FeatureConfigChangeNotifier} from './FeatureConfigChangeNotifier';

import {TeamState} from '../team/TeamState';

describe('FeatureConfigChangeNotifier', () => {
  const showModalSpy = jest.spyOn(PrimaryModal, 'show');

  beforeEach(() => {
    showModalSpy.mockClear();
  });

  const baseConfig = {
    [FEATURE_KEY.FILE_SHARING]: {
      status: FeatureStatus.DISABLED,
    },
    [FEATURE_KEY.VIDEO_CALLING]: {
      status: FeatureStatus.DISABLED,
    },
    [FEATURE_KEY.SELF_DELETING_MESSAGES]: {
      status: FeatureStatus.DISABLED,
      config: {enforcedTimeoutSeconds: 0},
    },
    [FEATURE_KEY.CONFERENCE_CALLING]: {
      status: FeatureStatus.DISABLED,
    },
    [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: {
      status: FeatureStatus.DISABLED,
    },
  };

  it.each([
    [
      FEATURE_KEY.FILE_SHARING,
      'featureConfigChangeModalFileSharingDescriptionItemFileSharingEnabled',
      'featureConfigChangeModalFileSharingDescriptionItemFileSharingDisabled',
    ],
    [
      FEATURE_KEY.VIDEO_CALLING,
      'featureConfigChangeModalAudioVideoDescriptionItemCameraEnabled',
      'featureConfigChangeModalAudioVideoDescriptionItemCameraDisabled',
    ],
    [
      FEATURE_KEY.SELF_DELETING_MESSAGES,
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled',
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemDisabled',
    ],
    [FEATURE_KEY.CONFERENCE_CALLING, 'featureConfigChangeModalConferenceCallingEnabled', undefined],
    [
      FEATURE_KEY.CONVERSATION_GUEST_LINKS,
      'featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksEnabled',
      'featureConfigChangeModalConversationGuestLinksDescriptionItemConversationGuestLinksDisabled',
    ],
  ] as const)('shows a modal when feature %s is turned on and off', async (feature, enabledString, disabledString) => {
    const teamState = new TeamState();
    render(<FeatureConfigChangeNotifier teamState={teamState} />);
    act(() => {
      teamState.teamFeatures(baseConfig);
    });

    act(() => {
      teamState.teamFeatures({
        ...baseConfig,
        [feature]: {
          status: FeatureStatus.ENABLED,
        },
      });
    });

    await waitFor(() => {
      expect(showModalSpy).toHaveBeenCalledTimes(1);
      expect(showModalSpy).toHaveBeenCalledWith(PrimaryModal.type.ACKNOWLEDGE, {
        text: expect.objectContaining({
          htmlMessage: enabledString,
        }),
      });
    });

    act(() => {
      teamState.teamFeatures({
        ...baseConfig,
        [feature]: {
          status: FeatureStatus.DISABLED,
        },
      });
    });

    if (!disabledString) {
      expect(showModalSpy).toHaveBeenCalledTimes(1);
    } else {
      await waitFor(() => {
        expect(showModalSpy).toHaveBeenCalledTimes(2);
        expect(showModalSpy).toHaveBeenCalledWith(PrimaryModal.type.ACKNOWLEDGE, {
          text: expect.objectContaining({
            htmlMessage: disabledString,
          }),
        });
      });
    }
  });

  it.each([
    [
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnforced',
    ],
    [
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 0}},
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnabled',
    ],
    [
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemEnforced',
    ],
    [
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      'featureConfigChangeModalSelfDeletingMessagesDescriptionItemDisabled',
    ],
  ])(
    'indicates the config change when self deleting messages have changed (%s) to (%s)',
    async (fromStatus, toStatus, expectedText) => {
      const teamState = new TeamState();
      render(<FeatureConfigChangeNotifier teamState={teamState} />);
      act(() => {
        teamState.teamFeatures({
          ...baseConfig,
          [FEATURE_KEY.SELF_DELETING_MESSAGES]: fromStatus,
        });
      });

      act(() => {
        teamState.teamFeatures({
          ...baseConfig,
          [FEATURE_KEY.SELF_DELETING_MESSAGES]: toStatus,
        });
      });

      await waitFor(() => {
        expect(showModalSpy).toHaveBeenCalledTimes(1);
        expect(showModalSpy).toHaveBeenCalledWith(PrimaryModal.type.ACKNOWLEDGE, {
          text: expect.objectContaining({
            htmlMessage: expectedText,
          }),
        });
      });
    },
  );
});
