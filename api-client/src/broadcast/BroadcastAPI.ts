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

import {ClientMismatch, MessageSendingStatus, NewOTRMessage} from '../conversation/';
import {HttpClient} from '../http/';
import {ValidationError} from '../validation/';

export class BroadcastAPI {
  constructor(private readonly client: HttpClient) {}

  public static readonly URL = {
    BROADCAST: '/broadcast/otr/messages',
    BROADCAST_FEDERATED: '/broadcast/proteus/messages',
  };

  /**
   * Broadcast an encrypted message to all team members and all contacts (accepts Protobuf).
   * @param sendingClientId The sender's client ID
   * @param messageData The message content
   * @param ignoreMissing Whether to report missing clients or not:
   * `false`: Report about all missing clients
   * `true`: Ignore all missing clients and force sending
   * Array: User IDs specifying which user IDs are allowed to have
   * missing clients
   * `undefined`: Default to setting of `report_missing` in `NewOTRMessage`
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/postOtrBroadcast
   */
  public async postBroadcastMessage(
    sendingClientId: string,
    messageData: NewOTRMessage<string>,
    ignoreMissing?: boolean | string[],
  ): Promise<ClientMismatch> {
    if (!sendingClientId) {
      throw new ValidationError('Unable to send OTR message without client ID.');
    }

    const config: AxiosRequestConfig = {
      data: messageData,
      method: 'post',
      url: BroadcastAPI.URL.BROADCAST,
    };

    if (typeof ignoreMissing !== 'undefined') {
      const ignore_missing = Array.isArray(ignoreMissing) ? ignoreMissing.join(',') : ignoreMissing;
      config.params = {ignore_missing};
      // `ignore_missing` takes precedence on the server so we can remove
      // `report_missing` to save some bandwidth.
      delete messageData.report_missing;
    } else if (typeof messageData.report_missing === 'undefined') {
      // both `ignore_missing` and `report_missing` are undefined
      config.params = {ignore_missing: !!messageData.data};
    }

    const response = await this.client.sendJSON<ClientMismatch>(config);
    return response.data;
  }

  /**
   * Broadcast an encrypted message to all team members and all contacts (accepts Protobuf).
   * @param sendingClientId The sender's client ID
   * @param messageData The message content
   * @param ignoreMissing Whether to report missing clients or not:
   * `false`: Report about all missing clients
   * `true`: Ignore all missing clients and force sending
   * Array: User IDs specifying which user IDs are allowed to have
   * missing clients
   * `undefined`: Default to setting of `report_missing` in `NewOTRMessage`
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/postOtrBroadcast
   */
  public async postBroadcastProtobufMessage(
    sendingClientId: string,
    messageData: ProtobufOTR.NewOtrMessage,
    ignoreMissing?: boolean | string[],
  ): Promise<ClientMismatch> {
    if (!sendingClientId) {
      throw new ValidationError('Unable to send OTR message without client ID.');
    }

    const config: AxiosRequestConfig = {
      data: ProtobufOTR.NewOtrMessage.encode(messageData).finish(),
      method: 'post',
      url: BroadcastAPI.URL.BROADCAST,
    };

    if (typeof ignoreMissing !== 'undefined') {
      const ignore_missing = Array.isArray(ignoreMissing) ? ignoreMissing.join(',') : ignoreMissing;
      config.params = {ignore_missing};
      // `ignore_missing` takes precedence on the server so we can remove
      // `report_missing` to save some bandwidth.
      messageData.reportMissing = [];
    } else if (typeof messageData.reportMissing === 'undefined' || !messageData.reportMissing.length) {
      // both `ignore_missing` and `report_missing` are undefined
      config.params = {ignore_missing: !!messageData.blob};
    }

    const response = await this.client.sendProtocolBuffer<ClientMismatch>(config);
    return response.data;
  }

  /**
   * Broadcast an encrypted message to all team members and all contacts in federated environments
   * @param sendingClientId The sender's client ID
   * @param messageData The message content
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!/postOtrBroadcast
   */
  public async postBroadcastFederatedMessage(
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
