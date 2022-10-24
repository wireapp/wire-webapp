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

import {
  AddProposalArgs,
  CommitBundle,
  ConversationConfiguration,
  ConversationId,
  CoreCrypto,
  DecryptedMessage,
  ExternalProposalArgs,
  ExternalProposalType,
  ExternalRemoveProposalArgs,
  Invitee,
  ProposalArgs,
  ProposalType,
  RemoveProposalArgs,
} from '@wireapp/core-crypto';
import {APIClient} from '@wireapp/api-client';
import {QualifiedUsers} from '../../conversation';
import {Converter, Decoder, Encoder} from 'bazinga64';
import {MLSCallbacks, MLSConfig} from '../types';
import {sendMessage} from '../../conversation/message/messageSender';
import {parseFullQualifiedClientId} from '../../util/fullyQualifiedClientIdUtils';
import {PostMlsMessageResponse} from '@wireapp/api-client/src/conversation';
//@todo: this function is temporary, we wait for the update from core-crypto side
//they are returning regular array instead of Uint8Array for commit and welcome messages
export const optionalToUint8Array = (array: Uint8Array | []): Uint8Array => {
  return Array.isArray(array) ? Uint8Array.from(array) : array;
};

export class MLSService {
  groupIdFromConversationId?: MLSCallbacks['groupIdFromConversationId'];

  constructor(
    public readonly config: MLSConfig | undefined,
    private readonly apiClient: APIClient,
    private readonly coreCryptoClientProvider: () => CoreCrypto | undefined,
  ) {}

  private get coreCryptoClient() {
    const client = this.coreCryptoClientProvider();
    if (!client) {
      throw new Error('Could not get coreCryptoClient');
    }
    return client;
  }

  private async uploadCommitBundle(groupId: Uint8Array, {commit, welcome}: CommitBundle) {
    if (commit) {
      try {
        const messageResponse = await this.apiClient.api.conversation.postMlsMessage(
          //@todo: it's temporary - we wait for core-crypto fix to return the actual Uint8Array instead of regular array
          optionalToUint8Array(commit),
        );
        await this.coreCryptoClient.commitAccepted(groupId);
        if (welcome) {
          // If the commit went well, we can send the Welcome
          //@todo: it's temporary - we wait for core-crypto fix to return the actual Uint8Array instead of regular array
          await this.apiClient.api.conversation.postMlsWelcomeMessage(optionalToUint8Array(welcome));
        }
        return messageResponse;
      } catch (error) {
        await this.coreCryptoClient.clearPendingCommit(groupId);
      }
    }
    return null;
  }

  public addUsersToExistingConversation(groupId: Uint8Array, invitee: Invitee[]) {
    return this.processCommitAction(groupId, () => this.coreCryptoClient.addClientsToConversation(groupId, invitee));
  }

  public configureMLSCallbacks({groupIdFromConversationId, ...coreCryptoCallbacks}: MLSCallbacks): void {
    this.coreCryptoClient.registerCallbacks({
      ...coreCryptoCallbacks,
      clientIdBelongsToOneOf: (client, otherClients) => {
        const decoder = new TextDecoder();
        const {user} = parseFullQualifiedClientId(decoder.decode(client));
        return otherClients.some(client => {
          const {user: otherUser} = parseFullQualifiedClientId(decoder.decode(client));
          return otherUser === user;
        });
      },
    });
    this.groupIdFromConversationId = groupIdFromConversationId;
  }

  public async getKeyPackagesPayload(qualifiedUsers: QualifiedUsers[]) {
    /**
     * @note We need to fetch key packages for all the users
     * we want to add to the new MLS conversations,
     * includes self user too.
     */
    const keyPackages = await Promise.all([
      ...qualifiedUsers.map(({id, domain, skipOwn}) =>
        this.apiClient.api.client.claimMLSKeyPackages(id, domain, skipOwn),
      ),
    ]);

    const coreCryptoKeyPackagesPayload = keyPackages.reduce<Invitee[]>((previousValue, currentValue) => {
      // skip users that have not uploaded their MLS key packages
      if (currentValue.key_packages.length > 0) {
        return [
          ...previousValue,
          ...currentValue.key_packages.map(keyPackage => ({
            id: Encoder.toBase64(keyPackage.client).asBytes,
            kp: Decoder.fromBase64(keyPackage.key_package).asBytes,
          })),
        ];
      }
      return previousValue;
    }, []);

    return coreCryptoKeyPackagesPayload;
  }

