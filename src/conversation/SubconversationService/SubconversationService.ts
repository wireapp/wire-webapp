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
    const subconversationGroupId = await this.getSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);

    if (!subconversationGroupId) {
      return;
    }

    const doesGroupExistLocally = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesGroupExistLocally) {
      // If the subconversation was known by a client but is does not exist locally, we can remove it from the store.
      return this.clearSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    }

    try {
      await this.apiClient.api.conversation.deleteSubconversationSelf(conversationId, SUBCONVERSATION_ID.CONFERENCE);
    } catch (error) {
      this.logger.error(`Failed to leave conference subconversation:`, error);
    }

    await this.mlsService.wipeConversation(subconversationGroupId);

    // once we've left the subconversation, we can remove it from the store
    await this.clearSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);
  }

  public async leaveStaleConferenceSubconversations(): Promise<void> {
    const conversationIds = await this.getAllGroupIdsBySubconversationId(SUBCONVERSATION_ID.CONFERENCE);

    for (const {parentConversationId} of conversationIds) {
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
    const subconversationGroupId = await this.getSubconversationGroupId(
      parentConversationId,
      SUBCONVERSATION_ID.CONFERENCE,
    );

    // this method should not be called if the subconversation (and its parent conversation) is not established
    if (!subconversationGroupId) {
      this.logger.error(
        `Could not obtain epoch info for conference subconversation of conversation ${JSON.stringify(
          parentConversationId,
        )}: parent or subconversation group ID is missing`,
      );

      return null;
    }

    //we don't want to react to avs callbacks when conversation was not yet established
    const doesMLSGroupExist = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesMLSGroupExist) {
      return null;
    }

    const members = await this.generateSubconversationMembers(subconversationGroupId, parentConversationGroupId);

    if (shouldAdvanceEpoch) {
      await this.mlsService.renewKeyMaterial(subconversationGroupId);
    }

    const epoch = Number(await this.mlsService.getEpoch(subconversationGroupId));

    const secretKey = await this.mlsService.exportSecretKey(subconversationGroupId, MLS_CONVERSATION_KEY_LENGTH);

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
    const {epoch: initialEpoch, groupId: subconversationGroupId} = await this.joinConferenceSubconversation(
      parentConversationId,
      parentConversationGroupId,
    );

    const forwardNewEpoch = async ({groupId}: {groupId: string; epoch: number}) => {
      if (groupId !== subconversationGroupId) {
        // if the epoch update did not happen in the subconversation directly, check if it happened in the parent conversation
        const parentConversationId = findConversationByGroupId(groupId);
        if (!parentConversationId) {
          return;
        }

        const foundSubconversationGroupId = await this.getSubconversationGroupId(
          parentConversationId,
          SUBCONVERSATION_ID.CONFERENCE,
        );

        // if the conference subconversation of parent conversation is not known, ignore the epoch update
        if (foundSubconversationGroupId !== subconversationGroupId) {
          return;
        }
      }

      const subconversationEpochInfo = await this.getSubconversationEpochInfo(
        parentConversationId,
        parentConversationGroupId,
      );

      if (!subconversationEpochInfo) {
        return;
      }

      const newSubconversationEpoch = Number(await this.mlsService.getEpoch(subconversationGroupId));

      return onEpochUpdate({
        ...subconversationEpochInfo,
        epoch: newSubconversationEpoch,
      });
    };

    this.mlsService.on(MLSServiceEvents.NEW_EPOCH, forwardNewEpoch);

    await forwardNewEpoch({groupId: subconversationGroupId, epoch: initialEpoch});

    return () => this.mlsService.off(MLSServiceEvents.NEW_EPOCH, forwardNewEpoch);
  }

  public async removeClientFromConferenceSubconversation(
    conversationId: QualifiedId,
    clientToRemove: {user: QualifiedId; clientId: string},
  ): Promise<void> {
    const subconversationGroupId = await this.getSubconversationGroupId(conversationId, SUBCONVERSATION_ID.CONFERENCE);

    if (!subconversationGroupId) {
      return;
    }

    const doesMLSGroupExist = await this.mlsService.conversationExists(subconversationGroupId);
    if (!doesMLSGroupExist) {
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
      return;
    }

    return void this.mlsService.removeClientsFromConversation(subconversationGroupId, [clientToRemoveQualifiedId]);
  }

  private async joinSubconversationByExternalCommit(conversationId: QualifiedId, subconversation: SUBCONVERSATION_ID) {
    await this.mlsService.joinByExternalCommit(() =>
      this.apiClient.api.conversation.getSubconversationGroupInfo(conversationId, subconversation),
    );
  }

  private async getConferenceSubconversation(conversationId: QualifiedId): Promise<Subconversation> {
    return this.apiClient.api.conversation.getSubconversation(conversationId, SUBCONVERSATION_ID.CONFERENCE);
  }

  private async deleteConferenceSubconversation(
    conversationId: QualifiedId,
    data: {groupId: string; epoch: number},
  ): Promise<void> {
    return this.apiClient.api.conversation.deleteSubconversation(conversationId, SUBCONVERSATION_ID.CONFERENCE, data);
  }

  private async generateSubconversationMembers(
    subconversationGroupId: string,
    parentGroupId: string,
  ): Promise<SubconversationEpochInfoMember[]> {
    const subconversationMemberIds = await this.mlsService.getClientIds(subconversationGroupId);
    const parentMemberIds = await this.mlsService.getClientIds(parentGroupId);

    return parentMemberIds.map(parentMember => {
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
  }

  public getSubconversationGroupId = async (
    parentConversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<string | undefined> => {
    const foundSubconversation = await this.coreDatabase.get(
      'subconversations',
      generateSubconversationStoreKey(parentConversationId, subconversationId),
    );

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
    const allSubconversations = await this.coreDatabase.getAll('subconversations');
    const foundSubconversations = allSubconversations.filter(
      subconversation => subconversation.subconversationId === subconversationId,
    );

    return foundSubconversations;
  };

  public saveSubconversationGroupId = async (
    parentConversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
    groupId: string,
  ) => {
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
    return this.coreDatabase.delete(
      'subconversations',
      generateSubconversationStoreKey(parentConversationId, subconversationId),
    );
  };
}
