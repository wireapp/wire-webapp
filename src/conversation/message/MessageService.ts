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

import {
  ClientMismatch,
  MessageSendingStatus,
  NewOTRMessage,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
  UserClients,
} from '@wireapp/api-client/lib/conversation';
import {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user';
import {uuidToBytes} from '@wireapp/commons/lib/util/StringUtil';
import {proteus as ProtobufOTR} from '@wireapp/protocol-messaging/web/otr';
import {AxiosError} from 'axios';
import {Encoder} from 'bazinga64';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import Long from 'long';

import {APIClient} from '@wireapp/api-client';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {createId} from './MessageBuilder';
import {flattenUserClients, flattenQualifiedUserClients} from './UserClientsUtil';

import {GenericMessageType} from '..';
import {CryptographyService} from '../../cryptography';
import {encryptAsset} from '../../cryptography/AssetCryptography';
import {isQualifiedIdArray, isStringArray} from '../../util';

type ClientMismatchError = AxiosError<ClientMismatch | MessageSendingStatus>;

export class MessageService {
  constructor(private readonly apiClient: APIClient, private readonly cryptographyService: CryptographyService) {}

  /**
   * Sends a message to a non-federated backend.
   *
   * @param sendingClientId The clientId of the current user
   * @param recipients The list of recipients to send the message to
   * @param plainText The plainText data to send
   * @param options.conversationId? the conversation to send the message to. Will broadcast if not set
   * @param options.reportMissing? trigger a mismatch error when there are missing recipients in the payload
   * @param options.sendAsProtobuf?
   * @param options.onClientMismatch? Called when a mismatch happens on the server
   * @return the ClientMismatch status returned by the backend
   */
  public async sendMessage(
    sendingClientId: string,
    recipients: UserClients | UserPreKeyBundleMap,
    plainText: Uint8Array,
    options: {
      conversationId?: QualifiedId;
      reportMissing?: boolean | string[];
      sendAsProtobuf?: boolean;
      nativePush?: boolean;
      onClientMismatch?: (mismatch: ClientMismatch) => void | boolean | Promise<boolean>;
    } = {},
  ): Promise<ClientMismatch & {errored?: boolean}> {
    let plainTextPayload = plainText;
    let cipherText: Uint8Array;
    if (this.shouldSendAsExternal(plainText, recipients)) {
      const externalPayload = await this.generateExternalPayload(plainText);
      plainTextPayload = externalPayload.text;
      cipherText = externalPayload.cipherText;
    }

    const {encrypted, missing} = await this.cryptographyService.encrypt(plainTextPayload, recipients);
    const encryptedPayload = Object.keys(missing).length
      ? await this.reencryptAfterMismatch({missing, deleted: {}}, encrypted, plainText)
      : encrypted;

    const send = (payload: OTRRecipients<Uint8Array>) => {
      return options.sendAsProtobuf
        ? this.sendOTRProtobufMessage(sendingClientId, payload, {...options, assetData: cipherText})
        : this.sendOTRMessage(sendingClientId, payload, {...options, assetData: cipherText});
    };
    try {
      return await send(encryptedPayload);
    } catch (error) {
      if (!this.isClientMismatchError(error)) {
        throw error;
      }
      const mismatch = error.response!.data as ClientMismatch;
      const shouldStopSending = options.onClientMismatch && (await options.onClientMismatch(mismatch)) === false;
      if (shouldStopSending) {
        return {...mismatch, errored: true};
      }
      const reEncryptedMessage = await this.reencryptAfterMismatch(mismatch, encryptedPayload, plainText);
      return send(reEncryptedMessage);
    }
  }

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
  public async sendFederatedMessage(
    sendingClientId: string,
    recipients: QualifiedUserClients | QualifiedUserPreKeyBundleMap,
    plainText: Uint8Array,
    options: {
      assetData?: Uint8Array;
      conversationId?: QualifiedId;
      reportMissing?: boolean | QualifiedId[];
      nativePush?: boolean;
      onClientMismatch?: (mismatch: MessageSendingStatus) => void | boolean | Promise<boolean>;
    },
  ): Promise<MessageSendingStatus & {errored?: boolean}> {
    const send = (payload: QualifiedOTRRecipients) => {
      return this.sendFederatedOtrMessage(sendingClientId, payload, options);
    };
    const {encrypted, missing} = await this.cryptographyService.encryptQualified(plainText, recipients);
    const encryptedPayload = Object.keys(missing).length
      ? await this.reencryptAfterFederatedMismatch({missing, deleted: {}}, encrypted, plainText)
      : encrypted;

    try {
      return await send(encryptedPayload);
    } catch (error) {
      if (!this.isClientMismatchError(error)) {
        throw error;
      }
      const mismatch = error.response!.data as MessageSendingStatus;
      const shouldStopSending = options.onClientMismatch && (await options.onClientMismatch(mismatch)) === false;
      if (shouldStopSending) {
        return {...mismatch, errored: true};
      }
      const reEncryptedPayload = await this.reencryptAfterFederatedMismatch(mismatch, encryptedPayload, plainText);
      return send(reEncryptedPayload);
    }
  }

  private async sendFederatedOtrMessage(
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
      return this.apiClient.api.broadcast.postBroadcastFederatedMessage(sendingClientId, protoMessage);
    }

    const {id, domain} = options.conversationId;

    return this.apiClient.api.conversation.postOTRMessageV2(id, domain, protoMessage);
  }

  private async sendOTRMessage(
    sendingClientId: string,
    recipients: OTRRecipients<Uint8Array>,
    options: {
      conversationId?: QualifiedId;
      assetData?: Uint8Array;
      reportMissing?: boolean | string[];
      nativePush?: boolean;
    },
  ): Promise<ClientMismatch> {
    const message: NewOTRMessage<string> = {
      data: options.assetData ? Encoder.toBase64(options.assetData).asString : undefined,
      recipients: CryptographyService.convertArrayRecipientsToBase64(recipients),
      sender: sendingClientId,
      native_push: options.nativePush,
    };

    let ignoreMissing;
    if (isStringArray(options.reportMissing)) {
      message.report_missing = options.reportMissing;
    } else {
      // By default we want ignore missing to be false (and have mismatch errors in case some clients are missing)
      ignoreMissing = typeof options.reportMissing === 'boolean' ? !options.reportMissing : false;
    }

    return !options.conversationId
      ? this.apiClient.api.broadcast.postBroadcastMessage(sendingClientId, message, ignoreMissing)
      : this.apiClient.api.conversation.postOTRMessage(
          sendingClientId,
          options.conversationId.id,
          message,
          ignoreMissing,
        );
  }

  private async generateExternalPayload(plainText: Uint8Array): Promise<{text: Uint8Array; cipherText: Uint8Array}> {
    const asset = await encryptAsset({plainText});
    const {cipherText, keyBytes, sha256} = asset;

    const externalMessage = {
      otrKey: new Uint8Array(keyBytes),
      sha256: new Uint8Array(sha256),
    };

    const genericMessage = GenericMessage.create({
      [GenericMessageType.EXTERNAL]: externalMessage,
      messageId: createId(),
    });

    return {text: GenericMessage.encode(genericMessage).finish(), cipherText};
  }

  private shouldSendAsExternal(plainText: Uint8Array, preKeyBundles: UserPreKeyBundleMap | UserClients): boolean {
    const EXTERNAL_MESSAGE_THRESHOLD_BYTES = 200 * 1024;

    let clientCount = 0;
    for (const user in preKeyBundles) {
      clientCount += Object.keys(preKeyBundles[user]).length;
    }

    const messageInBytes = new Uint8Array(plainText).length;
    const estimatedPayloadInBytes = clientCount * messageInBytes;

    return estimatedPayloadInBytes > EXTERNAL_MESSAGE_THRESHOLD_BYTES;
  }

  private isClientMismatchError(error: any): error is ClientMismatchError {
    return error.response?.status === HTTP_STATUS.PRECONDITION_FAILED;
  }

  private async reencryptAfterMismatch(
    mismatch: {missing: UserClients; deleted: UserClients},
    recipients: OTRRecipients<Uint8Array>,
    plainText: Uint8Array,
  ): Promise<OTRRecipients<Uint8Array>> {
    const deleted = flattenUserClients(mismatch.deleted);
    const missing = flattenUserClients(mismatch.missing);
    // remove deleted clients to the recipients
    deleted.forEach(({userId, data}) => data.forEach(clientId => delete recipients[userId.id][clientId]));
    if (missing.length) {
      const missingPreKeyBundles = await this.apiClient.api.user.postMultiPreKeyBundles(mismatch.missing);
      const {encrypted} = await this.cryptographyService.encrypt(plainText, missingPreKeyBundles);
      const reEncryptedPayloads = flattenUserClients<{[client: string]: Uint8Array}>(encrypted);
      // add missing clients to the recipients
      reEncryptedPayloads.forEach(({data, userId}) => (recipients[userId.id] = {...recipients[userId.id], ...data}));
    }
    return recipients;
  }

  /**
   * Will re-encrypt a message when there were some missing clients in the initial send (typically when the server replies with a client mismatch error)
   *
   * @param {ProtobufOTR.QualifiedNewOtrMessage} messageData The initial message that was sent
   * @param {MessageSendingStatus} messageSendingStatus Info about the missing/deleted clients
   * @param {Uint8Array} plainText The text that should be encrypted for the missing clients
   * @return resolves with a new message payload that can be sent
   */
  private async reencryptAfterFederatedMismatch(
    mismatch: {missing: QualifiedUserClients; deleted: QualifiedUserClients},
    recipients: QualifiedOTRRecipients,
    plainText: Uint8Array,
  ): Promise<QualifiedOTRRecipients> {
    const deleted = flattenQualifiedUserClients(mismatch.deleted);
    const missing = flattenQualifiedUserClients(mismatch.missing);
    // remove deleted clients to the recipients
    deleted.forEach(({userId, data}) =>
      data.forEach(clientId => delete recipients[userId.domain][userId.id][clientId]),
    );

    if (Object.keys(missing).length) {
      const missingPreKeyBundles = await this.apiClient.api.user.postQualifiedMultiPreKeyBundles(mismatch.missing);
      const {encrypted} = await this.cryptographyService.encryptQualified(plainText, missingPreKeyBundles);
      const reEncryptedPayloads = flattenQualifiedUserClients<{[client: string]: Uint8Array}>(encrypted);
      reEncryptedPayloads.forEach(
        ({data, userId}) => (recipients[userId.domain][userId.id] = {...recipients[userId.domain][userId.id], ...data}),
      );
    }
    return recipients;
  }

  private async sendOTRProtobufMessage(
    sendingClientId: string,
    recipients: OTRRecipients<Uint8Array>,
    options: {conversationId?: QualifiedId; assetData?: Uint8Array; reportMissing?: boolean | string[]},
  ): Promise<ClientMismatch> {
    const userEntries: ProtobufOTR.IUserEntry[] = Object.entries(recipients).map(([userId, otrClientMap]) => {
      const clients: ProtobufOTR.IClientEntry[] = Object.entries(otrClientMap).map(([clientId, payload]) => {
        return {
          client: {
            client: Long.fromString(clientId, 16),
          },
          text: payload,
        };
      });

      return {
        clients,
        user: {
          uuid: uuidToBytes(userId),
        },
      };
    });

    const protoMessage = ProtobufOTR.NewOtrMessage.create({
      recipients: userEntries,
      sender: {
        client: Long.fromString(sendingClientId, 16),
      },
    });

    let ignoreMissing;
    if (isStringArray(options.reportMissing)) {
      const encoder = new TextEncoder();
      protoMessage.reportMissing = options.reportMissing.map(userId => ({uuid: encoder.encode(userId)}));
    } else {
      // By default we want ignore missing to be false (and have mismatch errors in case some clients are missing)
      ignoreMissing = typeof options.reportMissing === 'boolean' ? !options.reportMissing : false;
    }

    if (options.assetData) {
      protoMessage.blob = options.assetData;
    }

    return !options.conversationId
      ? this.apiClient.api.broadcast.postBroadcastProtobufMessage(sendingClientId, protoMessage, ignoreMissing)
      : this.apiClient.api.conversation.postOTRProtobufMessage(
          sendingClientId,
          options.conversationId.id,
          protoMessage,
          ignoreMissing,
        );
  }
}
