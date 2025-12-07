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

import {FEATURE_STATUS, FEATURE_KEY, FeatureList} from '@wireapp/api-client/lib/team';
import {E2EIHandler} from 'src/script/E2EIdentity';
import {supportsMLS} from 'Util/util';

import {hasE2EIVerificationExpiration, hasMLSDefaultProtocol} from '../../../../../guards/Protocol';

export const getE2EIConfig = (config: FeatureList): FeatureList[FEATURE_KEY.MLSE2EID] | undefined => {
  if (!supportsMLS()) {
    return undefined;
  }

  const e2eiConfig = config[FEATURE_KEY.MLSE2EID];
  const mlsConfig = config[FEATURE_KEY.MLS];
  // Check if MLS or MLS E2EIdentity feature is existent
  if (!hasE2EIVerificationExpiration(e2eiConfig) || !hasMLSDefaultProtocol(mlsConfig)) {
    return undefined;
  }

  // Check if E2EIdentity feature is enabled
  if (e2eiConfig?.status !== FEATURE_STATUS.ENABLED) {
    return undefined;
  }

  // Check if MLS feature is enabled
  if (mlsConfig?.status !== FEATURE_STATUS.ENABLED) {
    return undefined;
  }
  // Check if E2EIdentity feature has a server discoveryUrl
  if (!e2eiConfig.config || !e2eiConfig.config.acmeDiscoveryUrl || e2eiConfig.config.acmeDiscoveryUrl.length <= 0) {
    return undefined;
  }
  return e2eiConfig;
};

export const configureE2EI = (config: FeatureList): undefined | Promise<E2EIHandler> => {
  // Either get the current E2EIdentity handler instance or create a new one
  const e2eiConfig = getE2EIConfig(config);
  if (!e2eiConfig) {
    return undefined;
  }
  return E2EIHandler.getInstance().initialize({
    discoveryUrl: e2eiConfig.config.acmeDiscoveryUrl!,
    gracePeriodInSeconds: e2eiConfig.config.verificationExpiration,
  });
};
