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

import type {ClaimedKeyPackages, MLSPublicKeyRecord, RegisteredClient} from '@wireapp/api-client/lib/client';
import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation';
import {ConversationMLSMessageAddEvent, ConversationMLSWelcomeEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {Converter, Decoder, Encoder} from 'bazinga64';

import {APIClient} from '@wireapp/api-client';
import {LogFactory, TimeUtil, TypedEventEmitter} from '@wireapp/commons';
import {
  Ciphersuite,
  CommitBundle,
  ConversationConfiguration,
  ConversationId,
  CoreCrypto,
  CredentialType,
  DecryptedMessage,
  EpochObserver,
  MlsTransport,
  MlsTransportResponse,
  NewCrlDistributionPoints,
} from '@wireapp/core-crypto';

import {ClientMLSError, ClientMLSErrorLabel} from './ClientMLSError';
import {isCoreCryptoMLSConversationAlreadyExistsError, shouldMLSDecryptionErrorBeIgnored} from './CoreCryptoMLSError';

import {AddUsersFailure, AddUsersFailureReasons, KeyPackageClaimUser} from '../../../conversation';
import {CoreDatabase} from '../../../storage/CoreDB';
import {parseFullQualifiedClientId} from '../../../util/fullyQualifiedClientIdUtils';
import {numberToHex} from '../../../util/numberToHex';
import {RecurringTaskScheduler} from '../../../util/RecurringTaskScheduler';
import {TaskScheduler} from '../../../util/TaskScheduler';
import {User} from '../E2EIdentityService';
import {
  E2EIServiceInternal,
  getAllConversationsCallback,
  getTokenCallback,
} from '../E2EIdentityService/E2EIServiceInternal';
import {
  getMLSDeviceStatus,
  getSignatureAlgorithmForCiphersuite,
  isMLSDevice,
  MLSDeviceStatus,
} from '../E2EIdentityService/Helper';
import {handleMLSMessageAdd, handleMLSWelcomeMessage} from '../EventHandler/events';
import {ClientId, HandlePendingProposalsParams} from '../types';
import {generateMLSDeviceId} from '../utils/MLSId';

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

interface MLSConfig {
  /** List of ciphersuites that could be used for MLS */
  ciphersuites: Ciphersuite[];
  /** preferred ciphersuite to use */
  defaultCiphersuite: Ciphersuite;
  /**
   * (milliseconds) period of time between automatic updates of the keying material (30 days by default)
   */
  keyingMaterialUpdateThreshold: number;
  /**
   * number of key packages client should upload to the server (100 by default)
   */
  nbKeyPackages: number;
}
export type InitClientOptions = Optional<MLSConfig, 'keyingMaterialUpdateThreshold' | 'nbKeyPackages'> & {
  skipInitIdentity?: boolean;
};

//@todo: this function is temporary, we wait for the update from core-crypto side
//they are returning regular array instead of Uint8Array for commit and welcome messages
export const optionalToUint8Array = (array: Uint8Array | []): Uint8Array => {
  return Array.isArray(array) ? Uint8Array.from(array) : array;
};

const defaultConfig = {
  keyingMaterialUpdateThreshold: 1000 * 60 * 60 * 24 * 30, //30 days
  nbKeyPackages: 100,
};

export enum MLSServiceEvents {
  NEW_EPOCH = 'newEpoch',
  MLS_CLIENT_MISMATCH = 'mlsClientMismatch',
  NEW_CRL_DISTRIBUTION_POINTS = 'newCrlDistributionPoints',
  MLS_EVENT_DISTRIBUTED = 'mlsEventDistributed',
}

type Events = {
  [MLSServiceEvents.NEW_EPOCH]: {epoch: number; groupId: string};
  [MLSServiceEvents.NEW_CRL_DISTRIBUTION_POINTS]: string[];
  [MLSServiceEvents.MLS_CLIENT_MISMATCH]: void;
  [MLSServiceEvents.MLS_EVENT_DISTRIBUTED]: {
    events: any;
    time: string;
  };
};
export class MLSService extends TypedEventEmitter<Events> {
  logger = LogFactory.getLogger('@wireapp/core/MLSService');
  private _config?: MLSConfig;
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  constructor(
    private readonly apiClient: APIClient,
    private readonly coreCryptoClient: CoreCrypto,
    private readonly coreDatabase: CoreDatabase,
    private readonly recurringTaskScheduler: RecurringTaskScheduler,
  ) {
    super();

    const mlsTransport: MlsTransport = {
      sendCommitBundle: this._uploadCommitBundle,
      // Info: This is not used for now, but we need to implement it to be able to use the mls transport
      sendMessage: async () => {
        return 'success';
      },
    };

    const epochObserver: EpochObserver = {
      epochChanged: async (groupId, epoch) => {
        const groupIdStr = Encoder.toBase64(groupId).asString;
        this.logger.info(`Epoch changed for group ${groupIdStr}, new epoch: ${epoch}`);
        this.emit(MLSServiceEvents.NEW_EPOCH, {epoch, groupId: groupIdStr});
      },
    };

    void this.coreCryptoClient.registerEpochObserver(epochObserver);
    void this.coreCryptoClient.provideTransport(mlsTransport);
  }

  /**
   * return true if the MLS service if configured and ready to be used
   */
  get isEnabled() {
    return !!this._config;
  }

  get config() {
    if (!this._config) {
      throw new Error('mls config is not set, did you forget to call initClient?');
    }
    return this._config;
  }

  private get minRequiredKeyPackages() {
    return Math.floor(this.config.nbKeyPackages / 2);
  }

  /**
   * Will initialize an MLS client
   * @param userId the user owning the client
   * @param client id of the client to initialize
   * @param skipInitIdentity avoid registering the client's identity to the backend (needed for e2eidentity as the identity will be uploaded and signed only when enrollment is successful)
   */
  public async initClient(
    userId: QualifiedId,
    client: RegisteredClient,
    {skipInitIdentity, ...mlsConfig}: InitClientOptions,
  ): Promise<void> {
    // filter out undefined values from mlsConfig
    const filteredMLSConfig = Object.fromEntries(
      Object.entries(mlsConfig).filter(([_, value]) => value !== undefined),
    ) as typeof mlsConfig;

    this._config = {
      ...defaultConfig,
      ...filteredMLSConfig,
    };

    await this.coreCryptoClient.transaction(cx =>
      cx.mlsInit(generateMLSDeviceId(userId, client.id), this.config.ciphersuites, this.config.nbKeyPackages),
    );

    try {
      const ccClientSignature = await this.getCCClientSignatureString();
      const mlsDeviceStatus = getMLSDeviceStatus(client, this.config.defaultCiphersuite, ccClientSignature);

      switch (mlsDeviceStatus) {
        case MLSDeviceStatus.REGISTERED:
          if (!skipInitIdentity) {
            await this.verifyRemoteMLSKeyPackagesAmount(client.id);
          } else {
            this.logger.info(`Blocked initial key package upload for client ${client.id} as E2EI is enabled`);
          }
          break;
        case MLSDeviceStatus.MISMATCH:
          this.logger.error(`Client ${client.id} is registered but with a different signature`);
          this.emit(MLSServiceEvents.MLS_CLIENT_MISMATCH);
          break;
        case MLSDeviceStatus.FRESH:
          if (!skipInitIdentity) {
            await this.uploadMLSPublicKeys(client);
          } else {
            this.logger.info(`Blocked initial key package upload for client ${client.id} as E2EI is enabled`);
          }
          break;
      }
    } catch (error) {
      this.logger.error(`Error while initializing client ${client.id}`, error);
      throw error;
    }
  }

  /**
   * returns true if the client has a valid MLS identity in regard of the default ciphersuite set
   * @param client the client to check
   */
  public isInitializedMLSClient = (client: RegisteredClient) => isMLSDevice(client, this.config.defaultCiphersuite);

  private async getCredentialType() {
    return (await this.coreCryptoClient.e2eiIsEnabled(this.config.defaultCiphersuite))
      ? CredentialType.X509
      : CredentialType.Basic;
  }

  private readonly _uploadCommitBundle = async ({
    commit,
    groupInfo,
    welcome,
  }: CommitBundle): Promise<MlsTransportResponse> => {
    const bundlePayload = new Uint8Array([...commit, ...groupInfo.payload, ...(welcome || [])]);
    try {
      const response = await this.apiClient.api.conversation.postMlsCommitBundle(bundlePayload);

      if (response.failed_to_send) {
        this.logger.warn(`Failed to send commit bundle to backend`);
        return 'retry';
      }

      const {events, time} = response;

      this.emit(MLSServiceEvents.MLS_EVENT_DISTRIBUTED, {events, time});

      return 'success';
    } catch (error) {
      this.logger.error(`Failed to upload commit bundle`, error);
      return {
        abort: {reason: error instanceof Error ? error.message : 'unknown error'},
      };
    }
  };

  /**
   * Will add users to an existing MLS group and send a commit bundle to backend.
   * Cannot be called with an empty array of keys.
   *
   * @param groupId - the group id of the MLS group
   * @param keyPackages - the list of keys of clients to add to the MLS group
   */
  public async addUsersToExistingConversation(groupId: string, keyPackages: Uint8Array[]) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    if (keyPackages.length < 1) {
      throw new Error('Empty list of keys provided to addUsersToExistingConversation');
    }

    const crlNewDistributionPoints = await this.coreCryptoClient.transaction(cx =>
      cx.addClientsToConversation(groupIdBytes, keyPackages),
    );
    this.dispatchNewCrlDistributionPoints(crlNewDistributionPoints);
  }

  /**
   * Will return a list of client ids which are already in the group at core crypto level
   *
   * @param groupId - the group id of the MLS group
   * @returns list of client ids
   */
  public async getClientIdsInGroup(groupId: string) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const currentClientIdsInGroup = [];

    for (const clientId of await this.coreCryptoClient.getClientIds(groupIdBytes)) {
      // [user-id]:[client-id]@[domain] -> [client-id]
      // example: fb880fac-b549-4d8b-9398-4246324c7b85:67f41928e2844b6c@staging.zinfra.io -> 67f41928e2844b6c
      currentClientIdsInGroup.push(Converter.arrayBufferViewToStringUTF8(clientId).split('@')[0].split(':')[1]);
    }

    return currentClientIdsInGroup;
  }

  public async getKeyPackagesPayload(qualifiedUsers: KeyPackageClaimUser[], skipClientIds: string[] = []) {
    /**
     * @note We need to fetch key packages for all the users
     * we want to add to the new MLS conversations,
     * includes self user too.
     */
    const failedToFetchKeyPackages: QualifiedId[] = [];
    const emptyKeyPackagesUsers: QualifiedId[] = [];

    const keyPackagesSettledResult = await Promise.allSettled(
      qualifiedUsers.map(async ({id, domain, skipOwnClientId}) => {
        try {
          const keys = await this.apiClient.api.client.claimMLSKeyPackages(
            id,
            domain,
            numberToHex(this.config.defaultCiphersuite),
            skipOwnClientId,
          );

          const isSelfUser = this.apiClient.userId === id && this.apiClient.domain === domain;

          // It's possible that user's backend is reachable but they have not uploaded their MLS key packages (or all of them have been claimed already)
          // We don't care about the self user here.
          if (!isSelfUser && keys.key_packages.length === 0) {
            this.logger.warn(`User ${id} has no key packages uploaded`);
            emptyKeyPackagesUsers.push({id, domain});
          }

          return keys;
        } catch (error) {
          failedToFetchKeyPackages.push({id, domain});
          // Throw the error so we don't get {status: 'fulfilled', value: undefined}
          throw error;
        }
      }),
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
          ...key_packages
            .filter(keyPackage => !skipClientIds.includes(keyPackage.client))
            .map(keyPackage => Decoder.fromBase64(keyPackage.key_package).asBytes),
        ];
      }
      return previousValue;
    }, []);

    const failures: AddUsersFailure[] = [];

    if (emptyKeyPackagesUsers.length > 0) {
      failures.push({reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG, users: emptyKeyPackagesUsers});
    }

    if (failedToFetchKeyPackages.length > 0) {
      failures.push({
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        users: failedToFetchKeyPackages,
        backends: failedToFetchKeyPackages.map(({domain}) => domain),
      });
    }

    return {keyPackages: coreCryptoKeyPackagesPayload, failures};
  }

  public getEpoch(groupId: string | Uint8Array) {
    const groupIdBytes = typeof groupId === 'string' ? Decoder.fromBase64(groupId).asBytes : groupId;
    return this.coreCryptoClient.conversationEpoch(groupIdBytes);
  }

  public async joinByExternalCommit(getGroupInfo: () => Promise<Uint8Array>) {
    const credentialType = await this.getCredentialType();

    const groupInfo = await getGroupInfo();
    const welcomeBundle = await this.coreCryptoClient.transaction(cx =>
      cx.joinByExternalCommit(groupInfo, credentialType),
    );
    await this.dispatchNewCrlDistributionPoints(welcomeBundle.crlNewDistributionPoints);

    if (welcomeBundle.id) {
      //after we've successfully joined via external commit, we schedule periodic key material renewal
      const groupIdStr = Encoder.toBase64(welcomeBundle.id).asString;
      const newEpoch = await this.getEpoch(groupIdStr);

      // Schedule the next key material renewal
      await this.scheduleKeyMaterialRenewal(groupIdStr);

      // Notify subscribers about the new epoch
      this.emit(MLSServiceEvents.NEW_EPOCH, {groupId: groupIdStr, epoch: newEpoch});
      this.logger.info(`Joined MLS group with id ${groupIdStr} via external commit, new epoch: ${newEpoch}`);
    }
  }

  public async exportSecretKey(groupId: string, keyLength: number): Promise<string> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const key = await this.coreCryptoClient.exportSecretKey(groupIdBytes, keyLength);
    return Encoder.toBase64(key).asString;
  }

  private dispatchNewCrlDistributionPoints(crlNewDistributionPoints: NewCrlDistributionPoints) {
    if (crlNewDistributionPoints && crlNewDistributionPoints.length > 0) {
      this.emit(MLSServiceEvents.NEW_CRL_DISTRIBUTION_POINTS, crlNewDistributionPoints);
    }
  }

  public async processWelcomeMessage(welcomeMessage: Uint8Array): Promise<ConversationId> {
    const welcomeBundle = await this.coreCryptoClient.transaction(cx => cx.processWelcomeMessage(welcomeMessage));
    this.dispatchNewCrlDistributionPoints(welcomeBundle.crlNewDistributionPoints);
    return welcomeBundle.id;
  }

  public async decryptMessage(
    conversationId: ConversationId,
    payload: Uint8Array,
  ): Promise<DecryptedMessage | undefined> {
    try {
      const start = Date.now();
      this.logger.info('Decrypting message', {conversationId});
      const decryptedMessage = await this.coreCryptoClient.transaction(cx =>
        cx.decryptMessage(conversationId, payload),
      );
      this.dispatchNewCrlDistributionPoints(decryptedMessage.crlNewDistributionPoints);
      this.logger.info('Message decrypted successfully', {conversationId, duration: Date.now() - start});
      return decryptedMessage;
    } catch (error) {
      this.logger.warn('Failed to decrypt MLS message', {conversationId, error});
      // According to CoreCrypto JS doc on .decryptMessage method, we should ignore some errors (corecrypto handle them internally)
      if (shouldMLSDecryptionErrorBeIgnored(error)) {
        return {
          hasEpochChanged: false,
          isActive: false,
        };
      }
      return undefined;
    }
  }

  public async encryptMessage(conversationId: ConversationId, message: Uint8Array): Promise<Uint8Array> {
    return this.coreCryptoClient.transaction(cx => cx.encryptMessage(conversationId, message));
  }

  private async updateKeyingMaterial(groupId: string) {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    await this.coreCryptoClient.transaction(cx => cx.updateKeyingMaterial(groupIdBytes));
  }

  /**
   * Will create an empty conversation inside of coreCrypto.
   * @param groupId the id of the group to create inside of coreCrypto
   * @param parentGroupId in case the conversation is a subconversation, the id of the parent conversation
   */
  public async registerEmptyConversation(
    groupId: string,
    parentGroupId?: string,
    removalKeyFor1to1Signature?: MLSPublicKeyRecord,
  ): Promise<void> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    let externalSenders: Uint8Array[] = [];
    if (parentGroupId) {
      const parentGroupIdBytes = Decoder.fromBase64(parentGroupId).asBytes;
      externalSenders = [await this.coreCryptoClient.getExternalSender(parentGroupIdBytes)];
    } else {
      const mlsKeys = (await this.apiClient.api.client.getPublicKeys()).removal;
      const ciphersuiteSignature = getSignatureAlgorithmForCiphersuite(this.config.defaultCiphersuite);
      const removalKeyForSignature =
        removalKeyFor1to1Signature?.[ciphersuiteSignature] ?? mlsKeys[ciphersuiteSignature];
      if (!removalKeyForSignature) {
        throw new Error(
          `Cannot create conversation: No backend removal key found for the signature ${ciphersuiteSignature}`,
        );
      }
      externalSenders = [Decoder.fromBase64(removalKeyForSignature).asBytes];
    }

    const configuration: ConversationConfiguration = {
      externalSenders,
      ciphersuite: this.config.defaultCiphersuite,
    };

    const credentialType = await this.getCredentialType();
    return this.coreCryptoClient.transaction(cx => cx.createConversation(groupIdBytes, credentialType, configuration));
  }

  /**
   * Will create a conversation inside of coreCrypto, add users to it or update the keying material if empty key packages list is provided.
   * @param groupId the id of the group to create inside of coreCrypto
   * @param users the list of users that will be members of the conversation (including the self user)
   * @param options.creator the creator of the list. Most of the time will be the self user (or empty if the conversation was created by backend first)
   * @param options.parentGroupId in case the conversation is a subconversation, the id of the parent conversation
   */
  public async registerConversation(
    groupId: string,
    users: QualifiedId[],
    options?: {creator?: {user: QualifiedId; client?: string}; parentGroupId?: string},
  ): Promise<AddUsersFailure[]> {
    await this.registerEmptyConversation(groupId, options?.parentGroupId);

    const creator = options?.creator;

    const {keyPackages, failures: keysClaimingFailures} = await this.getKeyPackagesPayload(
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

    if (keyPackages.length <= 0) {
      // If there are no clients to add, just update the keying material
      await this.updateKeyingMaterial(groupId);
      await this.scheduleKeyMaterialRenewal(groupId);

      return keysClaimingFailures;
    }

    await this.addUsersToExistingConversation(groupId, keyPackages);

    // We schedule a periodic key material renewal
    await this.scheduleKeyMaterialRenewal(groupId);

    /**
     * @note If we can't fetch a user's key packages then we can not add them to mls conversation
     * so we're adding them to the list of failed users.
     */
    return keysClaimingFailures;
  }

  /**
   * Will create a 1:1 conversation inside of coreCrypto, try claiming key packages for user and (if succesfull) add them to the MLS group.
   * @param groupId the id of the group to create inside of coreCrypto
   * @param userId the id of the user to register the conversation with
   * @param selfUser the self user that is creating the 1:1 conversation (user and client ids)
   */
  public async register1to1Conversation(
    groupId: string,
    userId: QualifiedId,
    selfUser: {user: QualifiedId; client: string},
    removalKeyFor1to1Signature?: MLSPublicKeyRecord,
  ): Promise<AddUsersFailure[]> {
    try {
      await this.registerEmptyConversation(groupId, undefined, removalKeyFor1to1Signature);

      // We fist fetch key packages for the user we want to add
      const {keyPackages: otherUserKeyPackages, failures: otherUserKeysClaimingFailures} =
        await this.getKeyPackagesPayload([userId]);

      // If we're missing key packages for the user we want to add, we can't register the conversation
      if (otherUserKeyPackages.length <= 0) {
        if (
          otherUserKeysClaimingFailures.length > 0 &&
          otherUserKeysClaimingFailures.some(({reason}) => reason === AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG)
        ) {
          throw new ClientMLSError(ClientMLSErrorLabel.NO_KEY_PACKAGES_AVAILABLE);
        }
      }

      const {keyPackages: selfKeyPackages, failures: selfKeysClaimingFailures} = await this.getKeyPackagesPayload([
        {...selfUser.user, skipOwnClientId: selfUser.client},
      ]);

      await this.addUsersToExistingConversation(groupId, [...otherUserKeyPackages, ...selfKeyPackages]);

      // We schedule a periodic key material renewal
      await this.scheduleKeyMaterialRenewal(groupId);

      return [...otherUserKeysClaimingFailures, ...selfKeysClaimingFailures];
    } catch (error) {
      await this.wipeConversation(groupId);
      throw error;
    }
  }

  /**
   * Will try to register mls group and send an empty commit to establish it.
   *
   * @param groupId - id of the MLS group
   * @returns true if the client has successfully established the group, false otherwise
   */
  public readonly tryEstablishingMLSGroup = async (groupId: string): Promise<boolean> => {
    this.logger.debug(`Trying to establish a MLS group with id ${groupId}.`);

    // Before trying to register a group, check if the group is already established locally.
    // We could have received a welcome message in the meantime.
    const doesMLSGroupExistLocally = await this.conversationExists(groupId);
    if (doesMLSGroupExistLocally) {
      this.logger.debug(`MLS Group with id ${groupId} already exists, skipping the initialisation.`);
      return false;
    }

    try {
      await this.registerConversation(groupId, []);
      return true;
    } catch (error) {
      // If conversation already existed, locally, nothing more to do, we've received a welcome message.
      if (isCoreCryptoMLSConversationAlreadyExistsError(error)) {
        this.logger.debug(`MLS Group with id ${groupId} already exists, skipping the initialisation.`);
        return false;
      }

      this.logger.warn(`MLS Group with id ${groupId} was not established succesfully, wiping the group locally...`);
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

    return this.coreCryptoClient.transaction(cx =>
      cx.removeClientsFromConversation(
        groupIdBytes,
        clientIds.map(id => this.textEncoder.encode(id)),
      ),
    );
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
    return this.coreCryptoClient.transaction(cx =>
      cx.clientValidKeypackagesCount(this.config.defaultCiphersuite, credentialType),
    );
  }

  public async clientKeypackages(amountRequested: number): Promise<Uint8Array[]> {
    const credentialType = await this.getCredentialType();
    return this.coreCryptoClient.transaction(cx =>
      cx.clientKeypackages(this.config.defaultCiphersuite, credentialType, amountRequested),
    );
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
    const task = async () => {
      this.logger.log('Executed Periodic check for key packages');
      await this.verifyRemoteMLSKeyPackagesAmount(clientId);
    };

    // Schedule the task to run every day
    return this.recurringTaskScheduler.registerTask({
      every: TimeUtil.TimeInMillis.DAY,
      key: 'try-key-packages-backend-sync',
      task,
      addTaskOnWindowFocusEvent: true,
    });
  }

  /**
   * Checks if there are enough key packages locally and if not,
   * checks the number of keys available on backend and (if needed) generates new keys and uploads them.
   * @param clientId id of the client
   */
  private async verifyLocalMLSKeyPackagesAmount(clientId: string) {
    const keyPackagesCount = await this.clientValidKeypackagesCount();

    if (keyPackagesCount <= this.minRequiredKeyPackages) {
      return this.verifyRemoteMLSKeyPackagesAmount(clientId);
    }
  }

  private async verifyRemoteMLSKeyPackagesAmount(clientId: string) {
    const backendKeyPackagesCount = await this.getRemoteMLSKeyPackageCount(clientId);

    // If we have enough keys uploaded on backend, there's no need to upload more.
    if (backendKeyPackagesCount > this.minRequiredKeyPackages) {
      return;
    }

    const keyPackages = await this.clientKeypackages(this.config.nbKeyPackages);
    return this.uploadMLSKeyPackages(clientId, keyPackages);
  }

  private async getRemoteMLSKeyPackageCount(clientId: string) {
    return this.apiClient.api.client.getMLSKeyPackageCount(clientId, numberToHex(this.config.defaultCiphersuite));
  }

  private async getCCClientSignatureString(): Promise<string> {
    const credentialType = await this.getCredentialType();
    const publicKey = await this.coreCryptoClient.clientPublicKey(this.config.defaultCiphersuite, credentialType);
    if (!publicKey) {
      throw new Error('No public key found for client');
    }
    return btoa(Converter.arrayBufferViewToBaselineString(publicKey));
  }

  /**
   * Will update the given client on backend with its public key.
   *
   * @param mlsClient Intance of the coreCrypto that represents the mls client
   * @param client Backend client data
   */
  private async uploadMLSPublicKeys(client: RegisteredClient) {
    // If we've already updated a client with its public key, there's no need to do it again.
    try {
      const clientSignature = await this.getCCClientSignatureString();
      return this.apiClient.api.client.putClient(client.id, {
        mls_public_keys: {
          [getSignatureAlgorithmForCiphersuite(this.config.defaultCiphersuite)]: clientSignature,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to upload public keys for client ${client.id}`, error);
      throw error;
    }
  }

  private async replaceKeyPackages(clientId: string, keyPackages: Uint8Array[]) {
    return this.apiClient.api.client.replaceMLSKeyPackages(
      clientId,
      keyPackages.map(keyPackage => btoa(Converter.arrayBufferViewToBaselineString(keyPackage))),
      numberToHex(this.config.defaultCiphersuite),
    );
  }

  private async uploadMLSKeyPackages(clientId: string, keyPackages: Uint8Array[]) {
    return this.apiClient.api.client.uploadMLSKeyPackages(
      clientId,
      keyPackages.map(keyPackage => btoa(Converter.arrayBufferViewToBaselineString(keyPackage))),
    );
  }

  public async wipeConversation(groupId: string): Promise<void> {
    await this.cancelKeyMaterialRenewal(groupId);
    await this.cancelPendingProposalsTask(groupId);

    const doesConversationExist = await this.conversationExists(groupId);
    if (!doesConversationExist) {
      //if the mls group does not exist, we don't need to wipe it
      return;
    }

    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    return this.coreCryptoClient.transaction(cx => cx.wipeConversation(groupIdBytes));
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
      await this.commitPendingProposals(groupId);
    }
  }

  private async schedulePendingProposalsTask(groupId: string, firingDate: number) {
    await this.coreDatabase.put('pendingProposals', {groupId, firingDate}, groupId);

    TaskScheduler.addTask({
      task: () => this.commitPendingProposals(groupId),
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
   */
  public async commitPendingProposals(groupId: string, shouldRetry = true): Promise<void> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    try {
      await this.coreCryptoClient.transaction(cx => cx.commitPendingProposals(groupIdBytes));
      await this.cancelPendingProposalsTask(groupId);
    } catch (error) {
      if (!shouldRetry) {
        throw error;
      }

      this.logger.warn('Failed to commit proposals, clearing the pending commit and retrying', error);

      return this.commitPendingProposals(groupId, false);
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
            task: () => this.commitPendingProposals(groupId),
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
        `Could not find a group_id for conversation ${qualifiedConversationId.id}@${qualifiedConversationId.domain}${event.subconv ? `/subconversation:${event.subconv}` : ''}`,
      );
    }

    return handleMLSMessageAdd({event, mlsService: this, groupId});
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
    user: User,
    client: RegisteredClient,
    nbPrekeys: number,
    certificateTtl: number,
    getOAuthToken: getTokenCallback,
    getAllConversations: getAllConversationsCallback,
  ): Promise<void> {
    const isCertificateRenewal = await this.coreCryptoClient.e2eiIsEnabled(this.config.defaultCiphersuite);
    const e2eiServiceInternal = new E2EIServiceInternal(
      this.coreDatabase,
      this.coreCryptoClient,
      this.apiClient,
      certificateTtl,
      nbPrekeys,
      {user, clientId: client.id, discoveryUrl},
    );

    const {keyPackages, newCrlDistributionPoints} = await e2eiServiceInternal.generateCertificate(
      getOAuthToken,
      isCertificateRenewal,
      getAllConversations,
      this.config.defaultCiphersuite,
    );

    this.dispatchNewCrlDistributionPoints(newCrlDistributionPoints);
    // upload the clients public keys
    if (!this.isInitializedMLSClient(client)) {
      // we only upload public keys for the initial certification process if the device is not already a registered MLS device.
      await this.uploadMLSPublicKeys(client);
    }
    // replace old key packages with new key packages with x509 certificate
    await this.replaceKeyPackages(client.id, keyPackages);
    // Verify that we have enough key packages
    await this.verifyRemoteMLSKeyPackagesAmount(client.id);
  }
}
