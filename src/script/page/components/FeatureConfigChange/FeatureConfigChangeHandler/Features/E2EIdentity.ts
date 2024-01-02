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

import {FeatureStatus, FEATURE_KEY, FeatureList} from '@wireapp/api-client/lib/team';

import {E2EIHandler, isFreshMLSSelfClient} from 'src/script/E2EIdentity';
import {Logger} from 'Util/Logger';

import {hasE2EIVerificationExpiration, hasMLSDefaultProtocol} from '../../../../../guards/Protocol';

export const handleE2EIdentityFeatureChange = async (logger: Logger, config: FeatureList) => {
  const e2eiConfig = config[FEATURE_KEY.MLSE2EID];
  const mlsConfig = config[FEATURE_KEY.MLS];
  // Check if MLS or MLS E2EIdentity feature is existent
  if (!hasE2EIVerificationExpiration(e2eiConfig) || !hasMLSDefaultProtocol(mlsConfig)) {
    return;
  }

  // Check if E2EIdentity feature is enabled
  if (e2eiConfig?.status === FeatureStatus.ENABLED) {
    // Check if MLS feature is enabled
    if (mlsConfig?.status !== FeatureStatus.ENABLED) {
      logger.info('Warning: E2EIdentity feature enabled but MLS feature is not active');
      return;
    }
    // Check if E2EIdentity feature has a server discoveryUrl
    if (!e2eiConfig.config || !e2eiConfig.config.acmeDiscoveryUrl || e2eiConfig.config.acmeDiscoveryUrl.length <= 0) {
      logger.info('Warning: E2EIdentity feature enabled but no discoveryUrl provided');
      return;
    }

    const freshMLSSelfClient = await isFreshMLSSelfClient();

    // Either get the current E2EIdentity handler instance or create a new one
    E2EIHandler.getInstance().initialize({
      discoveryUrl: e2eiConfig.config.acmeDiscoveryUrl!,
      gracePeriodInSeconds: e2eiConfig.config.verificationExpiration,
      isFreshMLSSelfClient: freshMLSSelfClient,
    });
  }
};
