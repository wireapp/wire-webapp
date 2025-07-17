/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {FeatureList} from '@wireapp/api-client/lib/team';

import {Config} from '../../Config';
import {getE2EIConfig} from '../../page/components/FeatureConfigChange/FeatureConfigChangeHandler/Features/E2EIdentity';
import {getMLSConfig} from '../../page/components/FeatureConfigChange/FeatureConfigChangeHandler/Features/MLS';

export function getClientMLSConfig(teamFeatures: FeatureList) {
  const keyingMaterialUpdateThreshold = Config.getConfig().FEATURE.MLS_CONFIG_KEYING_MATERIAL_UPDATE_THRESHOLD;
  const mlsConfig = getMLSConfig(teamFeatures);
  const willEnrollE2ei = getE2EIConfig(teamFeatures) !== undefined;
  return mlsConfig
    ? {
        keyingMaterialUpdateThreshold,
        defaultCiphersuite: mlsConfig.config.defaultCipherSuite,
        ciphersuites: mlsConfig.config.allowedCipherSuites,
        skipInitIdentity: !!willEnrollE2ei,
      }
    : undefined;
}
