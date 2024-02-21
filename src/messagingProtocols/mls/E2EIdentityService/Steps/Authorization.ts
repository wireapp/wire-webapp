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

import {AcmeService} from '../Connection';
import {E2eiEnrollment, NewAcmeAuthz, Nonce} from '../E2EIService.types';
import {jsonToByteArray} from '../Helper';
import {EnrollmentFlowData} from '../Storage/E2EIStorage.schema';

interface GetAuthorizationParams {
  nonce: Nonce;
  authzUrls: string[];
  identity: E2eiEnrollment;
  connection: AcmeService;
}

export const getAuthorizationChallenges = async ({
  authzUrls,
  nonce,
  identity,
  connection,
}: GetAuthorizationParams): Promise<Pick<EnrollmentFlowData, 'authorization' | 'nonce'>> => {
  const challenges: {type: string; challenge: NewAcmeAuthz}[] = [];

  for (const authzUrl of authzUrls) {
    const reqBody = await identity.newAuthzRequest(authzUrl, nonce);
    const response = await connection.getAuthorization(authzUrl, reqBody);
    // The backend returns a list of challenges (to be inline with the protocol), but in our case we are only ever going to have a single element in the list
    const backendChallenge = response.data.challenges[0];
    const challenge = await identity.newAuthzResponse(jsonToByteArray(response.data));
    challenges.push({type: backendChallenge.type, challenge});
    nonce = response.nonce;
  }

  const {challenge: oidcChallenge} = challenges.find(challenge => challenge.type.includes('oidc')) ?? {};
  const {challenge: dpopChallenge} = challenges.find(challenge => challenge.type.includes('dpop')) ?? {};

  if (!dpopChallenge || !oidcChallenge) {
    throw new Error('missing dpop or oidc challenge');
  }
  // manual copy of the wasm data because of a problem while cloning it
  const authorization = {
    keyauth: oidcChallenge.keyauth!,
    dpopChallenge: {
      delegate: dpopChallenge.challenge.delegate,
      target: dpopChallenge.challenge.target,
      url: dpopChallenge.challenge.url,
    },
    oidcChallenge: {
      delegate: oidcChallenge.challenge.delegate,
      target: oidcChallenge.challenge.target,
      url: oidcChallenge.challenge.url,
    },
  };

  return {
    authorization,
    nonce,
  };
};
