/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import type {Clock} from '@enormora/clock/clock';
import {isNullOrUndefined, isUndefined} from '@sindresorhus/is';

import {generateSubconversationStoreKey} from './subconversationUtil';

import {APIClient} from '../../../apiClient/apiClient';
import {Subconversation, SUBCONVERSATION_ID} from '../../../apiClient/conversation/subconversation';
import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {TypedEventEmitter} from '../../../commons/TypedEventEmitter/TypedEventEmitter';
import {TimeInMillis} from '../../../commons/util/TimeUtil';
import {getLogger} from '../../../logger/getLogger';
import {MLSService, MLSServiceEvents} from '../../messagingProtocols/mls';
import {isMLSStaleMessageError} from '../../messagingProtocols/mls/mlsService/coreCryptoMlsError';
import {CoreDatabase} from '../../storage/coreDb';
import {constructFullyQualifiedClientId} from '../../util/fullyQualifiedClientIdUtils';

type Events = {
  MLSConversationRecovered: {conversationId: QualifiedId};
};

export interface SubconversationEpochInfoMember {
  userid: string;
  clientid: string;
  in_subconv: boolean;
}

type ConferenceJoinResult = {groupId: string; epoch: number};
type PendingConferenceJoin = {controller: AbortController; promise: Promise<ConferenceJoinResult>};

const MLS_CONVERSATION_KEY_LENGTH = 32;
const MAX_CONFERENCE_JOIN_RETRIES = 3;
const SECOND_RETRY_DELAY = TimeInMillis.SECOND;
const CONFERENCE_JOIN_RETRY_DELAYS = [0, SECOND_RETRY_DELAY, SECOND_RETRY_DELAY + SECOND_RETRY_DELAY];
const CONFERENCE_JOIN_MIN_JITTER = 0.8;
const CONFERENCE_JOIN_JITTER_RANGE = 0.4;

export class SubconversationService extends TypedEventEmitter<Events> {
  private readonly logger = getLogger('@wireapp/core/SubconversationService');
  private readonly pendingConferenceJoins = new Map<string, PendingConferenceJoin>();
  private readonly pendingConferenceLeaves = new Map<string, Promise<void>>();

  constructor(
    private readonly apiClient: APIClient,
    private readonly coreDatabase: CoreDatabase,
    private readonly clock: Clock,
    private readonly _mlsService?: MLSService,
    private readonly random: () => number = Math.random,
  ) {
    super();
  }

  get mlsService(): MLSService {
    if (isUndefined(this._mlsService)) {
      throw new Error('MLSService was not initialised!');
    }
    return this._mlsService;
  }

