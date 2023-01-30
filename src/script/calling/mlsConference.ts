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

import {Subconversation} from '@wireapp/api-client/lib/conversation/Subconversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {MLSService} from '@wireapp/core/lib/messagingProtocols/mls';

import {SubconversationEpochInfoMember} from './CallingRepository';

const generateSubconversationMembers = async (
  {mlsService}: {mlsService: MLSService},
  conversationId: QualifiedId,
  subconversation: Subconversation,
): Promise<SubconversationEpochInfoMember[]> => {
  const parentGroupId = await mlsService.getGroupIdFromConversationId(conversationId);
  const memberIds = await mlsService.getClientIds(parentGroupId);

  const members = memberIds.map(parentMember => {
    const isSubconversationMember = !!subconversation.members.find(
      ({user_id, client_id}) => user_id === parentMember.userId && client_id === parentMember.clientId,
    );

    return {
      userid: `${parentMember.userId}@${parentMember.domain}`,
      clientid: parentMember.clientId,
      in_subconv: isSubconversationMember,
    };
  });

  return members;
};

export const getSubconversationEpochInfo = async (
  {mlsService}: {mlsService: MLSService},
  conversationId: QualifiedId,
  subconversation: Subconversation,
): Promise<{
  members: SubconversationEpochInfoMember[];
  epoch: number;
  secretKey: string;
  keyLength: number;
}> => {
  const members = await generateSubconversationMembers({mlsService}, conversationId, subconversation);

  const epoch = Number(await mlsService.getEpoch(subconversation.group_id));

  const keyLength = 32;
  const secretKey = await mlsService.exportSecretKey(subconversation.group_id, keyLength);

  return {members, epoch, keyLength, secretKey};
};

export const subscribeToEpochUpdates = async (
  {mlsService}: {mlsService: MLSService},
  conversationId: QualifiedId,
  onEpochUpdate: (info: {
    members: SubconversationEpochInfoMember[];
    epoch: number;
    secretKey: string;
    keyLength: number;
  }) => void,
): Promise<() => void> => {
  const initialSubconversation = await mlsService.joinConferenceSubconversation(conversationId);

  const forwardNewEpoch = async ({groupId, epoch}: {groupId: string; epoch: number}) => {
    if (groupId !== initialSubconversation.group_id) {
      return;
    }

    const subconversation = await mlsService.getConferenceSubconversation(conversationId);

    const {keyLength, secretKey, members} = await getSubconversationEpochInfo(
      {mlsService},
      conversationId,
      subconversation,
    );
    onEpochUpdate({epoch: Number(epoch), keyLength, secretKey, members});
  };

  mlsService.on('newEpoch', forwardNewEpoch);

  await forwardNewEpoch({groupId: initialSubconversation.group_id, epoch: initialSubconversation.epoch});

  return () => mlsService.off('newEpoch', forwardNewEpoch);
};
