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
import {E2eiEnrollment, Nonce} from '../E2EIService.types';

interface GetCertificateParams {
  identity: E2eiEnrollment;
  connection: AcmeService;
  nonce: Nonce;
  certificateUrl: string;
}
export const getCertificate = async ({certificateUrl, connection, identity, nonce}: GetCertificateParams) => {
  const reqBody = await identity.certificateRequest(nonce);

  const certificateResponse = await connection.getCertificate(certificateUrl, reqBody);

  if (certificateResponse?.data) {
    return {
      certificate: certificateResponse.data,
      nonce: certificateResponse.nonce,
    };
  }

  throw new Error('No certificate received');
};
