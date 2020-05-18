/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import type {APIClient} from '@wireapp/api-client';
import type {ClientMismatch, NewOTRMessage} from '@wireapp/api-client/dist/conversation';

export class BroadcastService {
  private readonly apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Post an encrypted message to broadcast it.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrBroadcast
   *
   * @param payload Payload to be posted
   * @param preconditionOption Level that backend checks for missing clients
   * @returns Promise that resolves when the message was sent
   */
  postBroadcastMessage(payload: NewOTRMessage, preconditionOption: string[] | boolean): Promise<ClientMismatch> {
    const reportMissing = Array.isArray(preconditionOption) ? preconditionOption : undefined;
    const ignoreMissing = preconditionOption === true ? true : undefined;

    payload.report_missing = reportMissing;

    return this.apiClient.broadcast.api.postBroadcastMessage(payload.sender, payload, ignoreMissing);
  }
}
