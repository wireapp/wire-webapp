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

import {GetAuthorizationReturnValue} from './Authorization';

import {AcmeService} from '../Connection/AcmeServer';
import {E2eiEnrollment, Nonce} from '../E2EIService.types';

interface DoWireOidcChallengeParams {
  authData: GetAuthorizationReturnValue;
  identity: E2eiEnrollment;
  connection: AcmeService;
  nonce: Nonce;
  oAuthIdToken: string;
}

export const doWireOidcChallenge = async ({
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

  const reqBody = identity.newOidcChallengeRequest(oAuthIdToken, nonce);

  const oidcChallengeResponse = await connection.validateOidcChallenge(wireOidcChallenge.url, reqBody);
  if (!oidcChallengeResponse) {
    throw new Error('No response received while validating OIDC challenge');
  }

  return oidcChallengeResponse;
};
