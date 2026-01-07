/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import type {APIClient} from '@wireapp/api-client/lib/APIClient';
import type {PreKey, Context} from '@wireapp/api-client/lib/auth';
import {
  isFederatedBackendsError,
  FederatedBackendsErrorLabel,
  NewConversation,
  QualifiedOTRRecipients,
  QualifiedUserClients,
} from '@wireapp/api-client/lib/conversation';
import type {ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import type {QualifiedId, QualifiedUserPreKeyBundleMap} from '@wireapp/api-client/lib/user';

import {LogFactory} from '@wireapp/commons';
import {CRUDEngine} from '@wireapp/store-engine';

import {CryptoClient} from './CryptoClient';
import {cryptoMigrationStore} from './cryptoMigrationStateStore';
import {generateDecryptionError} from './DecryptionErrorGenerator';
import {deleteIdentity} from './identityClearer';
import type {
  AddUsersToProteusConversationParams,
  ProteusServiceConfig,
  SendProteusMessageParams,
} from './ProteusService.types';
import {migrateToQualifiedSessionIds} from './sessionIdMigrator';
import {filterUsersFromDomains} from './userDomainFilters';

import {
  AddUsersFailureReasons,
  ProteusCreateConversationResponse,
  MessageSendingState,
  SendResult,
  ProteusAddUsersResponse,
} from '../../../conversation';
import {MessageService} from '../../../conversation/message/MessageService';
import {NonFederatingBackendsError} from '../../../errors';
import {HandledEventPayload} from '../../../notification';
import {handleOtrMessageAdd} from '../EventHandler/events';
import {getGenericMessageParams} from '../Utility/getGenericMessageParams';
import {isClearFromMismatch} from '../Utility/isClearFromMismatch';
import {
  buildEncryptedPayloads,
  constructSessionId,
  deleteSession,
  initSession,
  initSessions,
} from '../Utility/SessionHandler';

export type EncryptionResult = {
  /** the encrypted payloads for the clients that have a valid sessions */
  payloads: QualifiedOTRRecipients;
  /** user-client that do not have prekeys on backend (deleted clients) */
  unknowns?: QualifiedUserClients;
  /** users for whom we could retrieve a prekey and, thus, for which we could not encrypt the message */
  failed?: QualifiedId[];
};

export class ProteusService {
  private readonly messageService: MessageService;
  private readonly logger = LogFactory.getLogger('@wireapp/core/ProteusService');
  private readonly dbName: string;

  constructor(
    private readonly apiClient: APIClient,
    private readonly cryptoClient: CryptoClient,
    private readonly config: ProteusServiceConfig,
    private readonly storeEngine: CRUDEngine,
  ) {
    this.messageService = new MessageService(this.apiClient, this);
    this.dbName = storeEngine.storeName;
  }

  public async handleOtrMessageAddEvent(event: ConversationOtrMessageAddEvent): Promise<HandledEventPayload> {
    return handleOtrMessageAdd({
      event,
      proteusService: this,
    });
  }

  public async initClient(context: Context) {
    if (context.domain) {
      // We want sessions to be fully qualified from now on
      if (!cryptoMigrationStore.qualifiedSessions.isReady(this.dbName)) {
        this.logger.info(`Migrating existing session ids to qualified ids.`);
        await migrateToQualifiedSessionIds(this.storeEngine, context.domain);
        cryptoMigrationStore.qualifiedSessions.markAsReady(this.dbName);
        this.logger.info(`Successfully migrated session ids to qualified ids.`);
      }
    }

    const backendPrekeys = await this.apiClient.api.client.getClientPreKeys(context.clientId ?? '');
    const totalUsableBackedPrekeys = backendPrekeys.length - 1; // we remove the last resort prekey from the total number of available prekeys
    return this.cryptoClient.init(totalUsableBackedPrekeys);
  }

  public createClient(entropy?: Uint8Array) {
    return this.cryptoClient.create(this.config.nbPrekeys, entropy);
  }

  /**
   * Get the fingerprint of the local client.
   */
  public getLocalFingerprint() {
    return this.cryptoClient.getFingerprint();
  }

  public constructSessionId(userId: QualifiedId, clientId: string): string {
    return constructSessionId({clientId, userId});
  }

  /**
   * Get the fingerprint of a remote client
   * @param userId ID of user
   * @param clientId ID of client
   * @param prekey A prekey can be given to create a session if it doesn't already exist.
   *   If not provided and the session doesn't exists it will fetch a new prekey from the backend
   */
  public async getRemoteFingerprint(userId: QualifiedId, clientId: string, prekey?: PreKey) {
    const sessionId = await initSession(
      {userId, clientId, initialPrekey: prekey},
      {cryptoClient: this.cryptoClient, apiClient: this.apiClient},
    );
    return this.cryptoClient.getRemoteFingerprint(sessionId);
  }

  public async createConversation(conversationData: NewConversation): Promise<ProteusCreateConversationResponse> {
    try {
      const conversation = await this.apiClient.api.conversation.postConversation(conversationData);

      return {conversation};
    } catch (error: unknown) {
      if (isFederatedBackendsError(error)) {
        switch (error.label) {
          case FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS: {
            // In case we are trying to create a conversation with users from 2 backends that are not connected, we should stop the procedure and throw an error
            throw new NonFederatingBackendsError(error.backends);
          }
          case FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS: {
            const {backends} = error;
            const {excludedUsers: unreachableUsers, includedUsers: availableUsers} = filterUsersFromDomains(
              conversationData.qualified_users ?? [],
              backends,
            );
            conversationData = {...conversationData, qualified_users: availableUsers};
            // If conversation creation returns an error because a backend is offline,
            // we try creating the conversation again with users from available backends
            const response = await this.apiClient.api.conversation.postConversation(conversationData);

            return {
              conversation: response,
              failedToAdd:
                // on a succesfull conversation creation with the available users,
                // we append the users from an unreachable backend to the response
                unreachableUsers.length > 0
                  ? [{reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS, backends, users: unreachableUsers}]
                  : undefined,
            };
          }
        }
      }

      throw error;
    }
  }

  /**
   * Tries to add all the given users to the given conversation.
   * If some users are not reachable, it will try to add the remaining users and list them in the `failedToAdd` property of the response.
   */
  public async addUsersToConversation({
    conversationId,
    qualifiedUsers,
  }: AddUsersToProteusConversationParams): Promise<ProteusAddUsersResponse> {
    try {
      return {event: await this.apiClient.api.conversation.postMembers(conversationId, qualifiedUsers)};
    } catch (error) {
      const failureReasonsMap = {
        [FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS]: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
        [FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS]: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
      };

      if (isFederatedBackendsError(error)) {
        switch (error.label) {
          case FederatedBackendsErrorLabel.NON_FEDERATING_BACKENDS:
          case FederatedBackendsErrorLabel.UNREACHABLE_BACKENDS: {
            const {backends} = error;
            const {excludedUsers: unreachableUsers, includedUsers: availableUsers} = filterUsersFromDomains(
              qualifiedUsers,
              backends,
            );
            if (availableUsers.length === 0) {
              return {failedToAdd: [{reason: failureReasonsMap[error.label], backends, users: unreachableUsers}]};
            }
            // In case the request to add users failed with a `UNREACHABLE_BACKENDS` or `NOT_CONNECTED_BACKENDS` errors, we try again with the users from available backends
            try {
              const response = await this.apiClient.api.conversation.postMembers(conversationId, availableUsers);
              return {
                event: response,
                failedToAdd:
                  unreachableUsers.length > 0
                    ? [{reason: failureReasonsMap[error.label], backends, users: unreachableUsers}]
                    : undefined,
              };
            } catch (error) {
              if (isFederatedBackendsError(error)) {
                return {
                  failedToAdd: [
                    {
                      reason: failureReasonsMap[error.label],
                      backends: error.backends,
                      users: qualifiedUsers,
                    },
                  ],
                };
              }
              throw error;
            }
          }
        }
      }
      throw error;
    }
  }

  public async sendMessage({
    userIds,
    conversationId,
    nativePush,
    targetMode,
    payload,
    onClientMismatch,
  }: SendProteusMessageParams): Promise<SendResult> {
    const messageParams = await getGenericMessageParams({
      apiClient: this.apiClient,
      sendingClientId: this.apiClient.validatedClientId,
      conversationId,
      genericMessage: payload,
      options: {
        userIds,
        nativePush,
        targetMode,
      },
    });

    const {sendingClientId, recipients, plainText, options} = messageParams;
    const response = await this.messageService.sendMessage(sendingClientId, recipients, plainText, {
      ...options,
      onClientMismatch: mismatch => onClientMismatch?.(mismatch, false),
    });

    if (!response.canceled) {
      if (!isClearFromMismatch(response)) {
        // We warn the consumer that there is a mismatch that did not prevent message sending
        await onClientMismatch?.(response, true);
      }
      this.logger.log(`Successfully sent Proteus message to conversation '${conversationId.id}'`);
    }

    const sendingState = response.canceled ? MessageSendingState.CANCELED : MessageSendingState.OUTGOING_SENT;

    const failedToSend =
      response.failed || Object.keys(response.failed_to_confirm_clients ?? {}).length > 0
        ? {
            queued: response.failed_to_confirm_clients,
            failed: response.failed,
          }
        : undefined;

    return {
      id: payload.messageId,
      sentAt: response.time,
      state: sendingState,
      failedToSend,
    };
  }

  public async decrypt(encryptedText: Uint8Array, userId: QualifiedId, clientId: string) {
    const sessionId = this.constructSessionId(userId, clientId);
    const sessionExists = await this.cryptoClient.sessionExists(sessionId);

    try {
      const decryptedMessage: Uint8Array = !sessionExists
        ? await this.cryptoClient.sessionFromMessage(sessionId, encryptedText)
        : await this.cryptoClient.decrypt(sessionId, encryptedText);

      if (!sessionExists) {
        await this.cryptoClient.saveSession(sessionId);
        this.config.onNewClient?.({userId, clientId});
        this.logger.debug(`Created a new session from message for session ID "${sessionId}" and decrypted the message`);
      } else {
        this.logger.debug(`Decrypted message for session ID "${sessionId}"`);
      }

      return decryptedMessage;
    } catch (error) {
      throw generateDecryptionError({userId, clientId}, error);
    }
  }

  public consumePrekey(): Promise<void> {
    return this.cryptoClient.consumePrekey();
  }

  public deleteSession(userId: QualifiedId, clientId: string) {
    return deleteSession({
      userId,
      clientId,
      cryptoClient: this.cryptoClient,
    });
  }

  public async encrypt(
    plainText: Uint8Array,
    recipients: QualifiedUserPreKeyBundleMap | QualifiedUserClients,
  ): Promise<EncryptionResult> {
    const {sessions, unknowns, failed} = await initSessions({
      recipients,
      apiClient: this.apiClient,
      cryptoClient: this.cryptoClient,
      logger: this.logger,
    });

    const payloads = await this.cryptoClient.encrypt(sessions, plainText);

    return {
      payloads: buildEncryptedPayloads(payloads),
      unknowns,
      failed,
    };
  }

  async wipe() {
    await deleteIdentity(this.storeEngine);
  }
}
