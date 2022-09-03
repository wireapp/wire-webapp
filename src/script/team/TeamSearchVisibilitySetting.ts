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

import {
  FeatureStatus,
  FeatureSearchVisibilityConfig,
  FeatureSearchVisibilityInbound,
  FeatureSearchVisibilityOutbound,
} from '@wireapp/api-client/src/team';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from '../view_model/ModalsViewModel';

export const searchVisibilityOutboundConfigToLabelText = (
  status: FeatureStatus,
  config?: FeatureSearchVisibilityConfig,
) => {
  const labels = {
    [FeatureStatus.ENABLED]: {
      [FeatureSearchVisibilityConfig.STANDARD]: t('featureConfigSearchVisibilityOutboundDescriptionEnabledStandard'),
      [FeatureSearchVisibilityConfig.NO_NAME_OUTSIDE_TEAM]: t(
        'featureConfigSearchVisibilityOutboundDescriptionEnabledNoNameOutsideTeam',
      ),
    },
    [FeatureStatus.DISABLED]: t('featureConfigSearchVisibilityOutboundDescriptionDisabled'),
  };

  return status === FeatureStatus.ENABLED && config ? labels[status][config] : labels[status];
};

export const searchVisibilityInboundConfigToLabelText = (
  status: FeatureStatus,
  config?: FeatureSearchVisibilityConfig,
) => {
  const labels = {
    [FeatureStatus.ENABLED]: {
      [FeatureSearchVisibilityConfig.STANDARD]: t('featureConfigSearchVisibilityInboundDescriptionEnabledStandard'),
      [FeatureSearchVisibilityConfig.NO_NAME_OUTSIDE_TEAM]: t(
        'featureConfigSearchVisibilityInboundDescriptionEnabledNoNameOutsideTeam',
      ),
    },
    [FeatureStatus.DISABLED]: t('featureConfigSearchVisibilityInboundDescriptionDisabled'),
  };

  return status === FeatureStatus.ENABLED && config ? labels[status][config] : labels[status];
};

interface ShowSearchVisibilityModalProps {
  searchVisibilityOutbound?: FeatureSearchVisibilityOutbound;
  searchVisibilityInbound?: FeatureSearchVisibilityInbound;
}

export const showSearchVisibilityModal = ({
  searchVisibilityInbound,
  searchVisibilityOutbound,
}: ShowSearchVisibilityModalProps) => {
  const htmlMessages = [];

  if (searchVisibilityOutbound) {
    htmlMessages.push(
      searchVisibilityOutboundConfigToLabelText(searchVisibilityOutbound.status, searchVisibilityOutbound.config),
    );
  }

  if (searchVisibilityInbound) {
    htmlMessages.push(
      searchVisibilityInboundConfigToLabelText(searchVisibilityInbound.status, searchVisibilityInbound.config),
    );
  }

  if (htmlMessages.length > 0) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        htmlMessage: htmlMessages.join('</br></br>'),
        title: t('featureConfigSearchVisibilityHeadline'),
      },
    });
  }
};
