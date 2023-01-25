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

import {PostMlsMessageResponse, SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {Subconversation} from '@wireapp/api-client/lib/conversation/Subconversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import axios from 'axios';
import {Converter, Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';
import {TimeUtil} from '@wireapp/commons';
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

import {toProtobufCommitBundle} from './commitBundleUtil';
import {MLSServiceConfig, UploadCommitOptions} from './MLSService.types';
import {keyMaterialUpdatesStore} from './stores/keyMaterialUpdatesStore';
import {pendingProposalsStore} from './stores/pendingProposalsStore';
import {getGroupId, storeSubconversationGroupId} from './subconversationGroupIdMapper';

import {QualifiedUsers} from '../../../conversation';
import {sendMessage} from '../../../conversation/message/messageSender';
import {constructFullyQualifiedClientId, parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {cancelRecurringTask, registerRecurringTask} from '../../../util/RecurringTaskScheduler';
import {TaskScheduler} from '../../../util/TaskScheduler';
import {TypedEventEmitter} from '../../../util/TypedEventEmitter';
import {EventHandlerResult} from '../../common.types';
import {EventHandlerParams, handleBackendEvent} from '../EventHandler';
import {CommitPendingProposalsParams, HandlePendingProposalsParams, MLSCallbacks} from '../types';

//@todo: this function is temporary, we wait for the update from core-crypto side
//they are returning regular array instead of Uint8Array for commit and welcome messages
export const optionalToUint8Array = (array: Uint8Array | []): Uint8Array => {
  return Array.isArray(array) ? Uint8Array.from(array) : array;
};

const defaultConfig: MLSServiceConfig = {
  keyingMaterialUpdateThreshold: 1000 * 60 * 60 * 24 * 30, //30 days
  nbKeyPackages: 100,
};

type Events = {
  newEpoch: {epoch: number; groupId: string};
};

export class MLSService extends TypedEventEmitter<Events> {
  logger = logdown('@wireapp/core/MLSService');
  config: MLSServiceConfig;
  groupIdFromConversationId?: MLSCallbacks['groupIdFromConversationId'];

  constructor(
    private readonly apiClient: APIClient,
    private readonly coreCryptoClient: CoreCrypto,
    {
      keyingMaterialUpdateThreshold = defaultConfig.keyingMaterialUpdateThreshold,
      nbKeyPackages = defaultConfig.nbKeyPackages,
    }: Partial<MLSServiceConfig>,
  ) {
    super();
    this.config = {
      keyingMaterialUpdateThreshold,
      nbKeyPackages,
    };
  }

  public async initClient(userId: QualifiedId, clientId: string) {
    const encoder = new TextEncoder();
    const qualifiedClientId = constructFullyQualifiedClientId(userId.id, clientId, userId.domain);
    await this.coreCryptoClient.mlsInit(encoder.encode(qualifiedClientId));
  }

  public async createClient(userId: QualifiedId, clientId: string) {
    await this.initClient(userId, clientId);
    // If the device is new, we need to upload keypackages and public key to the backend
    const publicKey = await this.coreCryptoClient.clientPublicKey();
    const keyPackages = await this.coreCryptoClient.clientKeypackages(this.config.nbKeyPackages);
    await this.uploadMLSPublicKeys(publicKey, clientId);
    await this.uploadMLSKeyPackages(keyPackages, clientId);
  }

  private async uploadCommitBundle(
    groupId: Uint8Array,
    commitBundle: CommitBundle,
    {regenerateCommitBundle, isExternalCommit}: UploadCommitOptions = {},
  ): Promise<PostMlsMessageResponse | null> {
    const bundlePayload = toProtobufCommitBundle(commitBundle);
    try {
      const response = await this.apiClient.api.conversation.postMlsCommitBundle(bundlePayload.slice());
      if (isExternalCommit) {
        await this.coreCryptoClient.mergePendingGroupFromExternalCommit(groupId);
      } else {
        await this.coreCryptoClient.commitAccepted(groupId);
      }
      const newEpoch = await this.getEpoch(groupId);
      const groupIdStr = Encoder.toBase64(groupId).asString;

      this.emit('newEpoch', {epoch: newEpoch, groupId: groupIdStr});
      return response;
    } catch (error) {
      const shouldRetry = axios.isAxiosError(error) && error.code === '409';
      if (shouldRetry && regenerateCommitBundle) {
        // in case of a 409, we want to retry to generate the commit and resend it
        // could be that we are trying to upload a commit to a conversation that has a different epoch on backend
        // in this case we will most likely receive a commit from backend that will increase our local epoch
        this.logger.warn(`Uploading commitBundle failed. Will retry generating a new bundle`);
        const updatedCommitBundle = await regenerateCommitBundle();
        return this.uploadCommitBundle(groupId, updatedCommitBundle, {isExternalCommit});
      }
      if (isExternalCommit) {
        await this.coreCryptoClient.clearPendingGroupFromExternalCommit(groupId);
      } else {
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
      clientIsExistingGroupUser: (client, otherClients) => {
        const decoder = new TextDecoder();
        const {user} = parseFullQualifiedClientId(decoder.decode(client));
        return otherClients.some(client => {
          const {user: otherUser} = parseFullQualifiedClientId(decoder.decode(client));
          return otherUser.toLowerCase() === user.toLowerCase();
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

  public getEpoch(groupId: string | Uint8Array) {
    const groupIdBytes = typeof groupId === 'string' ? Decoder.fromBase64(groupId).asBytes : groupId;
    return this.coreCryptoClient.conversationEpoch(groupIdBytes);
  }

  public async newProposal(proposalType: ProposalType, args: ProposalArgs | AddProposalArgs | RemoveProposalArgs) {
    return this.coreCryptoClient.newProposal(proposalType, args);
  }

  public async joinByExternalCommit(getGroupInfo: () => Promise<Uint8Array>) {
    const generateCommit = async () => {
      const groupInfo = await getGroupInfo();
      const {conversationId, ...commitBundle} = await this.coreCryptoClient.joinByExternalCommit(groupInfo);
      return {groupId: conversationId, commitBundle};
    };
    const {commitBundle, groupId} = await generateCommit();
    return this.uploadCommitBundle(groupId, commitBundle, {
      isExternalCommit: true,
      regenerateCommitBundle: async () => (await generateCommit()).commitBundle,
    });
  }

  /**
   * Will join or register an mls subconversation for conference calls.
   * Will return the secret key derived from the subconversation
   *
   * @param conversationId Id of the parent conversation in which the call should happen
   */
  public async joinConferenceSubconversation(
    conversationId: QualifiedId,
  ): Promise<{subconversation: Subconversation; secretKey: string; keyLength: number}> {
    const subconversation = await this.apiClient.api.conversation.getSubconversation(
      conversationId,
      SUBCONVERSATION_ID.CONFERENCE,
    );
    if (subconversation.epoch === 0) {
      await this.registerConversation(subconversation.group_id, []);
    } else {
      //TODO: check timestamp, if subconv is older than 24h -> delete and re-create subconversation
      await this.joinByExternalCommit(() =>
        this.apiClient.api.conversation.getSubconversationGroupInfo(conversationId, SUBCONVERSATION_ID.CONFERENCE),
      );
    }

    // We store the mapping between the subconversation and the parent conversation
    storeSubconversationGroupId(conversationId, subconversation.subconv_id, subconversation.group_id);

    const keyLength = 32;
    const secretKey = await this.exportSecretKey(subconversation.group_id, keyLength);

    return {
      subconversation,
      secretKey,
      keyLength,
    };
  }

  private async exportSecretKey(groupId: string, keyLength: number): Promise<string> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const key = await this.coreCryptoClient.exportSecretKey(groupIdBytes, keyLength);
    return Encoder.toBase64(key).asString;
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
      await this.commitProposals(groupId);
      const commitBundle = await generateCommit();
      return this.uploadCommitBundle(groupId, commitBundle);
    });
  }

  public updateKeyingMaterial(conversationId: ConversationId) {
    return this.processCommitAction(conversationId, () => this.coreCryptoClient.updateKeyingMaterial(conversationId));
  }

  /**
   * Will create a conversation inside of coreCrypto.
   * @param groupId the id of the group to create inside of coreCrypto
   * @param users the list of users that will be members of the conversation (including the self user)
   * @param creator the creator of the list. Most of the time will be the self user (or empty if the conversation was created by backend first)
   */
  public async registerConversation(
    groupId: string,
    users: QualifiedId[],
    creator?: {user: QualifiedId; client?: string},
  ): Promise<PostMlsMessageResponse | null | undefined> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    const mlsKeys = (await this.apiClient.api.client.getPublicKeys()).removal;
    const mlsKeyBytes = Object.values(mlsKeys).map((key: string) => Decoder.fromBase64(key).asBytes);
    const configuration: ConversationConfiguration = {
      externalSenders: mlsKeyBytes,
      ciphersuite: 1, // TODO: Use the correct ciphersuite enum.
    };

    await this.coreCryptoClient.createConversation(groupIdBytes, configuration);

    const keyPackages = await this.getKeyPackagesPayload(
      users.map(user => {
        if (user.id === creator?.user.id) {
          /**
           * we should skip fetching key packages for current self client,
           * it's already added by the backend on the group creation time
           */
          return {...creator.user, skipOwn: creator.client};
        }
        return user;
      }),
    );

    const response =
      keyPackages.length > 0
        ? await this.addUsersToExistingConversation(groupIdBytes, keyPackages)
        : // If there are no clients to add, just update the keying material
          await this.processCommitAction(groupIdBytes, () => this.coreCryptoClient.updateKeyingMaterial(groupIdBytes));

    // We schedule a key material renewal
    this.scheduleKeyMaterialRenewal(groupId);

    return response;
  }

  public removeClientsFromConversation(conversationId: ConversationId, clientIds: Uint8Array[]) {
    return this.processCommitAction(conversationId, () =>
      this.coreCryptoClient.removeClientsFromConversation(conversationId, clientIds),
    );
  }

  private async commitProposals(groupId: ConversationId): Promise<void> {
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
   * Renew key material for a given groupId
   *
   * @param groupId groupId of the conversation
   */
  private async renewKeyMaterial(groupId: string) {
    try {
      const groupConversationExists = await this.conversationExists(Decoder.fromBase64(groupId).asBytes);

      if (!groupConversationExists) {
        keyMaterialUpdatesStore.deleteLastKeyMaterialUpdateDate({groupId});
        return;
      }

      const groupIdDecodedFromBase64 = Decoder.fromBase64(groupId).asBytes;
      await this.updateKeyingMaterial(groupIdDecodedFromBase64);
    } catch (error) {
      this.logger.error(`Error while renewing key material for groupId ${groupId}`, error);
    }
  }

  private createKeyMaterialUpdateTaskSchedulerId(groupId: string) {
    return `renew-key-material-update-${groupId}`;
  }

  /**
   * Will reset the renewal to the threshold given as config
   * @param groupId The group that should have its key material updated
   */
  public resetKeyMaterialRenewal(groupId: string) {
    cancelRecurringTask(this.createKeyMaterialUpdateTaskSchedulerId(groupId));
    this.scheduleKeyMaterialRenewal(groupId);
  }

  /**
   * Will schedule a task to update the key material of the conversation according to the threshold given as config
   * @param groupId
   */
  public scheduleKeyMaterialRenewal(groupId: string) {
    const key = this.createKeyMaterialUpdateTaskSchedulerId(groupId);

    registerRecurringTask({
      task: () => this.renewKeyMaterial(groupId),
      every: this.config.keyingMaterialUpdateThreshold,
      key,
    });
  }

  /**
   * Get all keying material last update dates and schedule tasks for renewal
   * Function must only be called once, after application start
   */
  public checkForKeyMaterialsUpdate() {
    try {
      const keyMaterialUpdateDates = keyMaterialUpdatesStore.getAllUpdateDates();
      keyMaterialUpdateDates.forEach(({groupId}) => this.scheduleKeyMaterialRenewal(groupId));
    } catch (error) {
      this.logger.error('Could not get last key material update dates', error);
    }
  }

  /**
   * Get date of last key packages count query and schedule a task to sync it with backend
   * Function must only be called once, after application start
   */
  public checkForKeyPackagesBackendSync() {
    registerRecurringTask({
      every: TimeUtil.TimeInMillis.DAY,
      key: 'try-key-packages-backend-sync',
      task: () => this.syncKeyPackages(),
    });
  }

  private async syncKeyPackages() {
    const validKeyPackagesCount = await this.clientValidKeypackagesCount();
    const minAllowedNumberOfKeyPackages = this.config.nbKeyPackages / 2;

    if (validKeyPackagesCount <= minAllowedNumberOfKeyPackages) {
      const clientId = this.apiClient.validatedClientId;

      //check numbers of keys on backend
      const backendKeyPackagesCount = await this.apiClient.api.client.getMLSKeyPackageCount(clientId);

      if (backendKeyPackagesCount <= minAllowedNumberOfKeyPackages) {
        //upload new keys
        const newKeyPackages = await this.clientKeypackages(this.config.nbKeyPackages);

        await this.uploadMLSKeyPackages(newKeyPackages, clientId);
      }
    }
  }

  /**
   * Will make the given client mls capable (generate and upload key packages)
   *
   * @param mlsClient Intance of the coreCrypto that represents the mls client
   * @param clientId The id of the client
   */
  private async uploadMLSPublicKeys(publicKey: Uint8Array, clientId: string) {
    return this.apiClient.api.client.putClient(clientId, {
      mls_public_keys: {ed25519: btoa(Converter.arrayBufferViewToBaselineString(publicKey))},
    });
  }

  private async uploadMLSKeyPackages(keypackages: Uint8Array[], clientId: string) {
    return this.apiClient.api.client.uploadMLSKeyPackages(
      clientId,
      keypackages.map(keypackage => btoa(Converter.arrayBufferViewToBaselineString(keypackage))),
    );
  }

  public async wipeConversation(conversationId: ConversationId): Promise<void> {
    return this.coreCryptoClient.wipeConversation(conversationId);
  }

  public async handleEvent(params: Omit<EventHandlerParams, 'mlsService'>): EventHandlerResult {
    return handleBackendEvent({...params, mlsService: this}, async groupId => {
      const newEpoch = await this.getEpoch(groupId);
      this.emit('newEpoch', {groupId, epoch: newEpoch});
    });
  }

  /**
   * If there is a matching conversationId => groupId pair in the database,
   * we can find the groupId and return it as a string
   *
   * @param conversationQualifiedId
   */
  public async getGroupIdFromConversationId(
    conversationQualifiedId: QualifiedId,
    subconversationId?: string,
  ): Promise<string> {
    const {id: conversationId, domain: conversationDomain} = conversationQualifiedId;
    const groupId = subconversationId
      ? getGroupId(conversationQualifiedId, subconversationId)
      : await this.groupIdFromConversationId?.(conversationQualifiedId);

    if (!groupId) {
      throw new Error(`Could not find a group_id for conversation ${conversationId}@${conversationDomain}`);
    }
    return groupId;
  }

  /**
   * If there are pending proposals, we need to either process them,
   * or save them in the database for later processing
   *
   * @param groupId groupId of the mls conversation
   * @param delayInMs delay in ms before processing proposals
   * @param eventTime time of the event that had the proposals
   */
  public async handlePendingProposals({delayInMs, groupId, eventTime}: HandlePendingProposalsParams) {
    if (delayInMs > 0) {
      const eventDate = new Date(eventTime);
      const firingDate = eventDate.setTime(eventDate.getTime() + delayInMs);

      pendingProposalsStore.storeItem({
        groupId,
        firingDate,
      });

      TaskScheduler.addTask({
        task: () => this.commitPendingProposals({groupId}),
        firingDate,
        key: groupId,
      });
    } else {
      await this.commitPendingProposals({groupId, skipDelete: true});
    }
  }

  /**
   * Commit all pending proposals for a given groupId
   *
   * @param groupId groupId of the conversation
   * @param skipDelete if true, do not delete the pending proposals from the database
   */
  public async commitPendingProposals({groupId, skipDelete = false}: CommitPendingProposalsParams) {
    try {
      await this.commitProposals(Decoder.fromBase64(groupId).asBytes);

      if (!skipDelete) {
        TaskScheduler.cancelTask(groupId);
        pendingProposalsStore.deleteItem({groupId});
      }
    } catch (error) {
      this.logger.error(`Error while committing pending proposals for groupId ${groupId}`, error);
    }
  }

  /**
   * Get all pending proposals from the database and schedule them
   * Function must only be called once, after application start
   *
   */
  public async checkExistingPendingProposals() {
    try {
      const pendingProposals = pendingProposalsStore.getAllItems();
      if (pendingProposals.length > 0) {
        pendingProposals.forEach(({groupId, firingDate}) =>
          TaskScheduler.addTask({
            task: () => this.commitPendingProposals({groupId}),
            firingDate,
            key: groupId,
          }),
        );
      }
    } catch (error) {
      this.logger.error('Could not get pending proposals', error);
    }
  }

  /**
   * Get all conversation members client ids.
   *
   * @param groupId groupId of the conversation
   */
  public async getClientIds(groupId: string): Promise<{userId: string; clientId: string; domain: string}[]> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const decoder = new TextDecoder();

    const rawClientIds = await this.coreCryptoClient.getClientIds(groupIdBytes);

    const clientIds = rawClientIds.map(id => {
      const {user, client, domain} = parseFullQualifiedClientId(decoder.decode(id));
      return {userId: user, clientId: client, domain};
    });
    return clientIds;
  }
}
