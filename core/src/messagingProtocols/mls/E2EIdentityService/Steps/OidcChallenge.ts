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

import {Converter} from 'bazinga64';

import {AuthorizationChallenge} from './Authorization';

import {AcmeService} from '../Connection/AcmeServer';
import {CoreCrypto, E2eiEnrollment, Nonce} from '../E2EIService.types';

interface DoWireOidcChallengeParams {
  coreCryptoClient: CoreCrypto;
  authData: AuthorizationChallenge;
  identity: E2eiEnrollment;
  connection: AcmeService;
  nonce: Nonce;
  oAuthIdToken: string;
}

export const doWireOidcChallenge = async ({
  coreCryptoClient,
  connection,
  authData,
  identity,
  nonce,
  oAuthIdToken,
}: DoWireOidcChallengeParams) => {
  const {wireOidcChallenge} = authData.authorization;
  if (!wireOidcChallenge) {
    throw new Error('No wireOIDCChallenge defined');
  }

  const refreshToken = 'empty'; // CC just stores the refresh token (which we don't need for web, as our oidc library does that for us)
  const reqBody = await identity.newOidcChallengeRequest(oAuthIdToken, refreshToken, nonce);

  const oidcChallengeResponse = await connection.validateOidcChallenge(wireOidcChallenge.url, reqBody);
  if (!oidcChallengeResponse) {
    throw new Error('No response received while validating OIDC challenge');
  }
  await identity.newOidcChallengeResponse(
    coreCryptoClient,
    Converter.stringToArrayBufferViewUTF8(JSON.stringify(oidcChallengeResponse.data)),
  );

  return oidcChallengeResponse;
};
