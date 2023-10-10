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

interface GetAuthorizationParams {
  nonce: Nonce;
  authzUrl: string;
  identity: E2eiEnrollment;
  connection: AcmeService;
}
export type GetAuthorizationReturnValue = {authorization: NewAcmeAuthz; nonce: Nonce};

export const getAuthorization = async ({
  authzUrl,
  nonce,
  identity,
  connection,
}: GetAuthorizationParams): Promise<GetAuthorizationReturnValue> => {
  const reqBody = identity.newAuthzRequest(authzUrl, nonce);
  const response = await connection.getAuthorization(authzUrl, reqBody);

  if (response?.data && !!response.data.status.length && !!response.nonce.length) {
    const wasmData = identity.newAuthzResponse(jsonToByteArray(response.data));
    // manual copy of the wasm data because of a problem while cloning it
    const authorization: NewAcmeAuthz = {
      identifier: wasmData.identifier,
      wireDpopChallenge: {
        delegate: wasmData.wireDpopChallenge!.delegate,
        target: wasmData.wireDpopChallenge!.target,
        url: wasmData.wireDpopChallenge!.url,
      },
      wireOidcChallenge: {
        delegate: wasmData.wireOidcChallenge!.delegate,
        target: wasmData.wireOidcChallenge!.target,
        url: wasmData.wireOidcChallenge!.url,
      },
    };
    return {
      authorization,
      nonce: response.nonce,
    };
  }

  throw new Error('No authorization-data received');
};
