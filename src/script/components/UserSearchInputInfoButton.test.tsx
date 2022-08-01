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

import {FeatureSearchVisibilityConfig, FeatureStatus} from '@wireapp/api-client/src/team';
import {WebAppEvents} from '@wireapp/webapp-events';
import {render, fireEvent} from '@testing-library/react';
import {amplify} from 'amplify';

import UserSearchInputInfoButton from 'Components/UserSearchInputInfoButton';
import {ModalsViewModel} from '../view_model/ModalsViewModel';

describe('UserSearchInputInfoButton', () => {
  it.each([
    [
      {
        searchVisibilityInbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.DISABLED,
        },
        searchVisibilityOutbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.DISABLED,
        },
      },
      [
        'featureConfigSearchVisibilityOutboundDescriptionDisabled',
        'featureConfigSearchVisibilityInboundDescriptionDisabled',
      ],
    ],
    [
      {
        searchVisibilityInbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
        searchVisibilityOutbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
      },
      [
        'featureConfigSearchVisibilityOutboundDescriptionEnabledStandard',
        'featureConfigSearchVisibilityInboundDescriptionEnabledStandard',
      ],
    ],
    [
      {
        searchVisibilityInbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.DISABLED,
        },
        searchVisibilityOutbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
      },
      [
        'featureConfigSearchVisibilityOutboundDescriptionEnabledStandard',
        'featureConfigSearchVisibilityInboundDescriptionDisabled',
      ],
    ],
    [
      {
        searchVisibilityInbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
        searchVisibilityOutbound: {
          config: FeatureSearchVisibilityConfig.NO_NAME_OUTSIDE_TEAM,
          status: FeatureStatus.ENABLED,
        },
      },
      [
        'featureConfigSearchVisibilityOutboundDescriptionEnabledNoNameOutsideTeam',
        'featureConfigSearchVisibilityInboundDescriptionEnabledStandard',
      ],
    ],
    [
      {
        searchVisibilityInbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
      },
      ['featureConfigSearchVisibilityInboundDescriptionEnabledStandard'],
    ],
    [
      {
        searchVisibilityOutbound: {
          config: FeatureSearchVisibilityConfig.STANDARD,
          status: FeatureStatus.ENABLED,
        },
      },
      ['featureConfigSearchVisibilityOutboundDescriptionEnabledStandard'],
    ],
  ])('display modal with messages based on feature config', (config, labels) => {
    const {getByLabelText} = render(<UserSearchInputInfoButton teamFeatures={{...config}} />);

    const infoButton = getByLabelText('featureConfigSearchVisibilityHeadline');

    spyOn(amplify, 'publish').and.returnValue(undefined);
    fireEvent.click(infoButton);

    expect(amplify.publish).toHaveBeenCalledWith(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        htmlMessage: labels.join('</br></br>'),
        title: 'featureConfigSearchVisibilityHeadline',
      },
    });
  });
});
