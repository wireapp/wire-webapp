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

import {SUBCONVERSATION_ID, Subconversation} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {APIClient} from '@wireapp/api-client';
import {LogFactory, TypedEventEmitter} from '@wireapp/commons';

import {generateSubconversationStoreKey} from './subconversationUtil';

import {MLSService, MLSServiceEvents} from '../../messagingProtocols/mls';
import {CoreDatabase} from '../../storage/CoreDB';
import {constructFullyQualifiedClientId} from '../../util/fullyQualifiedClientIdUtils';

type Events = {
  MLSConversationRecovered: {conversationId: QualifiedId};
};

export interface SubconversationEpochInfoMember {
  userid: string;
  clientid: string;
  in_subconv: boolean;
}

const MLS_CONVERSATION_KEY_LENGTH = 32;

export class SubconversationService extends TypedEventEmitter<Events> {
  private readonly logger = LogFactory.getLogger('@wireapp/core/SubconversationService');

  constructor(
    private readonly apiClient: APIClient,
    private readonly coreDatabase: CoreDatabase,
    private readonly _mlsService?: MLSService,
  ) {
    super();
  }

  get mlsService(): MLSService {
    if (!this._mlsService) {
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
  public async joinConferenceSubconversation(
    conversationId: QualifiedId,
    groupId: string,
    shouldRetry = true,
  ): Promise<{groupId: string; epoch: number}> {
    try {
      this.logger.info('Joining conference subconversation', {conversationId, groupId});
      const {
        group_id: subconversationGroupId,
        epoch: subconversationEpoch,
        epoch_timestamp: subconversationEpochTimestamp,
        subconv_id: subconversationId,
      } = await this.getConferenceSubconversation(conversationId);

      // We store the mapping between the subconversation and the parent conversation
      await this.saveSubconversationGroupId(conversationId, subconversationId, subconversationGroupId);

      if (subconversationEpoch === 0) {
        const doesConversationExistsLocally = await this.mlsService.conversationExists(subconversationGroupId);
        if (doesConversationExistsLocally) {
          await this.mlsService.wipeConversation(subconversationGroupId);
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

          return this.joinConferenceSubconversation(conversationId, groupId);
        }

        await this.joinSubconversationByExternalCommit(conversationId, SUBCONVERSATION_ID.CONFERENCE);
      }

      const epoch = Number(await this.mlsService.getEpoch(subconversationGroupId));

      return {groupId: subconversationGroupId, epoch};
    } catch (error) {
      this.logger.error('Failed to join conference subconversation', {conversationId, groupId, error, shouldRetry});
      if (shouldRetry) {
        return this.joinConferenceSubconversation(conversationId, groupId, false);
      }
      throw error;
    }
  }

  /**
   * Will leave conference subconversation if it's known by client and established.
   *
   * @param conversationId Id of the parent conversation which subconversation we want to leave
   */
  public async leaveConferenceSubconversation(conversationId: QualifiedId): Promise<void> {
    this.logger.info('Leaving conference subconversation', {conversationId});
    const subconversationGroupId = await this.getSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);

    if (!subconversationGroupId) {
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
    } catch (error) {
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
    if (!subconversationGroupId) {
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

    const forwardNewEpoch = async ({groupId}: {groupId: string; epoch: number}) => {
      this.logger.debug('Received MLS NEW_EPOCH event', {eventGroupId: groupId, subconversationGroupId});
      if (groupId !== subconversationGroupId) {
        // if the epoch update did not happen in the subconversation directly, check if it happened in the parent conversation
        const parentConversationId = findConversationByGroupId(groupId);
        if (!parentConversationId) {
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

      if (!subconversationEpochInfo) {
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

    await forwardNewEpoch({groupId: subconversationGroupId, epoch: initialEpoch});

    this.logger.info('Subscribed to MLS NEW_EPOCH events for subconversation', {subconversationGroupId});
    return () => this.mlsService.off(MLSServiceEvents.NEW_EPOCH, forwardNewEpoch);
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

    if (!subconversationGroupId) {
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

    const isSubconversationMember = subconversationMembers.some(
      ({userId, clientId, domain}) =>
        constructFullyQualifiedClientId(userId, clientId, domain) === clientToRemoveQualifiedId,
    );

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
    } catch (error) {
      this.logger.error('Failed to remove client from subconversation', {
        subconversationGroupId,
        clientToRemoveQualifiedId,
        error,
      });
    }
  }

  private async joinSubconversationByExternalCommit(conversationId: QualifiedId, subconversation: SUBCONVERSATION_ID) {
    try {
      this.logger.info('Joining subconversation by external commit', {conversationId, subconversation});
      await this.mlsService.joinByExternalCommit(() =>
        this.apiClient.api.conversation.getSubconversationGroupInfo(conversationId, subconversation),
      );
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      const isSubconversationMember = subconversationMemberIds.some(
        ({userId, clientId, domain}) =>
          constructFullyQualifiedClientId(userId, clientId, domain) ===
          constructFullyQualifiedClientId(parentMember.userId, parentMember.clientId, parentMember.domain),
      );

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
    const foundSubconversations = allSubconversations.filter(
      subconversation => subconversation.subconversationId === subconversationId,
    );
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
  ) => {
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
  ) => {
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
