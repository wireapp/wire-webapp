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
import {AcmeDirectory, E2eiEnrollment, NewAcmeOrder, Nonce} from '../E2EIService.types';
import {jsonToByteArray} from '../Helper';

type OrderUrl = string;

export interface CreateNewOrderParams {
  identity: E2eiEnrollment;
  nonce: Nonce;
  directory: AcmeDirectory;
  connection: AcmeService;
}
export type CreateNewOrderReturnValue = {
  order: NewAcmeOrder;
  nonce: string;
  authzUrls: string[];
  orderUrl: OrderUrl;
};

export const createNewOrder = async ({
  identity,
  nonce,
  directory,
  connection,
}: CreateNewOrderParams): Promise<CreateNewOrderReturnValue> => {
  const reqBody = await identity.newOrderRequest(nonce);
  const {data, nonce: responseNonce, location} = await connection.createNewOrder(directory.newOrder, reqBody);
  if (!location) {
    throw new Error('No location header from API received for order creation');
  }
  return {
    order: await identity.newOrderResponse(jsonToByteArray(data)),
    authzUrls: data.authorizations,
    nonce: responseNonce,
    orderUrl: location,
  };
};

export interface FinalizeOrderParams {
  connection: AcmeService;
  identity: E2eiEnrollment;
  nonce: Nonce;
  orderUrl: OrderUrl;
}
export const finalizeOrder = async ({identity, nonce, orderUrl, connection}: FinalizeOrderParams) => {
  const statusReqBody = await identity.checkOrderRequest(orderUrl, nonce);
  const statusResponse = await connection.checkStatusOfOrder(orderUrl, statusReqBody);

  if (statusResponse?.data && !!statusResponse.data.status.length && !!statusResponse.nonce.length) {
    const finalizeUrl = await identity.checkOrderResponse(jsonToByteArray(statusResponse.data));
    const finalizeReqBody = await identity.finalizeRequest(statusResponse.nonce);
    const finalizeResponse = await connection.finalizeOrder(finalizeUrl, finalizeReqBody);

    if (finalizeResponse?.data && !!finalizeResponse.data.status.length && !!finalizeResponse.nonce.length) {
      const certificateUrl = await identity.finalizeResponse(jsonToByteArray(finalizeResponse.data));

      return {
        certificateUrl,
        nonce: finalizeResponse.nonce,
      };
    }
    throw new Error('Error while finalizing order');
  }

  throw new Error('Error while checking status of order');
};
