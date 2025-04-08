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

import {proteus as ProtobufOTR} from '@wireapp/protocol-messaging/web/otr';
import {AxiosRequestConfig} from 'axios';

import {MessageSendingStatus} from '../conversation/';
import {HttpClient} from '../http/';
import {ValidationError} from '../validation/';

export class BroadcastAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    BROADCAST: '/broadcast/otr/messages',
    BROADCAST_FEDERATED: '/broadcast/proteus/messages',
  };

  /**
   * Broadcast an encrypted message to all team members and all contacts in federated environments
   * @param sendingClientId The sender's client ID
   * @param messageData The message content
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/postOtrBroadcast
   */
  public async postBroadcastMessage(
    sendingClientId: string,
    messageData: ProtobufOTR.QualifiedNewOtrMessage,
  ): Promise<MessageSendingStatus> {
    if (!sendingClientId) {
      throw new ValidationError('Unable to send OTR message without client ID.');
    }

    const config: AxiosRequestConfig = {
      data: ProtobufOTR.QualifiedNewOtrMessage.encode(messageData).finish().slice(),
      method: 'post',
      url: BroadcastAPI.URL.BROADCAST_FEDERATED,
    };

    const response = await this.client.sendProtocolBuffer<MessageSendingStatus>(config);
    return response.data;
  }
}
