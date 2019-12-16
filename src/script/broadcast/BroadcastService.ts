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

import {OTRRecipients, UserClients} from '@wireapp/api-client/dist/conversation';
import {BackendClient} from '../service/BackendClient';

export interface BroadcastPayload {
  recipients: OTRRecipients;
  /** Client ID of the sender */
  sender: string;
}

export class BroadcastService {
  private readonly backendClient: BackendClient;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      URL_BROADCAST: '/broadcast',
    };
  }

  constructor(backendClient: BackendClient) {
    this.backendClient = backendClient;
  }

  /**
   * Post an encrypted message to broadcast it.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrBroadcast
   *
   * @param payload Payload to be posted
   * @param preconditionOption Level that backend checks for missing clients
   * @returnsPromise that resolves when the message was sent
   */
  postBroadcastMessage(
    payload: {recipients: {}; sender: string},
    preconditionOption: string[] | boolean,
  ): Promise<UserClients> {
    let url = `${BroadcastService.CONFIG.URL_BROADCAST}/otr/messages`;
    if (Array.isArray(preconditionOption)) {
      url = `${url}?report_missing=${preconditionOption.join(',')}`;
    } else if (preconditionOption) {
      url = `${url}?ignore_missing=true`;
    }

    return this.backendClient.sendJson({
      data: payload,
      type: 'POST',
      url: url,
    });
  }
}
