/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {MessageSendingStatus, QualifiedOTRRecipients, QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {uuidToBytes} from '@wireapp/commons/lib/util/StringUtil';
import {proteus as ProtobufOTR} from '@wireapp/protocol-messaging/web/otr';
import {AxiosError} from 'axios';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {merge} from 'lodash';
// @ts-expect-error - long module has compatibility issues between versions
import * as Long from 'long';

import {APIClient} from '@wireapp/api-client';

import {flattenUserMap} from './UserClientsUtil';

import type {EncryptionResult, ProteusService} from '../../messagingProtocols/proteus';
import {isQualifiedIdArray} from '../../util';

type ClientMismatchError = AxiosError<MessageSendingStatus>;

export class MessageService {
  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
  ) {}

  /**
   * Sends a message to a federated backend.
   *
   * @param sendingClientId The clientId of the current user
   * @param recipients The list of recipients to send the message to
   * @param plainText The plainText data to send
   * @param options.conversationId? the conversation to send the message to. Will broadcast if not set
   * @param options.reportMissing? trigger a mismatch error when there are missing recipients in the payload
   * @param options.sendAsProtobuf?
   * @param options.onClientMismatch? Called when a mismatch happens on the server
   * @return the MessageSendingStatus returned by the backend
   */
  public async sendMessage(
    sendingClientId: string,
    recipients: QualifiedUserClients | QualifiedUserPreKeyBundleMap,
    plainText: Uint8Array,
    options: {
      assetData?: Uint8Array;
      conversationId?: QualifiedId;
      reportMissing?: boolean | QualifiedId[];
      nativePush?: boolean;
      onClientMismatch?: (mismatch: MessageSendingStatus) => void | boolean | Promise<boolean>;
    } = {},
  ): Promise<MessageSendingStatus & {canceled?: boolean; failed?: QualifiedId[]}> {
    const encryptionResults = await this.proteusService.encrypt(plainText, recipients);

    const send = async ({payloads, unknowns, failed}: EncryptionResult): Promise<MessageSendingStatus> => {
      const result = await this.sendOtrMessage(sendingClientId, payloads, options);
      const extras = {failed, deleted: unknowns ?? {}};
      return merge({}, result, extras) as MessageSendingStatus & {failed?: QualifiedId[]};
    };

    try {
      return await send(encryptionResults);
    } catch (error) {
      if (!this.isClientMismatchError(error)) {
        throw error;
      }
      const mismatch = error.response!.data as MessageSendingStatus;
      const shouldStopSending = options.onClientMismatch && (await options.onClientMismatch(mismatch)) === false;
      if (shouldStopSending) {
        return {...mismatch, canceled: true};
      }
      const reEncryptedPayload = await this.reencryptAfterMismatch(mismatch, encryptionResults, plainText);
      return send(reEncryptedPayload);
    }
  }

  private async sendOtrMessage(
    sendingClientId: string,
    recipients: QualifiedOTRRecipients,
    options: {
      assetData?: Uint8Array;
      conversationId?: QualifiedId;
      reportMissing?: boolean | QualifiedId[];
      nativePush?: boolean;
    },
  ): Promise<MessageSendingStatus> {
    const qualifiedUserEntries = Object.entries(recipients).map<ProtobufOTR.IQualifiedUserEntry>(
      ([domain, otrRecipients]) => {
        const userEntries = Object.entries(otrRecipients).map<ProtobufOTR.IUserEntry>(([userId, otrClientMap]) => {
          const clientEntries = Object.entries(otrClientMap).map<ProtobufOTR.IClientEntry>(([clientId, payload]) => {
            return {
              client: {
                client: Long.fromString(clientId, 16),
              },
              text: payload,
            };
          });

          return {
            user: {
              uuid: uuidToBytes(userId),
            },
            clients: clientEntries,
          };
        });

        return {domain, entries: userEntries};
      },
    );

    const protoMessage = ProtobufOTR.QualifiedNewOtrMessage.create({
      recipients: qualifiedUserEntries,
      sender: {
        client: Long.fromString(sendingClientId, 16),
      },
      nativePush: options.nativePush,
    });

    if (options.assetData) {
      protoMessage.blob = options.assetData;
    }

    if (options.reportMissing) {
      if (isQualifiedIdArray(options.reportMissing)) {
        protoMessage.reportOnly = {userIds: options.reportMissing};
      } else {
        protoMessage.reportAll = true;
      }
    } else {
      protoMessage.ignoreAll = true;
    }

    if (!options.conversationId) {
      return this.apiClient.api.broadcast.postBroadcastMessage(sendingClientId, protoMessage);
    }

    const {id, domain} = options.conversationId;

    return this.apiClient.api.conversation.postOTRMessage(id, domain, protoMessage);
  }

  private isClientMismatchError(error: any): error is ClientMismatchError {
    return error.response?.status === HTTP_STATUS.PRECONDITION_FAILED;
  }

  /**
   * Will re-encrypt a message when there were some missing clients in the initial send (typically when the server replies with a client mismatch error)
   *
   * @param {ProtobufOTR.QualifiedNewOtrMessage} messageData The initial message that was sent
   * @param {MessageSendingStatus} messageSendingStatus Info about the missing/deleted clients
   * @param {Uint8Array} plainText The text that should be encrypted for the missing clients
   * @return resolves with a new message payload that can be sent
   */
  private async reencryptAfterMismatch(
    mismatch: {missing: QualifiedUserClients; deleted: QualifiedUserClients},
    initialPayloads: EncryptionResult,
    plainText: Uint8Array,
  ): Promise<EncryptionResult> {
    const deleted = flattenUserMap(mismatch.deleted);
    // remove deleted clients to the recipients
    deleted.forEach(({userId, data}) =>
      data.forEach(clientId => delete initialPayloads.payloads[userId.domain][userId.id][clientId]),
    );

    if (Object.keys(mismatch.missing).length === 0) {
      return initialPayloads;
    }
    const reencryptedResults = await this.proteusService.encrypt(plainText, mismatch.missing);
    return merge({}, initialPayloads, reencryptedResults);
  }
}
