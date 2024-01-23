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

import {DoWireDpopChallengeParams, GetClientAccessTokenParams, GetClientNonceParams} from './DpopChallenge.types';

const getClientNonce = async ({apiClient, clientId}: GetClientNonceParams) => {
  try {
    const nonce = await apiClient.api.client.getNonce(clientId);
    if (nonce) {
      return nonce;
    }
    throw new Error('No client-nonce received');
  } catch (e) {
    throw new Error(`Error while trying to receive a nonce with cause: ${e}`);
  }
};

const getClientAccessToken = async ({
  apiClient,
  clientNonce,
  identity,
  clientId,
  expirySecs,
}: GetClientAccessTokenParams) => {
  const dpopToken = await identity.createDpopToken(expirySecs, clientNonce);

  // Remove this when the server is ready to accept the token
  await new Promise(resolve => setTimeout(resolve, 2000));

  return apiClient.api.client.getAccessToken(clientId, dpopToken);
};

export const doWireDpopChallenge = async ({
  apiClient,
  clientId,
  authData,
  identity,
  nonce,
  connection,
  expirySecs,
  userDomain,
}: DoWireDpopChallengeParams) => {
  const {dpopChallenge} = authData.authorization;
  if (!dpopChallenge) {
    throw new Error('No wireDpopChallenge defined');
  }

  const clientNonce = await getClientNonce({clientId, apiClient});

  // We need to wait for the server to be ready to accept the token, there are some issues with the timing
  await new Promise(resolve => setTimeout(resolve, 1000));

  const clientAccessTokenData = await getClientAccessToken({
    apiClient,
    clientId,
    clientNonce,
    identity,
    expirySecs,
    userDomain,
  });

  const reqBody = await identity.newDpopChallengeRequest(clientAccessTokenData.token, nonce);

  const dpopChallengeResponse = await connection.validateDpopChallenge(dpopChallenge.url, reqBody);
  if (!dpopChallengeResponse) {
    throw new Error('No response received while validating DPOP challenge');
  }
  await identity.newDpopChallengeResponse(
    Converter.stringToArrayBufferViewUTF8(JSON.stringify(dpopChallengeResponse.data)),
  );

  return dpopChallengeResponse;
};
