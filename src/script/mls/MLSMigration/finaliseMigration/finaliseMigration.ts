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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {MixedConversation, isMLSConversation, isMixedConversation} from 'src/script/conversation/ConversationSelectors';
import {Conversation} from 'src/script/entity/Conversation';
import {TeamRepository} from 'src/script/team/TeamRepository';

import {MLSMigrationStatus} from '../migrationStatus';
import {mlsMigrationLogger} from '../MLSMigrationLogger';

export const finaliseMigrationOfMixedConversations = async (
  conversations: Conversation[],
  {
    teamRepository,
    conversationRepository,
  }: {teamRepository: TeamRepository; conversationRepository: ConversationRepository},
) => {
  const mixedConversatons = conversations.filter(isMixedConversation);
  mlsMigrationLogger.info(
    `There are ${mixedConversatons.length} mixed conversations, checking if they are ready to be finalised...`,
  );

  for (const mixedConversation of mixedConversatons) {
    await checkFinalisationCriteria(
      mixedConversation,
      () => finaliseMigrationOfMixedConversation(mixedConversation, {conversationRepository}),
      teamRepository,
    );
  }
};

const checkFinalisationCriteria = async (
  mixedConversation: MixedConversation,
  onReadyToFinalise: (mixedConversation: MixedConversation) => Promise<void>,
  teamRepository: TeamRepository,
) => {
  const migrationStatus = teamRepository.getTeamMLSMigrationStatus();
  const isMigrationFinalised = migrationStatus === MLSMigrationStatus.FINALISED;

  if (isMigrationFinalised || doAllConversationParticipantsSupportMLS(mixedConversation)) {
    mlsMigrationLogger.info(`Conversation ${mixedConversation.id} is ready to finalise the migration, finalising...`);
    return onReadyToFinalise(mixedConversation);
  }
};

const doAllConversationParticipantsSupportMLS = (mixedConversation: MixedConversation): boolean => {
  return mixedConversation
    .participating_user_ets()
    .every(user => user.supportedProtocols()?.includes(ConversationProtocol.MLS));
};

const finaliseMigrationOfMixedConversation = async (
  mixedConversation: MixedConversation,
  {conversationRepository}: {conversationRepository: ConversationRepository},
) => {
  mlsMigrationLogger.info(`Finalising migration of mixed conversation ${mixedConversation.id}...`);
  try {
    //update protocol to mls
    //update conversation protocol on both backend and local store
    const updatedMLSConversation = await conversationRepository.updateConversationProtocol(
      mixedConversation,
      ConversationProtocol.MLS,
    );

    //we have to make sure that conversation's protocol has really changed to MLS
    if (!isMLSConversation(updatedMLSConversation)) {
      throw new Error(`Conversation ${updatedMLSConversation.qualifiedId.id} has not updated its protocol to MLS.`);
    }
  } catch (error) {
    mlsMigrationLogger.error(`Failed to finalise migration of mixed conversation ${mixedConversation.id}.`, error);
  }
};
