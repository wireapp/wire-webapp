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

import type {ClaimedKeyPackages, RegisteredClient} from '@wireapp/api-client/lib/client';
import {PostMlsMessageResponse, SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {ConversationMLSMessageAddEvent, ConversationMLSWelcomeEvent} from '@wireapp/api-client/lib/event';
import {BackendError, StatusCode} from '@wireapp/api-client/lib/http';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {exponentialBackoff} from '@wireapp/commons/lib/util/ExponentialBackoff';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';
import {Converter, Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';
import {TimeUtil, TypedEventEmitter} from '@wireapp/commons';
import {
  AddProposalArgs,
  Ciphersuite,
  CommitBundle,
  ConversationConfiguration,
  ConversationId,
  CoreCrypto,
  CredentialType,
  DecryptedMessage,
  ProposalArgs,
  ProposalType,
  RemoveProposalArgs,
} from '@wireapp/core-crypto';

import {isCoreCryptoMLSConversationAlreadyExistsError, shouldMLSDecryptionErrorBeIgnored} from './CoreCryptoMLSError';
import {MLSServiceConfig, NewCrlDistributionPointsPayload, UploadCommitOptions} from './MLSService.types';

import {KeyPackageClaimUser} from '../../../conversation';
import {sendMessage} from '../../../conversation/message/messageSender';
import {CoreDatabase} from '../../../storage/CoreDB';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {numberToHex} from '../../../util/numberToHex';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {TaskScheduler} from '../../../util/TaskScheduler';
import {AcmeChallenge, E2EIServiceExternal, User} from '../E2EIdentityService';
import {E2EIServiceInternal} from '../E2EIdentityService/E2EIServiceInternal';
import {handleMLSMessageAdd, handleMLSWelcomeMessage} from '../EventHandler/events';
import {
  deleteMLSMessagesQueue,
  queueIncomingMLSMessage,
  withLockedMLSMessagesQueue,
} from '../EventHandler/events/messageAdd';
import {ClientId, CommitPendingProposalsParams, HandlePendingProposalsParams} from '../types';
import {generateMLSDeviceId} from '../utils/MLSId';

//@todo: this function is temporary, we wait for the update from core-crypto side
//they are returning regular array instead of Uint8Array for commit and welcome messages
export const optionalToUint8Array = (array: Uint8Array | []): Uint8Array => {
  return Array.isArray(array) ? Uint8Array.from(array) : array;
};

type EnrollmentProcessState =
  | {
      status: 'authentication';
      authenticationChallenge: {keyAuth: string; challenge: AcmeChallenge};
    }
  | {status: 'successful'};

interface LocalMLSServiceConfig extends MLSServiceConfig {
  /**
   * minimum number of key packages client should have available (configured to half of nbKeyPackages)
   */
  minRequiredNumberOfAvailableKeyPackages: number;
}

const defaultConfig: MLSServiceConfig = {
  keyingMaterialUpdateThreshold: 1000 * 60 * 60 * 24 * 30, //30 days
  nbKeyPackages: 100,
  cipherSuite: Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519,
};

type Events = {
  newEpoch: {epoch: number; groupId: string};
  newCrlDistributionPoints: string[];
};
export class MLSService extends TypedEventEmitter<Events> {
  logger = logdown('@wireapp/core/MLSService');
  config: LocalMLSServiceConfig;
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  constructor(
    private readonly apiClient: APIClient,
    private readonly coreCryptoClient: CoreCrypto,
    private readonly coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
    {
      keyingMaterialUpdateThreshold = defaultConfig.keyingMaterialUpdateThreshold,
      nbKeyPackages = defaultConfig.nbKeyPackages,
      cipherSuite = defaultConfig.cipherSuite,
    }: Partial<MLSServiceConfig>,
  ) {
    super();
    this.config = {
      keyingMaterialUpdateThreshold,
      nbKeyPackages,
      cipherSuite,
      minRequiredNumberOfAvailableKeyPackages: Math.floor(nbKeyPackages / 2),
    };
  }

  public async initClient(userId: QualifiedId, client: RegisteredClient, blockKeypackageUpload = false) {
    await this.coreCryptoClient.mlsInit(
      generateMLSDeviceId(userId, client.id),
      [this.config.cipherSuite],
      this.config.nbKeyPackages,
    );

    await this.coreCryptoClient.registerCallbacks({
      // All authorization/membership rules are enforced on backend
      clientIsExistingGroupUser: async () => true,
      authorize: async () => true,
      userAuthorize: async () => true,
    });

    if (!blockKeypackageUpload) {
      // We need to make sure keypackages and public key are uploaded to the backend
      if (typeof client.mls_public_keys.ed25519 !== 'string' || client.mls_public_keys.ed25519.length === 0) {
        await this.uploadMLSPublicKeys(client);
      }
      await this.verifyRemoteMLSKeyPackagesAmount(client.id);
    } else {
      this.logger.info(`Blocked initial key package upload for client ${client.id} as E2EI is enabled`);
    }
  }

  private async getCredentialType() {
    return (await this.coreCryptoClient.e2eiIsEnabled(this.config.cipherSuite))
      ? CredentialType.X509
      : CredentialType.Basic;
  }

  private readonly uploadCommitBundle = async (
    groupId: Uint8Array,
    commitBundle: CommitBundle,
    {regenerateCommitBundle, isExternalCommit}: UploadCommitOptions = {},
  ): Promise<PostMlsMessageResponse> => {
    const groupIdStr = Encoder.toBase64(groupId).asString;

    const backoffKey = `upload-commit-bundle-409-${groupIdStr}`;
    const {backOff, resetBackOff} = exponentialBackoff(backoffKey, {
      maxDelay: TimeInMillis.SECOND * 32,
      minDelay: TimeInMillis.SECOND / 2,
    });

    // We need to lock the incoming mls messages queue while we are uploading the commit bundle
    // it's possible that we will be sent some mls messages before we receive the response from backend and accept a commit locally.
    return withLockedMLSMessagesQueue(groupIdStr, async () => {
      const {commit, groupInfo, welcome} = commitBundle;
      const bundlePayload = new Uint8Array([...commit, ...groupInfo.payload, ...(welcome || [])]);
      try {
        const response = await this.apiClient.api.conversation.postMlsCommitBundle(bundlePayload);

        if (isExternalCommit) {
          await this.coreCryptoClient.mergePendingGroupFromExternalCommit(groupId);
        } else {
          await this.coreCryptoClient.commitAccepted(groupId);
        }
        const newEpoch = await this.getEpoch(groupId);

        this.emit('newEpoch', {epoch: newEpoch, groupId: groupIdStr});

        // We need to reset the backoff after a successful request
        resetBackOff();
        return response;
      } catch (error) {
        if (isExternalCommit) {
          await this.coreCryptoClient.clearPendingGroupFromExternalCommit(groupId);
        } else {
          await this.coreCryptoClient.clearPendingCommit(groupId);
        }

        const shouldRetry = error instanceof BackendError && error.code === StatusCode.CONFLICT;

        if (shouldRetry && regenerateCommitBundle) {
          // in case of a 409, we want to retry to generate the commit and resend it
          // could be that we are trying to upload a commit to a conversation that has a different epoch on backend
          // in this case we will most likely receive a commit from backend that will increase our local epoch
          this.logger.warn(`Uploading commitBundle failed. Will retry generating a new bundle`);

          return backOff(
            async () => {
              const updatedCommitBundle = await regenerateCommitBundle();
              return this.uploadCommitBundle(groupId, updatedCommitBundle, {regenerateCommitBundle, isExternalCommit});
            },
            () => {
              this.logger.error('Uploading commit bundle retry limit reached', error);
              throw error;
            },
          );
        }
        throw error;
      }
    });
  };

  /**
   * Will add users to an existing MLS group and send a commit bundle to backend.
   * Cannot be called with an empty array of keys.
   *
   * @param groupId - the group id of the MLS group
   * @param keyPackages - the list of keys of clients to add to the MLS group
   */
  public addUsersToExistingConversation(groupId: string, keyPackages: Uint8Array[]) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    if (keyPackages.length < 1) {
      throw new Error('Empty list of keys provided to addUsersToExistingConversation');
    }
    return this.processCommitAction(groupIdBytes, async () => {
      const commitBundle = await this.coreCryptoClient.addClientsToConversation(groupIdBytes, keyPackages);
      this.dispatchNewCrlDistributionPoints(commitBundle);
      return commitBundle;
    });
  }

  public async getKeyPackagesPayload(qualifiedUsers: KeyPackageClaimUser[]) {
    /**
     * @note We need to fetch key packages for all the users
     * we want to add to the new MLS conversations,
     * includes self user too.
     */
    const failedToFetchKeyPackages: QualifiedId[] = [];
    const keyPackagesSettledResult = await Promise.allSettled(
      qualifiedUsers.map(({id, domain, skipOwnClientId}) =>
        this.apiClient.api.client
          .claimMLSKeyPackages(id, domain, numberToHex(this.config.cipherSuite), skipOwnClientId)
          .catch(error => {
            failedToFetchKeyPackages.push({id, domain});
            // Throw the error so we don't get {status: 'fulfilled', value: undefined}
            throw error;
          }),
      ),
    );

    /**
     * @note We are filtering failed requests for key packages
     * this is required because on federation environments it is possible
     * that due to a backend being offline we would not be able to fetch
     * a specific user's key packages.
     */
    const keyPackages = keyPackagesSettledResult
      .filter((result): result is PromiseFulfilledResult<ClaimedKeyPackages> => result.status === 'fulfilled')
      .map(result => result.value);

    const coreCryptoKeyPackagesPayload = keyPackages.reduce<Uint8Array[]>((previousValue, {key_packages}) => {
      // skip users that have not uploaded their MLS key packages
      if (key_packages.length > 0) {
        return [
          ...previousValue,
          ...key_packages.map(keyPackage => Decoder.fromBase64(keyPackage.key_package).asBytes),
        ];
      }
      return previousValue;
    }, []);

    return {coreCryptoKeyPackagesPayload, failedToFetchKeyPackages};
  }

  public getEpoch(groupId: string | Uint8Array) {
    const groupIdBytes = typeof groupId === 'string' ? Decoder.fromBase64(groupId).asBytes : groupId;
    return this.coreCryptoClient.conversationEpoch(groupIdBytes);
  }

  public async newProposal(proposalType: ProposalType, args: ProposalArgs | AddProposalArgs | RemoveProposalArgs) {
    return this.coreCryptoClient.newProposal(proposalType, args);
  }

  public async joinByExternalCommit(getGroupInfo: () => Promise<Uint8Array>) {
    const credentialType = await this.getCredentialType();
    const generateCommit = async () => {
      const groupInfo = await getGroupInfo();
      const joinRequest = await this.coreCryptoClient.joinByExternalCommit(groupInfo, credentialType);
      this.dispatchNewCrlDistributionPoints(joinRequest);
      const {conversationId, ...commitBundle} = joinRequest;
      return {groupId: conversationId, commitBundle};
    };
    const {commitBundle, groupId} = await generateCommit();
    const mlsResponse = await this.uploadCommitBundle(groupId, commitBundle, {
      isExternalCommit: true,
      regenerateCommitBundle: async () => (await generateCommit()).commitBundle,
    });

    if (mlsResponse) {
      //after we've successfully joined via external commit, we schedule periodic key material renewal
      const groupIdStr = Encoder.toBase64(groupId).asString;
      await this.scheduleKeyMaterialRenewal(groupIdStr);
    }

    return mlsResponse;
  }

  public async exportSecretKey(groupId: string, keyLength: number): Promise<string> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const key = await this.coreCryptoClient.exportSecretKey(groupIdBytes, keyLength);
    return Encoder.toBase64(key).asString;
  }

  private dispatchNewCrlDistributionPoints(payload: NewCrlDistributionPointsPayload) {
    const {crlNewDistributionPoints} = payload;
    if (crlNewDistributionPoints && crlNewDistributionPoints.length > 0) {
      this.emit('newCrlDistributionPoints', crlNewDistributionPoints);
    }
  }

  public async processWelcomeMessage(welcomeMessage: Uint8Array): Promise<ConversationId> {
    const welcomeBundle = await this.coreCryptoClient.processWelcomeMessage(welcomeMessage);
    this.dispatchNewCrlDistributionPoints(welcomeBundle);
    return welcomeBundle.id;
  }

  public async decryptMessage(conversationId: ConversationId, payload: Uint8Array): Promise<DecryptedMessage> {
    try {
      const decryptedMessage = await this.coreCryptoClient.decryptMessage(conversationId, payload);
      this.dispatchNewCrlDistributionPoints(decryptedMessage);
      return decryptedMessage;
    } catch (error) {
      // According to CoreCrypto JS doc on .decryptMessage method, we should ignore some errors (corecrypto handle them internally)
      if (shouldMLSDecryptionErrorBeIgnored(error)) {
        return {
          hasEpochChanged: false,
          isActive: false,
          proposals: [],
        };
      }
      throw error;
    }
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
    return sendMessage<PostMlsMessageResponse>(async () => {
      await this.commitProposals(groupId);
      const commitBundle = await generateCommit();
      return this.uploadCommitBundle(groupId, commitBundle, {regenerateCommitBundle: generateCommit});
    });
  }

  private updateKeyingMaterial(groupId: string) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    return this.processCommitAction(groupIdBytes, () => this.coreCryptoClient.updateKeyingMaterial(groupIdBytes));
  }

  /**
   * Will create an empty conversation inside of coreCrypto.
   * @param groupId the id of the group to create inside of coreCrypto
   */
  public async registerEmptyConversation(groupId: string): Promise<void> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    const mlsKeys = (await this.apiClient.api.client.getPublicKeys()).removal;
    const mlsKeyBytes = Object.values(mlsKeys).map((key: string) => Decoder.fromBase64(key).asBytes);
    const configuration: ConversationConfiguration = {
      externalSenders: mlsKeyBytes,
      ciphersuite: this.config.cipherSuite,
    };

    const credentialType = await this.getCredentialType();
    return this.coreCryptoClient.createConversation(groupIdBytes, credentialType, configuration);
  }

  /**
   * Will create a conversation inside of coreCrypto, add users to it or update the keying material if empty key packages list is provided.
   * @param groupId the id of the group to create inside of coreCrypto
   * @param users the list of users that will be members of the conversation (including the self user)
   * @param creator the creator of the list. Most of the time will be the self user (or empty if the conversation was created by backend first)
   */
  public async registerConversation(
    groupId: string,
    users: QualifiedId[],
    creator?: {user: QualifiedId; client?: string},
  ): Promise<PostMlsMessageResponse> {
    await this.registerEmptyConversation(groupId);

    const {coreCryptoKeyPackagesPayload: keyPackages, failedToFetchKeyPackages} = await this.getKeyPackagesPayload(
      users.map(user => {
        if (user.id === creator?.user.id) {
          /**
           * we should skip fetching key packages for current self client,
           * it's already added by the backend on the group creation time
           */
          return {...creator.user, skipOwnClientId: creator.client};
        }
        return user;
      }),
    );

    const response =
      keyPackages.length > 0
        ? await this.addUsersToExistingConversation(groupId, keyPackages)
        : // If there are no clients to add, just update the keying material
          await this.updateKeyingMaterial(groupId);

    // We schedule a periodic key material renewal
    await this.scheduleKeyMaterialRenewal(groupId);

    /**
     * @note If we can't fetch a user's key packages then we can not add them to mls conversation
     * so we're adding them to the list of failed users.
     */
    response.failed = response.failed ? [...response.failed, ...failedToFetchKeyPackages] : failedToFetchKeyPackages;
    return response;
  }

  /**
   * Will try to register mls group and send an empty commit to establish it.
   *
   * @param groupId - id of the MLS group
   * @returns true if the client has successfully established the group, false otherwise
   */
  public readonly tryEstablishingMLSGroup = async (groupId: string): Promise<boolean> => {
    this.logger.info(`Trying to establish a MLS group with id ${groupId}.`);

    // Before trying to register a group, check if the group is already established locally.
    // We could have received a welcome message in the meantime.
    const doesMLSGroupExistLocally = await this.conversationExists(groupId);
    if (doesMLSGroupExistLocally) {
      this.logger.info(`MLS Group with id ${groupId} already exists, skipping the initialisation.`);
      return false;
    }

    try {
      await this.registerConversation(groupId, []);
      return true;
    } catch (error) {
      // If conversation already existed, locally, nothing more to do, we've received a welcome message.
      if (isCoreCryptoMLSConversationAlreadyExistsError(error)) {
        this.logger.info(`MLS Group with id ${groupId} already exists, skipping the initialisation.`);
        return false;
      }

      this.logger.info(`MLS Group with id ${groupId} was not established succesfully, wiping the group locally...`);
      // Otherwise it's a backend error. Somebody else might have created the group in the meantime.
      // We should wipe the group locally, wait for the welcome message or join later via external commit.
      await this.wipeConversation(groupId);
      return false;
    }
  };

  /**
   * Will send a removal commit for given clients
   * @param groupId groupId of the conversation
   * @param clientIds the list of **qualified** ids of the clients we want to remove from the group
   */
  public removeClientsFromConversation(groupId: string, clientIds: ClientId[]) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    return this.processCommitAction(groupIdBytes, () =>
      this.coreCryptoClient.removeClientsFromConversation(
        groupIdBytes,
        clientIds.map(id => this.textEncoder.encode(id)),
      ),
    );
  }

  private async commitProposals(groupId: ConversationId): Promise<void> {
    const commitBundle = await this.coreCryptoClient.commitPendingProposals(groupId);
    return commitBundle ? void (await this.uploadCommitBundle(groupId, commitBundle)) : undefined;
  }

  /**
   * Will check if mls group exists in corecrypto.
   * @param groupId groupId of the conversation
   */
  public async conversationExists(groupId: string): Promise<boolean> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    return this.coreCryptoClient.conversationExists(groupIdBytes);
  }

  /**
   * Will check if mls group is established in coreCrypto.
   * Group is established after the first commit was sent in the group and epoch number is at least 1.
   * @param groupId groupId of the conversation
   */
  public async isConversationEstablished(groupId: string): Promise<boolean> {
    const doesConversationExist = await this.conversationExists(groupId);
    return doesConversationExist && (await this.getEpoch(groupId)) > 0;
  }

  public async clientValidKeypackagesCount(): Promise<number> {
    const credentialType = await this.getCredentialType();
    return this.coreCryptoClient.clientValidKeypackagesCount(this.config.cipherSuite, credentialType);
  }

  public async clientKeypackages(amountRequested: number): Promise<Uint8Array[]> {
    const credentialType = await this.getCredentialType();
    return this.coreCryptoClient.clientKeypackages(this.config.cipherSuite, credentialType, amountRequested);
  }

  /**
   * Will send an empty commit into a group (renew key material)
   *
   * @param groupId groupId of the conversation
   */
  public async renewKeyMaterial(groupId: string) {
    try {
      const groupConversationExists = await this.conversationExists(groupId);

      if (!groupConversationExists) {
        return this.cancelKeyMaterialRenewal(groupId);
      }

      await this.updateKeyingMaterial(groupId);
    } catch (error) {
      this.logger.error(`Error while renewing key material for groupId ${groupId}`, error);
    }
  }

  private createKeyMaterialUpdateTaskSchedulerId(groupId: string) {
    return `renew-key-material-update-${groupId}` as const;
  }

  /**
   * Will reset the renewal to the threshold given as config
   * @param groupId The group that should have its key material updated
   */
  public async resetKeyMaterialRenewal(groupId: string) {
    await this.cancelKeyMaterialRenewal(groupId);
    await this.scheduleKeyMaterialRenewal(groupId);
  }

  /**
   * Will cancel the renewal of the key material for a given groupId
   * @param groupId The group that should stop having its key material updated
   */
  private cancelKeyMaterialRenewal(groupId: string) {
    return this.recurringTaskScheduler.cancelTask(this.createKeyMaterialUpdateTaskSchedulerId(groupId));
  }

  /**
   * Will schedule a task to update the key material of the conversation according to the threshold given as config
   * @param groupId
   */
  public scheduleKeyMaterialRenewal(groupId: string) {
    const key = this.createKeyMaterialUpdateTaskSchedulerId(groupId);

    return this.recurringTaskScheduler.registerTask({
      task: () => this.renewKeyMaterial(groupId),
      every: this.config.keyingMaterialUpdateThreshold,
      key,
    });
  }

  /**
   * Get all keying material last update dates and schedule tasks for renewal
   * Function must only be called once, after application start
   */
  public schedulePeriodicKeyMaterialRenewals(groupIds: string[]) {
    try {
      groupIds.forEach(groupId => this.scheduleKeyMaterialRenewal(groupId));
    } catch (error) {
      this.logger.error('Could not get last key material update dates', error);
    }
  }

  /**
   * Schedules a task to periodically (every 24h) check if new key packages should be generated and uploaded to backend.
   * Function must only be called once, after application start
   * @param clientId id of the client
   */
  public schedulePeriodicKeyPackagesBackendSync(clientId: string) {
    return this.recurringTaskScheduler.registerTask({
      every: TimeUtil.TimeInMillis.DAY,
      key: 'try-key-packages-backend-sync',
      task: () => this.verifyRemoteMLSKeyPackagesAmount(clientId),
    });
  }

  /**
   * Checks if there are enough key packages locally and if not,
   * checks the number of keys available on backend and (if needed) generates new keys and uploads them.
   * @param clientId id of the client
   */
  private async verifyLocalMLSKeyPackagesAmount(clientId: string) {
    const keyPackagesCount = await this.clientValidKeypackagesCount();

    if (keyPackagesCount <= this.config.minRequiredNumberOfAvailableKeyPackages) {
      return this.verifyRemoteMLSKeyPackagesAmount(clientId);
    }
  }

  private async verifyRemoteMLSKeyPackagesAmount(clientId: string) {
    const backendKeyPackagesCount = await this.getRemoteMLSKeyPackageCount(clientId);

    // If we have enough keys uploaded on backend, there's no need to upload more.
    if (backendKeyPackagesCount > this.config.minRequiredNumberOfAvailableKeyPackages) {
      return;
    }

    const keyPackages = await this.clientKeypackages(this.config.nbKeyPackages);
    return this.uploadMLSKeyPackages(clientId, keyPackages);
  }

  private async getRemoteMLSKeyPackageCount(clientId: string) {
    return this.apiClient.api.client.getMLSKeyPackageCount(clientId, numberToHex(this.config.cipherSuite));
  }

  /**
   * Will update the given client on backend with its public key.
   *
   * @param mlsClient Intance of the coreCrypto that represents the mls client
   * @param client Backend client data
   */
  private async uploadMLSPublicKeys(client: RegisteredClient) {
    // If we've already updated a client with its public key, there's no need to do it again.
    const publicKey = await this.coreCryptoClient.clientPublicKey(this.config.cipherSuite);
    return this.apiClient.api.client.putClient(client.id, {
      mls_public_keys: {ed25519: btoa(Converter.arrayBufferViewToBaselineString(publicKey))},
    });
  }

  private async uploadMLSKeyPackages(clientId: string, keyPackages: Uint8Array[]) {
    return this.apiClient.api.client.uploadMLSKeyPackages(
      clientId,
      keyPackages.map(keyPackage => btoa(Converter.arrayBufferViewToBaselineString(keyPackage))),
    );
  }

  public async wipeConversation(groupId: string): Promise<void> {
    deleteMLSMessagesQueue(groupId);
    await this.cancelKeyMaterialRenewal(groupId);
    await this.cancelPendingProposalsTask(groupId);

    const doesConversationExist = await this.conversationExists(groupId);
    if (!doesConversationExist) {
      //if the mls group does not exist, we don't need to wipe it
      return;
    }

    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    return this.coreCryptoClient.wipeConversation(groupIdBytes);
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

      await this.schedulePendingProposalsTask(groupId, firingDate);
    } else {
      await this.commitPendingProposals({groupId, skipDelete: true});
    }
  }

  private async schedulePendingProposalsTask(groupId: string, firingDate: number) {
    await this.coreDatabase.put('pendingProposals', {groupId, firingDate}, groupId);

    TaskScheduler.addTask({
      task: () => this.commitPendingProposals({groupId}),
      firingDate,
      key: this.createPendingProposalsTaskKey(groupId),
    });
  }

  private async cancelPendingProposalsTask(groupId: string) {
    TaskScheduler.cancelTask(this.createPendingProposalsTaskKey(groupId));
    await this.coreDatabase.delete('pendingProposals', groupId);
  }

  private createPendingProposalsTaskKey(groupId: string) {
    return `pending-proposals-${groupId}` as const;
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
        await this.cancelPendingProposalsTask(groupId);
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
  public async initialisePendingProposalsTasks() {
    try {
      const pendingProposals = await this.coreDatabase.getAll('pendingProposals');
      if (pendingProposals.length > 0) {
        pendingProposals.forEach(({groupId, firingDate}) =>
          TaskScheduler.addTask({
            task: () => this.commitPendingProposals({groupId}),
            firingDate,
            key: this.createPendingProposalsTaskKey(groupId),
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
  public async getClientIds(groupId: string): Promise<{userId: string; clientId: ClientId; domain: string}[]> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    const rawClientIds = await this.coreCryptoClient.getClientIds(groupIdBytes);

    const clientIds = rawClientIds.map(id => {
      const {user, client, domain} = parseFullQualifiedClientId(this.textDecoder.decode(id));
      return {userId: user, clientId: client, domain};
    });
    return clientIds;
  }

  public async handleMLSMessageAddEvent(
    event: ConversationMLSMessageAddEvent,
    groupIdFromConversationId: (
      conversationId: QualifiedId,
      subconversationId?: SUBCONVERSATION_ID,
    ) => Promise<string | undefined>,
  ) {
    const qualifiedConversationId = event.qualified_conversation ?? {id: event.conversation, domain: ''};

    const groupId = await groupIdFromConversationId(qualifiedConversationId, event.subconv);

    // We should not receive a message for a group the client is not aware of
    if (!groupId) {
      throw new Error(
        `Could not find a group_id for conversation ${qualifiedConversationId.id}@${qualifiedConversationId.domain}`,
      );
    }

    return queueIncomingMLSMessage(groupId, () => handleMLSMessageAdd({event, mlsService: this, groupId}));
  }

  public async handleMLSWelcomeMessageEvent(event: ConversationMLSWelcomeEvent, clientId: string) {
    // Every time we've received a welcome message, it means that our key package was consumed,
    // we need to verify if we need to upload new ones.
    // Note that this has to be done before we even process the welcome message (even if it fails),
    // receiving a welcome message means that one of our key packages on backend was claimed.
    try {
      await this.verifyLocalMLSKeyPackagesAmount(clientId);
    } catch {
      this.logger.error('Failed to verify the amount of MLS key packages');
    }

    return handleMLSWelcomeMessage({event, mlsService: this});
  }

  public async deleteMLSKeyPackages(clientId: ClientId, keyPackagRefs: Uint8Array[]) {
    return this.apiClient.api.client.deleteMLSKeyPackages(
      clientId,
      keyPackagRefs.map(keypackage => btoa(Converter.arrayBufferViewToBaselineString(keypackage))),
    );
  }

  // E2E Identity Service related methods below this line

  /**
   *
   * @param discoveryUrl URL of the acme server
   * @param user User object
   * @param clientId The client id of the current device
   * @param nbPrekeys Amount of prekeys to generate
   * @param oAuthIdToken The OAuth id token if the user is already authenticated
   * @returns AcmeChallenge if the user is not authenticated, true if the user is authenticated
   */
  public async enrollE2EI(
    discoveryUrl: string,
    e2eiServiceExternal: E2EIServiceExternal,
    user: User,
    client: RegisteredClient,
    nbPrekeys: number,
    certificateTtl: number,
    oAuthIdToken?: string,
  ): Promise<EnrollmentProcessState> {
    const hasActiveCertificate = await this.coreCryptoClient.e2eiIsEnabled(this.config.cipherSuite);
    const instance = await E2EIServiceInternal.getInstance({
      apiClient: this.apiClient,
      coreCryptClient: this.coreCryptoClient,
      e2eiServiceExternal,
      user,
      clientId: client.id,
      discoveryUrl,
      keyPackagesAmount: nbPrekeys,
      dispatchNewCrlDistributionPoints: payload => this.dispatchNewCrlDistributionPoints(payload),
      certificateTtl,
    });

    // If we don't have an OAuth id token, we need to start the certificate process with Oauth
    if (!oAuthIdToken) {
      const data = await instance.startCertificateProcess(hasActiveCertificate);
      const oidcChallenge = data.challenge;
      if (!oidcChallenge) {
        throw new Error('Not oidc challenge found');
      }
      return {status: 'authentication', authenticationChallenge: data};
    }

    // If we have an OAuth id token, we can continue the certificate process / start a refresh
    const rotateBundle = !hasActiveCertificate
      ? // If we are not refreshing the active certificate, we need to continue the certificate process with Oauth
        await instance.continueCertificateProcess(oAuthIdToken)
      : // If we are refreshing the active certificate, can start the refresh process
        await instance.renewCertificate(oAuthIdToken, hasActiveCertificate);

    if (rotateBundle === undefined) {
      throw new Error('Could not get the rotate bundle');
    }
    this.dispatchNewCrlDistributionPoints(rotateBundle);
    // upload the clients public keys
    if (!hasActiveCertificate) {
      // we only upload public keys for the initial certification process. Renewals do not need to upload new public keys
      await this.uploadMLSPublicKeys(client);
    }
    // Remove old key packages
    await this.deleteMLSKeyPackages(client.id, rotateBundle.keyPackageRefsToRemove);
    // Upload new key packages with x509 certificate
    await this.uploadMLSKeyPackages(client.id, rotateBundle.newKeyPackages);
    // Verify that we have enough key packages
    await this.verifyRemoteMLSKeyPackagesAmount(client.id);
    // Update keying material
    for (const [groupId, commitBundle] of rotateBundle.commits) {
      const groupIdAsBytes = Converter.hexStringToArrayBufferView(groupId);
      // manual copy of the commit bundle data because of a problem while cloning it
      const newCommitBundle = {
        commit: commitBundle.commit,
        // @ts-ignore
        groupInfo: commitBundle?.group_info || commitBundle.groupInfo,
        welcome: commitBundle?.welcome,
      };

      await this.uploadCommitBundle(groupIdAsBytes, newCommitBundle);
    }
    return {status: 'successful'};
  }
}
