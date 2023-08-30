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

import {SUBCONVERSATION_ID} from '@wireapp/api-client/lib/conversation/Subconversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {MLSService} from '@wireapp/core/lib/messagingProtocols/mls';
import {constructFullyQualifiedClientId} from '@wireapp/core/lib/util/fullyQualifiedClientIdUtils';

import {SubconversationEpochInfoMember} from './CallingRepository';

import {ConversationState} from '../conversation/ConversationState';

const KEY_LENGTH = 32;

const generateSubconversationMembers = async (
  {mlsService}: {mlsService: MLSService},
  subconversationGroupId: string,
  parentGroupId: string,
): Promise<SubconversationEpochInfoMember[]> => {
  const subconversationMemberIds = await mlsService.getClientIds(subconversationGroupId);
  const parentMemberIds = await mlsService.getClientIds(parentGroupId);

  return parentMemberIds.map(parentMember => {
    const isSubconversationMember = subconversationMemberIds.some(
      ({userId, clientId, domain}) =>
        constructFullyQualifiedClientId(userId, clientId, domain) ===
        constructFullyQualifiedClientId(parentMember.userId, parentMember.clientId, parentMember.domain),
    );

    return {
      userid: `${parentMember.userId}@${parentMember.domain}`,
      clientid: parentMember.clientId,
      in_subconv: isSubconversationMember,
    };
  });
};

export const getSubconversationEpochInfo = async (
  {mlsService}: {mlsService: MLSService},
  conversationId: QualifiedId,
  shouldAdvanceEpoch = false,
): Promise<{
  members: SubconversationEpochInfoMember[];
  epoch: number;
  secretKey: string;
  keyLength: number;
}> => {
  const subconversationGroupId = await mlsService.getGroupIdFromConversationId(
    conversationId,
    SUBCONVERSATION_ID.CONFERENCE,
  );

  const parentGroupId = await mlsService.getGroupIdFromConversationId(conversationId);

  // this method should not be called if the subconversation (and its parent conversation) is not established
  if (!subconversationGroupId || !parentGroupId) {
    throw new Error(
      `Could not obtain epoch info for conference subconversation of conversation ${JSON.stringify(
        conversationId,
      )}: parent or subconversation group ID is missing`,
    );
  }

  const members = await generateSubconversationMembers({mlsService}, subconversationGroupId, parentGroupId);

  if (shouldAdvanceEpoch) {
    await mlsService.renewKeyMaterial(subconversationGroupId);
  }

  const epoch = Number(await mlsService.getEpoch(subconversationGroupId));

  const secretKey = await mlsService.exportSecretKey(subconversationGroupId, KEY_LENGTH);

  return {members, epoch, keyLength: KEY_LENGTH, secretKey};
};

export const subscribeToEpochUpdates = async (
  {mlsService, conversationState}: {mlsService: MLSService; conversationState: ConversationState},
  conversationId: QualifiedId,
  onEpochUpdate: (info: {
    members: SubconversationEpochInfoMember[];
    epoch: number;
    secretKey: string;
    keyLength: number;
  }) => void,
): Promise<() => void> => {
  const {epoch: initialEpoch, groupId: subconversationGroupId} =
    await mlsService.joinConferenceSubconversation(conversationId);

  const forwardNewEpoch = async ({groupId, epoch}: {groupId: string; epoch: number}) => {
    if (groupId !== subconversationGroupId) {
      // if the epoch update did not happen in the subconversation directly, check if it happened in the parent conversation
      const parentConversation = conversationState.findConversationByGroupId(groupId);
      if (!parentConversation) {
        return;
      }

      const foundSubconversationGroupId = await mlsService.getGroupIdFromConversationId?.(
        parentConversation.qualifiedId,
        SUBCONVERSATION_ID.CONFERENCE,
      );

      // if the conference subconversation of parent conversation is not known, ignore the epoch update
      if (foundSubconversationGroupId !== subconversationGroupId) {
        return;
      }
    }

    const {keyLength, secretKey, members} = await getSubconversationEpochInfo({mlsService}, conversationId);

    return onEpochUpdate({epoch: Number(epoch), keyLength, secretKey, members});
  };

  mlsService.on('newEpoch', forwardNewEpoch);

  await forwardNewEpoch({groupId: subconversationGroupId, epoch: initialEpoch});

  return () => mlsService.off('newEpoch', forwardNewEpoch);
};
