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

import {AcmeService} from '../Connection/AcmeServer';
import {E2eiEnrollment, Nonce} from '../E2EIService.types';
import {UnidentifiedEnrollmentFlowData} from '../Storage/E2EIStorage.schema';

interface DoWireOidcChallengeParams {
  authData: UnidentifiedEnrollmentFlowData;
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
  const {oidcChallenge} = authData.authorization;
  if (!oidcChallenge) {
    throw new Error('No wireOIDCChallenge defined');
  }

  const reqBody = await identity.newOidcChallengeRequest(oAuthIdToken, nonce);

  const oidcChallengeResponse = await connection.validateOidcChallenge(oidcChallenge.url, reqBody);
  if (!oidcChallengeResponse) {
    throw new Error('No response received while validating OIDC challenge');
  }
  await identity.newOidcChallengeResponse(
    Converter.stringToArrayBufferViewUTF8(JSON.stringify(oidcChallengeResponse.data)),
  );

  return oidcChallengeResponse;
};
