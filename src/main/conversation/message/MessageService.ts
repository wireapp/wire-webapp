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
import {proteus as ProtobufOTR} from '@wireapp/protocol-messaging/web/otr';
import Long from 'long';
import {bytesToUUID, uuidToBytes} from '@wireapp/commons/src/main/util/StringUtil';
import {APIClient} from '@wireapp/api-client';
import {
  ClientMismatch,
  MessageSendingStatus,
  NewOTRMessage,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
  UserClients,
} from '@wireapp/api-client/src/conversation';
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
  ): Promise<ClientMismatch> {
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
        return await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, message, ignoreMissing);
      }
      return await this.apiClient.conversation.api.postOTRMessage(
        sendingClientId,
        conversationId,
        message,
        ignoreMissing,
      );
    } catch (error) {
      const reEncryptedMessage = await this.onClientMismatch(
        error as AxiosError,
        {...message, data: base64CipherText ? Decoder.fromBase64(base64CipherText).asBytes : undefined, recipients},
        plainTextArray,
      );
      return await this.apiClient.broadcast.api.postBroadcastMessage(sendingClientId, {
        data: reEncryptedMessage.data ? Encoder.toBase64(reEncryptedMessage.data).asString : undefined,
        recipients: CryptographyService.convertArrayRecipientsToBase64(reEncryptedMessage.recipients),
        sender: reEncryptedMessage.sender,
      });
    }
  }

  private checkFederatedClientsMismatch(
    messageData: ProtobufOTR.QualifiedNewOtrMessage,
    messageSendingStatus: MessageSendingStatus,
  ): MessageSendingStatus | null {
    const updatedMessageSendingStatus = {...messageSendingStatus};
    const sendingStatusKeys: (keyof Omit<typeof updatedMessageSendingStatus, 'time'>)[] = [
      'deleted',
      'failed_to_send',
      'missing',
      'redundant',
    ];

    if (messageData.ignoreOnly?.userIds?.length) {
      const allFailed: QualifiedUserClients = {
        ...messageSendingStatus.deleted,
        ...messageSendingStatus.failed_to_send,
        ...messageSendingStatus.missing,
        ...messageSendingStatus.redundant,
      };

      for (const [domainFailed, userClientsFailed] of Object.entries(allFailed)) {
        for (const userIdMissing of Object.keys(userClientsFailed)) {
          const userIsIgnored = messageData.ignoreOnly.userIds.find(({domain: domainIgnore, id: userIdIgnore}) => {
            return userIdIgnore === userIdMissing && domainIgnore === domainFailed;
          });
          if (userIsIgnored) {
            for (const sendingStatusKey of sendingStatusKeys) {
              delete updatedMessageSendingStatus[sendingStatusKey][domainFailed][userIdMissing];
            }
          }
        }
      }
    } else if (messageData.reportOnly?.userIds?.length) {
      for (const [reportDomain, reportUserId] of Object.entries(messageData.reportOnly.userIds)) {
        for (const sendingStatusKey of sendingStatusKeys) {
          for (const [domainDeleted, userClientsDeleted] of Object.entries(
            updatedMessageSendingStatus[sendingStatusKey],
          )) {
            for (const userIdDeleted of Object.keys(userClientsDeleted)) {
              if (userIdDeleted !== reportUserId.id && domainDeleted !== reportDomain) {
                delete updatedMessageSendingStatus[sendingStatusKey][domainDeleted][userIdDeleted];
              }
            }
          }
        }
      }
    } else if (!!messageData.ignoreAll) {
      // report nothing
      return null;
    }

    return updatedMessageSendingStatus;
  }

  public async sendFederatedOTRMessage(
    sendingClientId: string,
    conversationId: string,
    conversationDomain: string,
    recipients: QualifiedOTRRecipients,
    plainTextArray: Uint8Array,
    assetData?: Uint8Array,
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
    });

    if (assetData) {
      protoMessage.blob = assetData;
    }

    /*
     * When creating the PreKey bundles we already found out to which users we want to send a message, so we can ignore
     * missing clients. We have to ignore missing clients because there can be the case that there are clients that
     * don't provide PreKeys (clients from the Pre-E2EE era).
     */
    protoMessage.ignoreAll = {};

    const messageSendingStatus = await this.apiClient.conversation.api.postOTRMessageV2(
      conversationId,
      conversationDomain,
      protoMessage,
    );

    const federatedClientsMismatch = this.checkFederatedClientsMismatch(protoMessage, messageSendingStatus);

    if (federatedClientsMismatch) {
      const reEncryptedMessage = await this.onFederatedClientMismatch(
        protoMessage,
        federatedClientsMismatch,
        plainTextArray,
      );
      await this.apiClient.conversation.api.postOTRMessageV2(conversationId, conversationDomain, reEncryptedMessage);
    }
    return messageSendingStatus;
  }

  public async sendOTRProtobufMessage(
    sendingClientId: string,
    recipients: OTRRecipients<Uint8Array>,
    conversationId: string | null,
    plainTextArray: Uint8Array,
    assetData?: Uint8Array,
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
        return await this.apiClient.broadcast.api.postBroadcastProtobufMessage(
          sendingClientId,
          protoMessage,
          ignoreMissing,
        );
      }
      return await this.apiClient.conversation.api.postOTRProtobufMessage(
        sendingClientId,
        conversationId,
        protoMessage,
        ignoreMissing,
      );
    } catch (error) {
      const reEncryptedMessage = await this.onClientProtobufMismatch(error as AxiosError, protoMessage, plainTextArray);
      if (conversationId === null) {
        return await this.apiClient.broadcast.api.postBroadcastProtobufMessage(sendingClientId, reEncryptedMessage);
      }
      return await this.apiClient.conversation.api.postOTRProtobufMessage(
        sendingClientId,
        conversationId,
        reEncryptedMessage,
        ignoreMissing,
      );
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
    message: ProtobufOTR.NewOtrMessage,
    plainTextArray: Uint8Array,
  ): Promise<ProtobufOTR.NewOtrMessage> {
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

  private async onFederatedClientMismatch(
    messageData: ProtobufOTR.QualifiedNewOtrMessage,
    messageSendingStatus: MessageSendingStatus,
    plainTextArray: Uint8Array,
  ): Promise<ProtobufOTR.QualifiedNewOtrMessage> {
    // walk through deleted domain/user map
    for (const [deletedUserDomain, deletedUserIdClients] of Object.entries(messageSendingStatus.deleted)) {
      if (!messageData.recipients.find(recipient => recipient.domain === deletedUserDomain)) {
        // no user from this domain was deleted
        continue;
      }
      // walk through deleted user ids
      for (const [deletedUserId] of Object.entries(deletedUserIdClients)) {
        // walk through message recipients
        for (const recipientIndex in messageData.recipients) {
          // check if message recipients' domain is the same as the deleted user's domain
          if (messageData.recipients[recipientIndex].domain === deletedUserDomain) {
            // check if message recipients' id is the same as the deleted user's id
            for (const entriesIndex in messageData.recipients[recipientIndex].entries || []) {
              const uuid = messageData.recipients[recipientIndex].entries![entriesIndex].user?.uuid;
              if (!!uuid && bytesToUUID(uuid) === deletedUserId) {
                // delete this user from the message recipients
                delete messageData.recipients[recipientIndex].entries![entriesIndex];
              }
            }
          }
        }
      }
    }

    const missingUserIds = Object.entries(messageSendingStatus.missing);
    if (missingUserIds.length) {
      const missingPreKeyBundles = await this.apiClient.user.api.postQualifiedMultiPreKeyBundles(
        messageSendingStatus.missing,
      );
      const reEncryptedPayloads = await this.cryptographyService.encryptQualified(plainTextArray, missingPreKeyBundles);

      // walk through missing domain/user map
      for (const [missingUserDomain, missingUserIdClients] of missingUserIds) {
        if (!messageData.recipients.find(recipient => recipient.domain === missingUserDomain)) {
          // no user from this domain is missing
          continue;
        }

        // walk through missing user ids
        for (const [missingUserId, missingClientIds] of Object.entries(missingUserIdClients)) {
          // walk through message recipients
          for (const recipientIndex in messageData.recipients) {
            // check if message recipients' domain is the same as the missing user's domain
            if (messageData.recipients[recipientIndex].domain === missingUserDomain) {
              // check if there is a recipient with same user id as the missing user's id
              let userIndex = messageData.recipients[recipientIndex].entries?.findIndex(
                ({user}) => bytesToUUID(user.uuid) === missingUserId,
              );

              if (userIndex === -1) {
                // no recipient found, let's create it
                userIndex = messageData.recipients[recipientIndex].entries!.push({
                  user: {
                    uuid: uuidToBytes(missingUserId),
                  },
                });
              }

              const missingUserUUID = messageData.recipients[recipientIndex].entries![userIndex!].user.uuid;

              if (bytesToUUID(missingUserUUID) === missingUserId) {
                for (const missingClientId of missingClientIds) {
                  messageData.recipients[recipientIndex].entries![userIndex!].clients ||= [];
                  messageData.recipients[recipientIndex].entries![userIndex!].clients?.push({
                    client: {
                      client: Long.fromString(missingClientId, 16),
                    },
                    text: reEncryptedPayloads[missingUserDomain][missingUserId][missingClientId],
                  });
                }
              }
            }
          }
        }
      }
    }

    return messageData;
  }
}