  /**
   * Will join or register an mls subconversation for conference calls.
   * Will return the secret key derived from the subconversation
   *
   * @param conversationId Id of the parent conversation in which the call should happen
   * @param groupId groupId of the parent conversation in which the call should happen
   */
  public joinConferenceSubconversation(conversationId: QualifiedId, groupId: string): Promise<ConferenceJoinResult> {
    const key = generateSubconversationStoreKey(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    const pending = this.pendingConferenceJoins.get(key);
    if (!isUndefined(pending) && !pending.controller.signal.aborted) {
      return pending.promise;
    }

    const controller = new AbortController();
    const leave = this.pendingConferenceLeaves.get(key);
    const promise = Promise.resolve(leave).then(() => {
      controller.signal.throwIfAborted();
      return this.joinConferenceSubconversationAttempt(conversationId, groupId, controller.signal);
    });
    this.pendingConferenceJoins.set(key, {controller, promise});
    const clearPending = (): void => {
      if (this.pendingConferenceJoins.get(key)?.controller === controller) {
        this.pendingConferenceJoins.delete(key);
      }
    };
    void promise.then(clearPending, clearPending);
    return promise;
  }

  private async joinConferenceSubconversationAttempt(
    conversationId: QualifiedId,
    groupId: string,
    signal: AbortSignal,
    retryCount = 0,
  ): Promise<{groupId: string; epoch: number}> {
    try {
      signal.throwIfAborted();
      this.logger.info('Joining conference subconversation', {conversationId, groupId});
      const {
        group_id: subconversationGroupId,
        epoch: subconversationEpoch,
        epoch_timestamp: subconversationEpochTimestamp,
        subconv_id: subconversationId,
      } = await this.getConferenceSubconversation(conversationId);
      signal.throwIfAborted();

      // We store the mapping between the subconversation and the parent conversation
      await this.saveSubconversationGroupId(conversationId, subconversationId, subconversationGroupId);
      signal.throwIfAborted();

      if (subconversationEpoch === 0) {
        const doesConversationExistsLocally = await this.mlsService.conversationExists(subconversationGroupId);
        signal.throwIfAborted();
        if (doesConversationExistsLocally) {
          await this.mlsService.wipeConversation(subconversationGroupId);
          signal.throwIfAborted();
        }

        // If subconversation is not yet established, create it and upload the commit bundle.
        await this.mlsService.registerConversation(subconversationGroupId, [], {parentGroupId: groupId});
      } else {
        const epochUpdateTime = new Date(subconversationEpochTimestamp).getTime();
        const epochAge = new Date().getTime() - epochUpdateTime;

        if (epochAge > TimeInMillis.DAY) {
          // If subconversation does exist, but it's older than 24h, delete and re-join
          await this.deleteConferenceSubconversation(conversationId, {
            groupId: subconversationGroupId,
            epoch: subconversationEpoch,
          });
          await this.mlsService.wipeConversation(subconversationGroupId);
          signal.throwIfAborted();

          return this.joinConferenceSubconversationAttempt(conversationId, groupId, signal);
        }

        signal.throwIfAborted();
        await this.joinSubconversationByExternalCommit(conversationId, SUBCONVERSATION_ID.CONFERENCE);
      }

      const epoch = Number(await this.mlsService.getEpoch(subconversationGroupId));
      signal.throwIfAborted();

      return {groupId: subconversationGroupId, epoch};
    } catch (error: unknown) {
      if (signal.aborted) {
        this.logger.info('Conference subconversation join cancelled', {conversationId, groupId, retryCount});
      } else {
        this.logger.error('Failed to join conference subconversation', {conversationId, groupId, error, retryCount});
      }
      return this.retryConferenceSubconversationJoin(conversationId, groupId, signal, retryCount, error);
    }
  }

  private async retryConferenceSubconversationJoin(
    conversationId: QualifiedId,
    groupId: string,
    signal: AbortSignal,
    retryCount: number,
    error: unknown,
  ): Promise<{groupId: string; epoch: number}> {
    if (signal.aborted || retryCount >= MAX_CONFERENCE_JOIN_RETRIES) {
      throw error;
    }
    const isStaleMessage =
      (error instanceof BackendError && error.label === BackendErrorLabel.MLS_STALE_MESSAGE) ||
      isMLSStaleMessageError(error);
    if (retryCount > 0 && !isStaleMessage) {
      throw error;
    }

    if (retryCount > 0) {
      const baseDelay = CONFERENCE_JOIN_RETRY_DELAYS[retryCount];
      const delay = Math.round(baseDelay * (CONFERENCE_JOIN_MIN_JITTER + this.random() * CONFERENCE_JOIN_JITTER_RANGE));
      await this.waitForConferenceJoinRetry(delay, signal);
    }

    signal.throwIfAborted();
    return this.joinConferenceSubconversationAttempt(conversationId, groupId, signal, retryCount + 1);
  }

  private async waitForConferenceJoinRetry(delay: number, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    return new Promise<void>((resolve, reject) => {
      const timeout = this.clock.setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, delay);
      const onAbort = (): void => {
        this.clock.clearTimeout(timeout);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, {once: true});
    });
  }

  /**
   * Will leave conference subconversation if it's known by client and established.
   *
   * @param conversationId Id of the parent conversation which subconversation we want to leave
   */
  public leaveConferenceSubconversation(conversationId: QualifiedId): Promise<void> {
    const key = generateSubconversationStoreKey(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    const pending = this.pendingConferenceJoins.get(key);
    pending?.controller.abort();
    const existing = this.pendingConferenceLeaves.get(key);
    if (!isUndefined(existing)) {
      return existing;
    }
    const leave = this.leaveConferenceSubconversationAfterJoin(conversationId, pending);
    this.pendingConferenceLeaves.set(key, leave);
    const clear = (): void => {
      if (this.pendingConferenceLeaves.get(key) === leave) {
        this.pendingConferenceLeaves.delete(key);
      }
    };
    void leave.then(clear, clear);
    return leave;
  }

  private async leaveConferenceSubconversationAfterJoin(
    conversationId: QualifiedId,
    pending?: PendingConferenceJoin,
  ): Promise<void> {
    if (!isUndefined(pending)) {
      await pending.promise.catch(() => {
        return undefined;
      });
    }
    this.logger.info('Leaving conference subconversation', {conversationId});
    const subconversationGroupId = await this.getSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);

    if (subconversationGroupId === undefined || subconversationGroupId.length === 0) {
      this.logger.warn('No subconversation groupId found when leaving conference subconversation', {conversationId});
      return;
    }

    const doesGroupExistLocally = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesGroupExistLocally) {
      // If the subconversation was known by a client but is does not exist locally, we can remove it from the store.
      this.logger.info('Subconversation not found locally; clearing stored mapping', {
        conversationId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
      });
      return this.clearSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    }

