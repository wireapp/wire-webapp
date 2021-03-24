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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {AxiosError} from 'axios';
import {IUserEntry, IClientEntry, NewOtrMessage} from '@wireapp/protocol-messaging/web/otr';
import Long from 'long';
import {bytesToUUID, uuidToBytes} from '@wireapp/commons/src/main/util/StringUtil';
import {APIClient} from '@wireapp/api-client';
import {NewOTRMessage, OTRRecipients, UserClients} from '@wireapp/api-client/src/conversation';
import {Decoder, Encoder} from 'bazinga64';

import {CryptographyService} from '../../cryptography';

type ClientMismatchError = AxiosError<{
  deleted: UserClients;
  missing: UserClients;
}>;

export class MessageService {
  constructor(private readonly apiClient: APIClient, private readonly cryptographyService: CryptographyService) {}

  public async sendOTRMessage(
    sendingClientId: string,
    recipients: OTRRecipients<Uint8Array>,
    conversationId: string | null,
    plainTextArray: Uint8Array,
    base64CipherText?: string,
  ): Promise<void> {
    const message: NewOTRMessage<string> = {
      data: base64CipherText,
      recipients: CryptographyService.convertArrayRecipientsToBase64(recipients),
      sender: sendingClientId,
    };

    /*
     * When creating the PreKey bundles we already found out to which users we want to send a message, so we can ignore
     * missing clients. We have to ignore missing clients because there can be the case that there are clients that
     * don't provide PreKeys (clients from the Pre-E2EE era).
     */
    const ignoreMissing = true;

    try {
      if (conversationId === null) {
        await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, message, ignoreMissing);
      } else {
        await this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message, ignoreMissing);
      }
    } catch (error) {
      const reEncryptedMessage = await this.onClientMismatch(
        error,
        {...message, data: base64CipherText ? Decoder.fromBase64(base64CipherText).asBytes : undefined, recipients},
        plainTextArray,
      );
      await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, {
        data: reEncryptedMessage.data ? Encoder.toBase64(reEncryptedMessage.data).asString : undefined,
        recipients: CryptographyService.convertArrayRecipientsToBase64(reEncryptedMessage.recipients),
        sender: reEncryptedMessage.sender,
      });
    }
  }

  public async sendOTRProtobufMessage(
    sendingClientId: string,
    recipients: OTRRecipients<Uint8Array>,
    conversationId: string | null,
    plainTextArray: Uint8Array,
    assetData?: Uint8Array,
  ): Promise<void> {
    const userEntries: IUserEntry[] = Object.entries(recipients).map(([userId, otrClientMap]) => {
      const clients: IClientEntry[] = Object.entries(otrClientMap).map(([clientId, payload]) => {
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

    const protoMessage = NewOtrMessage.create({
      recipients: userEntries,
      sender: {
        client: Long.fromString(sendingClientId, 16),
      },
    });

    if (assetData) {
      protoMessage.blob = assetData;
    }

    /*
     * When creating the PreKey bundles we already found out to which users we want to send a message, so we can ignore
     * missing clients. We have to ignore missing clients because there can be the case that there are clients that
     * don't provide PreKeys (clients from the Pre-E2EE era).
     */
    const ignoreMissing = true;

    try {
      if (conversationId === null) {
        await this.apiClient.broadcast.api.postBroadcastProtobufMessage(sendingClientId, protoMessage, ignoreMissing);
      } else {
        await this.apiClient.conversation.api.postOTRProtobufMessage(
          sendingClientId,
          conversationId,
          protoMessage,
          ignoreMissing,
        );
      }
    } catch (error) {
      const reEncryptedMessage = await this.onClientProtobufMismatch(error, protoMessage, plainTextArray);
      await this.apiClient.broadcast.api.postBroadcastProtobufMessage(sendingClientId, reEncryptedMessage);
    }
  }

  private async onClientMismatch(
    error: AxiosError,
    message: NewOTRMessage<Uint8Array>,
    plainTextArray: Uint8Array,
  ): Promise<NewOTRMessage<Uint8Array>> {
    if (error.response?.status === HTTP_STATUS.PRECONDITION_FAILED) {
      const {missing, deleted} = (error as ClientMismatchError).response?.data!;

      const deletedUserIds = Object.keys(deleted);
      const missingUserIds = Object.keys(missing);

      if (deletedUserIds.length) {
        for (const deletedUserId of deletedUserIds) {
          for (const deletedClientId of deleted[deletedUserId]) {
            const deletedUser = message.recipients[deletedUserId];
            if (deletedUser) {
              delete deletedUser[deletedClientId];
            }
          }
        }
      }

      if (missingUserIds.length) {
        const missingPreKeyBundles = await this.apiClient.user.api.postMultiPreKeyBundles(missing);
        const reEncryptedPayloads = await this.cryptographyService.encrypt(plainTextArray, missingPreKeyBundles);
        for (const missingUserId of missingUserIds) {
          for (const missingClientId in reEncryptedPayloads[missingUserId]) {
            const missingUser = message.recipients[missingUserId];
            if (!missingUser) {
              message.recipients[missingUserId] = {};
            }

            message.recipients[missingUserId][missingClientId] = reEncryptedPayloads[missingUserId][missingClientId];
          }
        }
      }

      return message;
    }

    throw error;
  }

  private async onClientProtobufMismatch(
    error: AxiosError,
    message: NewOtrMessage,
    plainTextArray: Uint8Array,
  ): Promise<NewOtrMessage> {
    if (error.response?.status === HTTP_STATUS.PRECONDITION_FAILED) {
      const {missing, deleted} = (error as ClientMismatchError).response?.data!;

      const deletedUserIds = Object.keys(deleted);
      const missingUserIds = Object.keys(missing);

      if (deletedUserIds.length) {
        for (const deletedUserId of deletedUserIds) {
          for (const deletedClientId of deleted[deletedUserId]) {
            const deletedUserIndex = message.recipients.findIndex(({user}) => bytesToUUID(user.uuid) === deletedUserId);
            if (deletedUserIndex > -1) {
              const deletedClientIndex = message.recipients[deletedUserIndex].clients?.findIndex(({client}) => {
                return client.client.toString(16) === deletedClientId;
              });
              if (typeof deletedClientIndex !== 'undefined' && deletedClientIndex > -1) {
                delete message.recipients[deletedUserIndex].clients?.[deletedClientIndex!];
              }
            }
          }
        }
      }

      if (missingUserIds.length) {
        const missingPreKeyBundles = await this.apiClient.user.api.postMultiPreKeyBundles(missing);
        const reEncryptedPayloads = await this.cryptographyService.encrypt(plainTextArray, missingPreKeyBundles);
        for (const missingUserId of missingUserIds) {
          for (const missingClientId in reEncryptedPayloads[missingUserId]) {
            const missingUserIndex = message.recipients.findIndex(({user}) => bytesToUUID(user.uuid) === missingUserId);
            if (missingUserIndex === -1) {
              message.recipients.push({
                clients: [
                  {
                    client: {
                      client: Long.fromString(missingClientId, 16),
                    },
                    text: reEncryptedPayloads[missingUserId][missingClientId],
                  },
                ],
                user: {
                  uuid: uuidToBytes(missingUserId),
                },
              });
            }
          }
        }
      }

      return message;
    }

    throw error;
  }
}
