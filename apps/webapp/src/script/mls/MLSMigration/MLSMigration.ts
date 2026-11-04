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

import {isNonEmptyString} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import type {Account} from '@wireapp/core';

import {MLSMigrationStatus} from './migrationStatus';
import {mlsMigrationLogger} from './MLSMigrationLogger';

import type {ConversationRepository} from '../../repositories/conversation/ConversationRepository';
import type {Conversation} from '../../repositories/entity/Conversation';
import type {User} from '../../repositories/entity/User';
import {TIME_IN_MILLIS} from '../../util/timeUtil';

const MIGRATION_TASK_KEY = 'mls-migration';

type RegisterRecurringTask = Account['recurringTaskScheduler']['registerTask'];

type ConversationSelectionRepository = Pick<
  ConversationRepository,
  'getAllTeamGroupConversations' | 'getAllGroupConversations'
>;

export type MLSMigrationFlowDependencies = {
  readonly isMLSSupportedByEnvironment: () => Promise<boolean>;
  readonly registerTask: RegisterRecurringTask;
  readonly initialiseMigrationOfProteusConversations: (
    conversations: Conversation[],
    selfUserId: QualifiedId,
  ) => Promise<void>;
  readonly joinUnestablishedMixedConversations: (
    conversations: Conversation[],
    selfUserId: QualifiedId,
  ) => Promise<void>;
  readonly finaliseMigrationOfMixedConversations: (conversations: Conversation[]) => Promise<void>;
};

type InitialiseMLSMigrationFlowOptions = {
  readonly selfUser: User;
  readonly conversationRepository: ConversationSelectionRepository;
  readonly getTeamMLSMigrationStatus: () => MLSMigrationStatus;
  readonly refreshAllKnownUsers: () => Promise<void>;
  readonly dependencies: MLSMigrationFlowDependencies;
};

type MigrateConversationsToMLSOptions = {
  readonly selfUser: User;
  readonly conversationRepository: ConversationSelectionRepository;
  readonly refreshAllKnownUsers: () => Promise<void>;
  readonly dependencies: Pick<
    MLSMigrationFlowDependencies,
    | 'initialiseMigrationOfProteusConversations'
    | 'joinUnestablishedMixedConversations'
    | 'finaliseMigrationOfMixedConversations'
  >;
};

/**
 * Checks the migration configuration immediately and schedules another check every 24 hours.
 */
export async function initialiseMLSMigrationFlow(options: InitialiseMLSMigrationFlowOptions): Promise<void> {
  const {selfUser, conversationRepository, getTeamMLSMigrationStatus, refreshAllKnownUsers, dependencies} = options;

  async function checkMigrationConfig(): Promise<void> {
    const isMLSSupportedByEnvironment = await dependencies.isMLSSupportedByEnvironment();
    if (!isMLSSupportedByEnvironment) {
      return;
    }

    const isMLSSupportedByUser = selfUser.supportedProtocols()?.includes(CONVERSATION_PROTOCOL.MLS);
    if (isMLSSupportedByUser !== true) {
      return;
    }

    const migrationStatus = getTeamMLSMigrationStatus();

    if (migrationStatus === MLSMigrationStatus.DISABLED) {
      mlsMigrationLogger.info('MLS migration feature is disabled, will retry in 24 hours or on next app reload.');
      return;
    }

    if (migrationStatus === MLSMigrationStatus.NOT_STARTED) {
      mlsMigrationLogger.info(
        'MLS migration start time has not arrived yet, will retry in 24 hours or on next app reload.',
      );
      return;
    }

    mlsMigrationLogger.info(
      'MLS migration start time has arrived, will start the migration process for all the conversations.',
    );

    return migrateConversationsToMLS({selfUser, conversationRepository, refreshAllKnownUsers, dependencies});
  }

  await checkMigrationConfig();

  await dependencies.registerTask({
    every: TIME_IN_MILLIS.DAY,
    task: checkMigrationConfig,
    key: MIGRATION_TASK_KEY,
  });
}

async function migrateConversationsToMLS(options: MigrateConversationsToMLSOptions): Promise<void> {
  const {selfUser, conversationRepository, refreshAllKnownUsers, dependencies} = options;

  // Refresh users so their supported protocols are current before migration decisions are made.
  await refreshAllKnownUsers();

  const selfTeamGroupConversations = isNonEmptyString(selfUser.teamId)
    ? conversationRepository.getAllTeamGroupConversations()
    : undefined;

  if (selfTeamGroupConversations !== undefined) {
    await dependencies.initialiseMigrationOfProteusConversations(selfTeamGroupConversations, selfUser.qualifiedId);
  }

  const allGroupConversations = conversationRepository.getAllGroupConversations();
  await dependencies.joinUnestablishedMixedConversations(allGroupConversations, selfUser.qualifiedId);

  if (selfTeamGroupConversations !== undefined) {
    await dependencies.finaliseMigrationOfMixedConversations(selfTeamGroupConversations);
  }
}