  public getEpoch(groupId: Uint8Array) {
    return this.coreCryptoClient.conversationEpoch(groupId);
  }

  public async newProposal(proposalType: ProposalType, args: ProposalArgs | AddProposalArgs | RemoveProposalArgs) {
    return this.coreCryptoClient.newProposal(proposalType, args);
  }

  public async newExternalProposal(
    externalProposalType: ExternalProposalType,
    args: ExternalProposalArgs | ExternalRemoveProposalArgs,
  ) {
    return this.coreCryptoClient.newExternalProposal(externalProposalType, args);
  }

  public async processWelcomeMessage(welcomeMessage: Uint8Array): Promise<ConversationId> {
    return this.coreCryptoClient.processWelcomeMessage(welcomeMessage);
  }

  public async decryptMessage(conversationId: ConversationId, payload: Uint8Array): Promise<DecryptedMessage> {
    return this.coreCryptoClient.decryptMessage(conversationId, payload);
  }

  public async encryptMessage(conversationId: ConversationId, message: Uint8Array): Promise<Uint8Array> {
    return this.coreCryptoClient.encryptMessage(conversationId, message);
  }

  /**
   * Will wrap a coreCrypto call that generates a CommitBundle and do all the necessary work so that commitbundle is handled the right way.
   * It does:
   *   - commit the pending proposal
   *   - then generates the commitBundle with the given function
   *   - uploads the commitBundle to backend
   *   - warns coreCrypto that the commit was successfully processed
   * @param groupId
   * @param generateCommit The function that will generate a coreCrypto CommitBundle
   */
  private async processCommitAction(groupId: ConversationId, generateCommit: () => Promise<CommitBundle>) {
    return sendMessage<PostMlsMessageResponse | null>(async () => {
      await this.commitPendingProposals(groupId);
      const commitBundle = await generateCommit();
      return this.uploadCommitBundle(groupId, commitBundle);
    });
  }

  public updateKeyingMaterial(conversationId: ConversationId) {
    return this.processCommitAction(conversationId, () => this.coreCryptoClient.updateKeyingMaterial(conversationId));
  }

  public async createConversation(
    conversationId: ConversationId,
    configuration?: ConversationConfiguration,
  ): Promise<any> {
    return this.coreCryptoClient.createConversation(conversationId, configuration);
  }

  public removeClientsFromConversation(conversationId: ConversationId, clientIds: Uint8Array[]) {
    return this.processCommitAction(conversationId, () =>
      this.coreCryptoClient.removeClientsFromConversation(conversationId, clientIds),
    );
  }

  public async commitPendingProposals(groupId: ConversationId): Promise<void> {
    const commitBundle = await this.coreCryptoClient.commitPendingProposals(groupId);
    return commitBundle ? void (await this.uploadCommitBundle(groupId, commitBundle)) : undefined;
  }

  public async conversationExists(conversationId: ConversationId): Promise<boolean> {
    return this.coreCryptoClient.conversationExists(conversationId);
  }

  public async clientValidKeypackagesCount(): Promise<number> {
    return this.coreCryptoClient.clientValidKeypackagesCount();
  }

  public async clientKeypackages(amountRequested: number): Promise<Uint8Array[]> {
    return this.coreCryptoClient.clientKeypackages(amountRequested);
  }

  /**
   * Will make the given client mls capable (generate and upload key packages)
   *
   * @param mlsClient Intance of the coreCrypto that represents the mls client
   * @param clientId The id of the client
   */
  public async uploadMLSPublicKeys(publicKey: Uint8Array, clientId: string) {
    return this.apiClient.api.client.putClient(clientId, {
      mls_public_keys: {ed25519: btoa(Converter.arrayBufferViewToBaselineString(publicKey))},
    });
  }

  public async uploadMLSKeyPackages(keypackages: Uint8Array[], clientId: string) {
    return this.apiClient.api.client.uploadMLSKeyPackages(
      clientId,
      keypackages.map(keypackage => btoa(Converter.arrayBufferViewToBaselineString(keypackage))),
    );
  }

  public async wipeConversation(conversationId: ConversationId): Promise<void> {
    return this.coreCryptoClient.wipeConversation(conversationId);
  }
}
