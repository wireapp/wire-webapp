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

import {FeatureSearchVisibilityConfig, FeatureStatus} from '../../../.yalc/@wireapp/api-client/src/team';
import {t} from 'Util/LocalizerUtil';

export const searchVisibilityOutboundConfigToLabelText = (
  status: FeatureStatus,
  config?: FeatureSearchVisibilityConfig,
) => {
  const labels = {
    [FeatureStatus.ENABLED]: {
      [FeatureSearchVisibilityConfig.STANDARD]: t(
        'featureConfigChangeModalSearchVisibilityOutboundDescriptionEnabledStandard',
      ),
      [FeatureSearchVisibilityConfig.NO_NAME_OUTSIDE_TEAM]: t(
        'featureConfigChangeModalSearchVisibilityOutboundDescriptionEnabledNoNameOutsideTeam',
      ),
    },
    [FeatureStatus.DISABLED]: t('featureConfigChangeModalSearchVisibilityOutboundDescriptionDisabled'),
  };

  return status === FeatureStatus.ENABLED && config ? labels[status][config] : labels[status];
};

export const searchVisibilityInboundConfigToLabelText = (
  status: FeatureStatus,
  config?: FeatureSearchVisibilityConfig,
) => {
  const labels = {
    [FeatureStatus.ENABLED]: {
      [FeatureSearchVisibilityConfig.STANDARD]: t(
        'featureConfigChangeModalSearchVisibilityInboundDescriptionEnabledStandard',
      ),
      [FeatureSearchVisibilityConfig.NO_NAME_OUTSIDE_TEAM]: t(
        'featureConfigChangeModalSearchVisibilityInboundDescriptionEnabledNoNameOutsideTeam',
      ),
    },
    [FeatureStatus.DISABLED]: t('featureConfigChangeModalSearchVisibilityInboundDescriptionDisabled'),
  };

  return status === FeatureStatus.ENABLED && config ? labels[status][config] : labels[status];
};
