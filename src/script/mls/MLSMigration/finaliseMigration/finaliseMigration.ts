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

import {MixedConversation} from 'src/script/conversation/ConversationSelectors';

import {mlsMigrationLogger} from '../MLSMigrationLogger';

export const finaliseMigrationOfMixedConversations = async (mixedConversations: MixedConversation[]) => {
  mlsMigrationLogger.info(
    `There are ${mixedConversations.length} mixed conversations, checking if they are ready to finalise...`,
  );

  for (const mixedConversation of mixedConversations) {
    await checkFinalisationCriteria(mixedConversation, finaliseMigrationOfMixedConversation);
  }
};

export const finaliseMigrationOfMixedConversation = async (mixedConversation: MixedConversation) => {
  mlsMigrationLogger.info(`Finalising migration of mixed conversation ${mixedConversation.qualifiedId.id}...`);
};

const checkFinalisationCriteria = async (
  mixedConversation,
  onFinalisationReady: (mixedConversation: MixedConversation) => Promise<void>,
) => {
  mlsMigrationLogger.info('Checking migration finalisation criteria');
};
