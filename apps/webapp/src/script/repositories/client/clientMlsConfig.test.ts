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

import {FEATURE_KEY, FEATURE_STATUS, CONVERSATION_PROTOCOL, FeatureList} from '@wireapp/api-client/lib/team';

import {getClientMLSConfig} from './clientMlsConfig';

describe('getClientMLSConfig', () => {
  it('returns undefined when MLS configuration is missing', () => {
    expect(getClientMLSConfig({} as FeatureList)).toBeUndefined();
  });

  it.each(['', 'https://identity.example.com'])('preserves enrollment selection for discovery URL %p', discoveryUrl => {
    const teamFeatures = {
      [FEATURE_KEY.MLS]: {
        status: FEATURE_STATUS.ENABLED,
        config: {
          defaultProtocol: CONVERSATION_PROTOCOL.MLS,
          defaultCipherSuite: 1,
          allowedCipherSuites: [1],
        },
      },
      [FEATURE_KEY.MLSE2EID]: {
        status: FEATURE_STATUS.ENABLED,
        config: {verificationExpiration: 0, acmeDiscoveryUrl: discoveryUrl},
      },
    } as FeatureList;
    const actualConfiguration = getClientMLSConfig(teamFeatures);

    expect(actualConfiguration).toMatchObject({
      defaultCiphersuite: 1,
      ciphersuites: [1],
      skipInitIdentity: discoveryUrl.length > 0,
    });
  });
});
