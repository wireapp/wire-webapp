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

import {AxiosRequestConfig} from 'axios';

import {ClientMismatch, NewOTRMessage} from '../conversation/';
import {HttpClient} from '../http/';
import {ValidationError} from '../validation/';

export class BroadcastAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    BROADCAST: '/broadcast/otr/messages',
  };

  /**
   * Broadcast an encrypted message to all team members and all contacts (accepts Protobuf).
   * @param clientId The sender's client ID
   * @param messageData The message content
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/postOtrBroadcast
   */
  public async postBroadcastMessage(
    clientId: string,
    messageData?: NewOTRMessage,
    params?: {
      ignore_missing?: boolean;
      report_missing?: string;
    },
  ): Promise<ClientMismatch> {
    if (!clientId) {
      throw new ValidationError('Unable to send OTR message without client ID.');
    }

    if (!messageData) {
      messageData = {
        recipients: {},
        sender: clientId,
      };
    }

    const config: AxiosRequestConfig = {
      data: messageData,
      method: 'post',
      params: {
        ignore_missing: !!messageData.data,
        ...params,
      },
      url: BroadcastAPI.URL.BROADCAST,
    };

    const response =
      typeof messageData.recipients === 'object'
        ? await this.client.sendJSON<ClientMismatch>(config)
        : await this.client.sendProtocolBuffer<ClientMismatch>(config);
    return response.data;
  }
}
