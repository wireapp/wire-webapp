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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';
import {TeamState} from 'src/script/team/TeamState';

import {MLSMigrationStatus, getMLSMigrationStatus} from '../migrationStatus';
import {mlsMigrationLogger} from '../MLSMigrationLogger';

export const finaliseMigrationOfMixedConversations = async (
  mixedConversatons: MixedConversation[],
  {teamState}: {teamState: TeamState},
) => {
  mlsMigrationLogger.info(
    `There are ${mixedConversatons.length} mixed conversations, checking if they are ready to be finalised...`,
  );

  for (const mixedConversation of mixedConversatons) {
    await checkFinalisationCriteria(mixedConversation, finaliseMigrationOfMixedConversation, {teamState});
  }
};

const checkFinalisationCriteria = async (
  mixedConversation: MixedConversation,
  onReadyToFinalise: (mixedConversation: MixedConversation) => Promise<void>,
  {teamState}: {teamState: TeamState},
) => {
  const mlsMigrationFeature = teamState.teamFeatures().mlsMigration;
  const migrationStatus = getMLSMigrationStatus(mlsMigrationFeature);
  const isMigrationFinalised = migrationStatus === MLSMigrationStatus.FINALISED;

  if (isMigrationFinalised || doAllConversationParticipantsSupportMLS(mixedConversation)) {
    mlsMigrationLogger.info(`Conversation ${mixedConversation.id} is ready to finalise the migration, finalising...`);
    return onReadyToFinalise(mixedConversation);
  }
};

const doAllConversationParticipantsSupportMLS = (mixedConversation: MixedConversation): boolean => {
  return mixedConversation
    .participating_user_ets()
    .every(user => user.supportedProtocols().includes(ConversationProtocol.MLS));
};

const finaliseMigrationOfMixedConversation = async (mixedConversation: MixedConversation) => {
  mlsMigrationLogger.info(`Finalising migration of mixed conversation ${mixedConversation.id}...`);
};