    try {
      await this.apiClient.api.conversation.deleteSubconversationSelf(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    } catch (error: unknown) {
      this.logger.error('Failed to leave conference subconversation', {
        conversationId,
        subconversationId: SUBCONVERSATION_ID.CONFERENCE,
        subconversationGroupId,
        error,
      });
    }

    await this.mlsService.wipeConversation(subconversationGroupId);

    // once we've left the subconversation, we can remove it from the store
    this.logger.info('Clearing stored mapping after leaving conference subconversation', {
      conversationId,
      subconversationId: SUBCONVERSATION_ID.CONFERENCE,
      subconversationGroupId,
    });
    await this.clearSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);
  }

  public async leaveStaleConferenceSubconversations(): Promise<void> {
    this.logger.info('Leaving all stale conference subconversations');
    const conversationIds = await this.getAllGroupIdsBySubconversationId(SUBCONVERSATION_ID.CONFERENCE);

    for (const {parentConversationId} of conversationIds) {
      this.logger.debug('Leaving stale conference subconversation for parent conversation', {
        parentConversationId,
      });
      await this.leaveConferenceSubconversation(parentConversationId);
    }
  }

  public async getSubconversationEpochInfo(
    parentConversationId: QualifiedId,
    parentConversationGroupId: string,
    shouldAdvanceEpoch = false,
  ): Promise<{
    members: SubconversationEpochInfoMember[];
    epoch: number;
    secretKey: string;
    keyLength: number;
  } | null> {
    this.logger.info('Getting subconversation epoch info', {
      parentConversationId,
      parentConversationGroupId,
      shouldAdvanceEpoch,
    });
    const subconversationGroupId = await this.getSubconversationGroupId(
      parentConversationId,
      SUBCONVERSATION_ID.CONFERENCE,
    );

    // this method should not be called if the subconversation (and its parent conversation) is not established
    if (subconversationGroupId === undefined || subconversationGroupId.length === 0) {
      this.logger.error('Could not obtain epoch info for conference subconversation: missing groupId', {
        parentConversationId,
      });

      return null;
    }

    //we don't want to react to avs callbacks when conversation was not yet established
    const doesMLSGroupExist = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesMLSGroupExist) {
      this.logger.debug('Subconversation MLS group does not exist locally; skipping epoch info', {
        parentConversationId,
        parentConversationGroupId,
        subconversationGroupId,
      });
      return null;
    }

    const members = await this.generateSubconversationMembers(subconversationGroupId, parentConversationGroupId);

    if (shouldAdvanceEpoch) {
      this.logger.info('Advancing epoch and renewing key material for subconversation', {subconversationGroupId});
      await this.mlsService.renewKeyMaterial(subconversationGroupId);
    }

    const epoch = Number(await this.mlsService.getEpoch(subconversationGroupId));

    const secretKey = await this.mlsService.exportSecretKey(subconversationGroupId, MLS_CONVERSATION_KEY_LENGTH);

    this.logger.debug('Obtained subconversation epoch info', {
      parentConversationId,
      parentConversationGroupId,
      subconversationGroupId,
      epoch,
      membersCount: members.length,
      keyLength: MLS_CONVERSATION_KEY_LENGTH,
    });
    return {members, epoch, keyLength: MLS_CONVERSATION_KEY_LENGTH, secretKey};
  }

  public async subscribeToEpochUpdates(
    parentConversationId: QualifiedId,
    parentConversationGroupId: string,
    findConversationByGroupId: (groupId: string) => QualifiedId | undefined,
    onEpochUpdate: (info: {
      members: SubconversationEpochInfoMember[];
      epoch: number;
      secretKey: string;
      keyLength: number;
    }) => void,
  ): Promise<() => void> {
    this.logger.info('Subscribing to subconversation epoch updates', {
      parentConversationId,
      parentConversationGroupId,
    });
    const {epoch: initialEpoch, groupId: subconversationGroupId} = await this.joinConferenceSubconversation(
      parentConversationId,
      parentConversationGroupId,
    );

    const forwardNewEpoch = async ({groupId}: {groupId: string; epoch: bigint}): Promise<void> => {
      this.logger.debug('Received MLS NEW_EPOCH event', {eventGroupId: groupId, subconversationGroupId});
      if (groupId !== subconversationGroupId) {
        // if the epoch update did not happen in the subconversation directly, check if it happened in the parent conversation
        const parentConversationId = findConversationByGroupId(groupId);
        if (parentConversationId === undefined) {
          this.logger.debug('Ignoring NEW_EPOCH event: could not map to parent conversation');
          return;
        }

        const foundSubconversationGroupId = await this.getSubconversationGroupId(
          parentConversationId,
          SUBCONVERSATION_ID.CONFERENCE,
        );

        // if the conference subconversation of parent conversation is not known, ignore the epoch update
        if (foundSubconversationGroupId !== subconversationGroupId) {
          this.logger.debug('Ignoring NEW_EPOCH event: not related to subscribed subconversation', {
            eventGroupId: groupId,
            foundSubconversationGroupId,
            expectedSubconversationGroupId: subconversationGroupId,
          });
          return;
        }
      }

      const subconversationEpochInfo = await this.getSubconversationEpochInfo(
        parentConversationId,
        parentConversationGroupId,
      );

      if (isNullOrUndefined(subconversationEpochInfo)) {
        this.logger.debug('No subconversation epoch info available; skipping callback', {
          parentConversationId,
          parentConversationGroupId,
        });
        return;
      }

      const newSubconversationEpoch = Number(await this.mlsService.getEpoch(subconversationGroupId));

      this.logger.info('Forwarding epoch update to subscriber', {
        subconversationGroupId,
        epoch: newSubconversationEpoch,
      });
      return onEpochUpdate({
        ...subconversationEpochInfo,
        epoch: newSubconversationEpoch,
      });
    };

    this.mlsService.on(MLSServiceEvents.NEW_EPOCH, forwardNewEpoch);

    await forwardNewEpoch({groupId: subconversationGroupId, epoch: BigInt(initialEpoch)});

    this.logger.info('Subscribed to MLS NEW_EPOCH events for subconversation', {subconversationGroupId});
    return () => {
      return this.mlsService.off(MLSServiceEvents.NEW_EPOCH, forwardNewEpoch);
    };
  }

  public async removeClientFromConferenceSubconversation(
    conversationId: QualifiedId,
    clientToRemove: {user: QualifiedId; clientId: string},
  ): Promise<void> {
    this.logger.info('Removing client from conference subconversation', {
      conversationId,
      user: clientToRemove.user,
      clientId: clientToRemove.clientId,
    });
    const subconversationGroupId = await this.getSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);

    if (subconversationGroupId === undefined || subconversationGroupId.length === 0) {
      this.logger.warn('Cannot remove client: subconversation groupId missing', {conversationId});
      return;
    }

    const doesMLSGroupExist = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesMLSGroupExist) {
      this.logger.debug('Cannot remove client: subconversation MLS group does not exist locally', {
        conversationId,
        subconversationGroupId,
      });
      return;
    }

    const {
      user: {id: userId, domain},
      clientId,
    } = clientToRemove;
    const clientToRemoveQualifiedId = constructFullyQualifiedClientId(userId, clientId, domain);

    const subconversationMembers = await this.mlsService.getClientIds(subconversationGroupId);

    const isSubconversationMember = subconversationMembers.some(({userId, clientId, domain}) => {
      return constructFullyQualifiedClientId(userId, clientId, domain) === clientToRemoveQualifiedId;
    });

    if (!isSubconversationMember) {
      this.logger.info('Client is not a member of the subconversation; nothing to remove', {
        conversationId,
        subconversationGroupId,
        clientToRemoveQualifiedId,
      });
      return;
    }

    this.logger.info('Removing client from subconversation', {
      subconversationGroupId,
      clientToRemoveQualifiedId,
    });
    try {
      await this.mlsService.removeClientsFromConversation(subconversationGroupId, [clientToRemoveQualifiedId]);
    } catch (error: unknown) {
      this.logger.error('Failed to remove client from subconversation', {
        subconversationGroupId,
        clientToRemoveQualifiedId,
        error,
      });
    }
  }

  private async joinSubconversationByExternalCommit(
    conversationId: QualifiedId,
    subconversation: SUBCONVERSATION_ID,
  ): Promise<void> {
    try {
      this.logger.info('Joining subconversation by external commit', {conversationId, subconversation});
      await this.mlsService.joinByExternalCommit(() => {
        return this.apiClient.api.conversation.getSubconversationGroupInfo(conversationId, subconversation);
      });
    } catch (error: unknown) {
      this.logger.error('Failed to join subconversation by external commit', {
        conversationId,
        subconversation,
        error,
      });
      throw error;
    }
  }

  private async getConferenceSubconversation(conversationId: QualifiedId): Promise<Subconversation> {
    this.logger.debug('Fetching conference subconversation metadata', {conversationId});
    try {
      return await this.apiClient.api.conversation.getSubconversation(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    } catch (error: unknown) {
      this.logger.error('Failed to fetch conference subconversation metadata', {conversationId, error});
      throw error;
    }
  }

  private async deleteConferenceSubconversation(
    conversationId: QualifiedId,
    data: {groupId: string; epoch: number},
  ): Promise<void> {
    this.logger.info('Deleting conference subconversation', {conversationId, data});
    try {
      return await this.apiClient.api.conversation.deleteSubconversation(
        conversationId,
        SUBCONVERSATION_ID.CONFERENCE,
        data,
      );
    } catch (error: unknown) {
      this.logger.error('Failed to delete conference subconversation', {conversationId, data, error});
      throw error;
    }
  }

  private async generateSubconversationMembers(
    subconversationGroupId: string,
    parentGroupId: string,
  ): Promise<SubconversationEpochInfoMember[]> {
    this.logger.debug('Generating subconversation members info', {
      subconversationGroupId,
      parentGroupId,
    });
    const subconversationMemberIds = await this.mlsService.getClientIds(subconversationGroupId);
    const parentMemberIds = await this.mlsService.getClientIds(parentGroupId);

    const members = parentMemberIds.map(parentMember => {
      const isSubconversationMember = subconversationMemberIds.some(({userId, clientId, domain}) => {
        return (
          constructFullyQualifiedClientId(userId, clientId, domain) ===
          constructFullyQualifiedClientId(parentMember.userId, parentMember.clientId, parentMember.domain)
        );
      });

      return {
        userid: this.apiClient.backendFeatures.isFederated
          ? `${parentMember.userId}@${parentMember.domain}`
          : parentMember.userId,
        clientid: parentMember.clientId,
        in_subconv: isSubconversationMember,
      };
    });
    this.logger.debug('Generated subconversation members info', {
      subconversationGroupId,
      parentGroupId,
      membersCount: members.length,
    });
    return members;
  }

  public getSubconversationGroupId = async (
    parentConversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<string | undefined> => {
    const foundSubconversation = await this.coreDatabase.get(
      'subconversations',
      generateSubconversationStoreKey(parentConversationId, subconversationId),
    );
    this.logger.debug('Loaded subconversation groupId from store', {
      parentConversationId,
      subconversationId,
      found: Boolean(foundSubconversation?.groupId),
    });
    return foundSubconversation?.groupId;
  };

  public getAllGroupIdsBySubconversationId = async (
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<
    {
      parentConversationId: QualifiedId;
      subconversationId: SUBCONVERSATION_ID;
      groupId: string;
    }[]
  > => {
    this.logger.debug('Retrieving all subconversations by subconversationId', {subconversationId});
    const allSubconversations = await this.coreDatabase.getAll('subconversations');
    const foundSubconversations = allSubconversations.filter(subconversation => {
      return subconversation.subconversationId === subconversationId;
    });
    this.logger.debug('Found subconversations by id', {
      subconversationId,
      count: foundSubconversations.length,
    });
    return foundSubconversations;
  };

  public saveSubconversationGroupId = async (
    parentConversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
    groupId: string,
  ): Promise<string> => {
    this.logger.debug('Saving subconversation groupId mapping', {
      parentConversationId,
      subconversationId,
      groupId,
    });
    return this.coreDatabase.put(
      'subconversations',
      {parentConversationId, subconversationId, groupId},
      generateSubconversationStoreKey(parentConversationId, subconversationId),
    );
  };

  public clearSubconversationGroupId = async (
    parentConversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<void> => {
    this.logger.debug('Clearing subconversation groupId mapping', {
      parentConversationId,
      subconversationId,
    });
    return this.coreDatabase.delete(
      'subconversations',
      generateSubconversationStoreKey(parentConversationId, subconversationId),
    );
  };
}
