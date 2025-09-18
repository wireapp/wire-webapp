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
import {FeatureStatus, FEATURE_KEY, FeatureList} from '@wireapp/api-client/lib/team/feature';
import {Runtime} from '@wireapp/commons/lib/util/Runtime';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import en from 'I18n/en-US.json';
import {TeamState} from 'Repositories/team/TeamState';
import {setStrings} from 'Util/LocalizerUtil';

import {FeatureConfigChangeNotifier} from './FeatureConfigChangeNotifier';

setStrings({en});

describe('FeatureConfigChangeNotifier', () => {
  const showModalSpy = jest.spyOn(PrimaryModal, 'show');

  beforeEach(() => {
    showModalSpy.mockClear();
    localStorage.clear();
    jest.spyOn(Runtime, 'isDesktopApp').mockReturnValue(true);
    jest.spyOn(Runtime, 'isWindows').mockReturnValue(true);
  });

  const baseConfig: FeatureList = {
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
      config: {useSFTForOneToOneCalls: false},
      status: FeatureStatus.DISABLED,
    },
    [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: {
      status: FeatureStatus.DISABLED,
    },
    [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]: {
      status: FeatureStatus.DISABLED,
      config: {enforcedDownloadLocation: ''},
    },
  };

  it.each([
    [
      FEATURE_KEY.FILE_SHARING,
      'Sharing and receiving files of any type is now enabled',
      'Sharing and receiving files of any type is now disabled',
    ],
    [FEATURE_KEY.VIDEO_CALLING, 'Camera in calls is enabled', 'Camera in calls is disabled'],
    [
      FEATURE_KEY.CONFERENCE_CALLING,
      'Your team was upgraded to  Enterprise, which gives you access to features such as conference calls and more. <a href="undefined" data-uie-name="read-more-pricing" class="modal__text__read-more" rel="nofollow noopener noreferrer" target="_blank">Learn more about  Enterprise</a>',
      undefined,
    ],
    [
      FEATURE_KEY.CONVERSATION_GUEST_LINKS,
      'Generating guest links is now enabled for all group admins.',
      'Generating guest links is now disabled for all group admins.',
    ],
    [
      FEATURE_KEY.ENFORCE_DOWNLOAD_PATH,
      'You’ll find your downloaded files now in a specific standard location on your Windows computer. The app needs a restart for the new setting to take effect.',
      'Standard file location on Windows computers is disabled. Restart the app to save downloaded files in a new location.',
    ],
  ] as const)('shows a modal when feature %s is turned on and off', async (feature, enabledString, disabledString) => {
    const teamState = new TeamState();
    render(<FeatureConfigChangeNotifier selfUserId={'self'} teamState={teamState} />);
    act(() => {
      teamState.teamFeatures(baseConfig);
    });

    act(() => {
      teamState.teamFeatures({
        ...baseConfig,
        [feature]: {
          status: FeatureStatus.ENABLED,
          ...(feature === FEATURE_KEY.ENFORCE_DOWNLOAD_PATH && {config: {enforcedDownloadLocation: 'dlpath'}}),
        },
      });
    });

    await waitFor(() => {
      expect(showModalSpy).toHaveBeenCalledTimes(1);
      expect(showModalSpy).toHaveBeenCalledWith(
        PrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({
            htmlMessage: enabledString,
          }),
        }),
      );
    });

    act(() => {
      teamState.teamFeatures({
        ...baseConfig,
        [feature]: {
          status: FeatureStatus.DISABLED,
          ...(feature === FEATURE_KEY.ENFORCE_DOWNLOAD_PATH && {config: {enforcedDownloadLocation: ''}}),
        },
      });
    });

    if (!disabledString) {
      expect(showModalSpy).toHaveBeenCalledTimes(1);
    } else {
      await waitFor(() => {
        expect(showModalSpy).toHaveBeenCalledTimes(2);
        expect(showModalSpy).toHaveBeenCalledWith(
          PrimaryModal.type.ACKNOWLEDGE,
          expect.objectContaining({
            text: expect.objectContaining({
              htmlMessage: disabledString,
            }),
          }),
        );
      });
    }
  });

  it('saves previous state of feature and warn of feature change at mount time', async () => {
    const teamState = new TeamState();
    teamState.teamFeatures(baseConfig);

    const {unmount} = render(<FeatureConfigChangeNotifier selfUserId={'self'} teamState={teamState} />);

    unmount();
    expect(showModalSpy).not.toHaveBeenCalled();

    teamState.teamFeatures({...baseConfig, [FEATURE_KEY.FILE_SHARING]: {status: FeatureStatus.ENABLED}});
    render(<FeatureConfigChangeNotifier selfUserId={'self'} teamState={teamState} />);
    expect(showModalSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      'Self-deleting messages are now mandatory. New messages will self-delete after 10 seconds.',
    ],
    [
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 0}},
      'Self-deleting messages are enabled. You can set a timer before writing a message.',
    ],
    [
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 0}},
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      'Self-deleting messages are now mandatory. New messages will self-delete after 10 seconds.',
    ],
    [
      {status: FeatureStatus.ENABLED, config: {enforcedTimeoutSeconds: 10}},
      {status: FeatureStatus.DISABLED, config: {enforcedTimeoutSeconds: 0}},
      'Self-deleting messages are disabled',
    ],
  ])(
    'indicates the config change when self deleting messages have changed (%s) to (%s)',
    async (fromStatus, toStatus, expectedText) => {
      const teamState = new TeamState();
      render(<FeatureConfigChangeNotifier selfUserId={'self'} teamState={teamState} />);
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
          hideCloseBtn: false,
          primaryAction: undefined,
          preventClose: false,
          text: expect.objectContaining({
            htmlMessage: expectedText,
          }),
        });
      });
    },
  );
});
