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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {
  MixedConversation,
  isMLSConversation,
  isMixedConversation,
} from 'Repositories/conversation/ConversationSelectors';
import {Conversation} from 'Repositories/entity/Conversation';

import {MLSMigrationStatus} from '../migrationStatus';
import {mlsMigrationLogger} from '../MLSMigrationLogger';

type UpdateConversationProtocol = (
  conversation: Conversation,
  protocol: CONVERSATION_PROTOCOL.MLS | CONVERSATION_PROTOCOL.MIXED,
) => Promise<Conversation>;

export const finaliseMigrationOfMixedConversations = async (
  conversations: Conversation[],
  updateConversationProtocol: UpdateConversationProtocol,
  getTeamMLSMigrationStatus: () => MLSMigrationStatus,
) => {
  const mixedConversatons = conversations.filter(isMixedConversation);
  mlsMigrationLogger.info(
    `There are ${mixedConversatons.length} mixed conversations, checking if they are ready to be finalised...`,
  );

  for (const mixedConversation of mixedConversatons) {
    await checkFinalisationCriteria(mixedConversation, getTeamMLSMigrationStatus, () =>
      finaliseMigrationOfMixedConversation(mixedConversation, updateConversationProtocol),
    );
  }
};

const checkFinalisationCriteria = async (
  mixedConversation: MixedConversation,
  getTeamMLSMigrationStatus: () => MLSMigrationStatus,
  onReadyToFinalise: (mixedConversation: MixedConversation) => Promise<void>,
) => {
  const migrationStatus = getTeamMLSMigrationStatus();
  const isMigrationFinalised = migrationStatus === MLSMigrationStatus.FINALISED;

  if (isMigrationFinalised || doAllConversationParticipantsSupportMLS(mixedConversation)) {
    mlsMigrationLogger.info(`Conversation ${mixedConversation.id} is ready to finalise the migration, finalising...`);
    return onReadyToFinalise(mixedConversation);
  }
};

const doAllConversationParticipantsSupportMLS = (mixedConversation: MixedConversation): boolean => {
  return mixedConversation
    .participating_user_ets()
    .every(user => user.supportedProtocols()?.includes(CONVERSATION_PROTOCOL.MLS));
};

const finaliseMigrationOfMixedConversation = async (
  mixedConversation: MixedConversation,
  updateConversationProtocol: UpdateConversationProtocol,
) => {
  mlsMigrationLogger.info(`Finalising migration of mixed conversation ${mixedConversation.id}...`);
  try {
    // Update conversation protocol from "mixed" to "mls".
    const updatedMLSConversation = await updateConversationProtocol(mixedConversation, CONVERSATION_PROTOCOL.MLS);

    //we have to make sure that conversation's protocol has really changed to MLS
    if (!isMLSConversation(updatedMLSConversation)) {
      throw new Error(`Conversation ${updatedMLSConversation.qualifiedId.id} has not updated its protocol to MLS.`);
    }
  } catch (error) {
    mlsMigrationLogger.error(`Failed to finalise migration of mixed conversation ${mixedConversation.id}.`, error);
  }
};
