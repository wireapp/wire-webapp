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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {Account} from '@wireapp/core';

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {Core as CoreSingleton} from 'src/script/service/CoreSingleton';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {finaliseMigrationOfMixedConversations} from './migrationFinaliser';
import {initialiseMigrationOfProteusConversations, joinUnestablishedMixedConversations} from './migrationInitialiser';
import {MLSMigrationStatus} from './migrationStatus';
import {mlsMigrationLogger} from './MLSMigrationLogger';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

const MIGRATION_TASK_KEY = 'mls-migration';

interface MLSMigrationConversationHandler {
  getAllGroupConversations: () => Conversation[];
  getAllTeamGroupConversations: () => Conversation[];
  updateConversationProtocol: (
    conversation: Conversation,
    protocol: ConversationProtocol.MLS | ConversationProtocol.MIXED,
  ) => Promise<Conversation>;
  tryEstablishingMLSGroup: (params: {
    groupId: string;
    conversationId: QualifiedId;
    selfUserId: QualifiedId;
    qualifiedUsers: QualifiedId[];
  }) => Promise<void>;
}

interface InitialiseMLSMigrationFlowParams {
  selfUser: User;
  conversationHandler: MLSMigrationConversationHandler;
  getTeamMLSMigrationStatus: () => MLSMigrationStatus;
  refreshAllKnownUsers: () => Promise<void>;
}

/**
 * Will check the config of MLS migration feature and if the start time has arrived, will start (continue) the migration process based on the current state of the conversations and feature config.
 *
 * @param selfUser - the current user
 */
export const initialiseMLSMigrationFlow = async ({
  selfUser,
  conversationHandler,
  getTeamMLSMigrationStatus,
  refreshAllKnownUsers,
}: InitialiseMLSMigrationFlowParams) => {
  const core = container.resolve(CoreSingleton);

  return periodicallyCheckMigrationConfig(
    selfUser,
    getTeamMLSMigrationStatus,
    () =>
      migrateConversationsToMLS({
        core,
        selfUserId: selfUser.qualifiedId,
        conversationHandler,
        getTeamMLSMigrationStatus,
        refreshAllKnownUsers,
      }),
    core,
  );
};

const periodicallyCheckMigrationConfig = async (
  selfUser: User,
  getTeamMLSMigrationStatus: () => MLSMigrationStatus,
  onMigrationStartTimeArrived: () => Promise<void>,
  core: Account,
) => {
  const checkMigrationConfigTask = () =>
    checkMigrationConfig(selfUser, getTeamMLSMigrationStatus, onMigrationStartTimeArrived);

  // We check the migration config immediately (on app load) and every 24 hours
  await checkMigrationConfigTask();

  return core.recurringTaskScheduler.registerTask({
    every: TIME_IN_MILLIS.DAY,
    task: checkMigrationConfigTask,
    key: MIGRATION_TASK_KEY,
  });
};

const checkMigrationConfig = async (
  selfUser: User,
  getTeamMLSMigrationStatus: () => MLSMigrationStatus,
  onMigrationStartTimeArrived: () => Promise<void>,
) => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();
  if (!isMLSSupportedByEnv) {
    return;
  }

  const isMLSSupportedByUser = selfUser.supportedProtocols()?.includes(ConversationProtocol.MLS);
  if (!isMLSSupportedByUser) {
    return;
  }

  //at this point we know that MLS is supported by environment, and the user itself we can check MLS migration status

  //fetch current mls migration feature config from memory
  const migrationStatus = getTeamMLSMigrationStatus();

  if (migrationStatus === MLSMigrationStatus.DISABLED) {
    mlsMigrationLogger.info('MLS migration feature is disabled, will retry in 24 hours or on next app reload.');
    return;
  }

  mlsMigrationLogger.info('MLS migration feature enabled, checking the configuration...');

  if (migrationStatus === MLSMigrationStatus.NOT_STARTED) {
    mlsMigrationLogger.info(
      'MLS migration start time has not arrived yet, will retry in 24 hours or on next app reload.',
    );
    return;
  }

  mlsMigrationLogger.info(
    'MLS migration start time has arrived, will start the migration process for all the conversations.',
  );
  return onMigrationStartTimeArrived();
};

interface MigrateConversationsToMLSParams {
  core: Account;
  selfUserId: QualifiedId;
  conversationHandler: MLSMigrationConversationHandler;
  refreshAllKnownUsers: () => Promise<void>;
  getTeamMLSMigrationStatus: () => MLSMigrationStatus;
}

const migrateConversationsToMLS = async ({
  core,
  selfUserId,
  conversationHandler,
  refreshAllKnownUsers,
  getTeamMLSMigrationStatus,
}: MigrateConversationsToMLSParams) => {
  //refetch all known users so we have the latest lists of the protocols they support
  await refreshAllKnownUsers();

  const selfTeamGroupConversations = conversationHandler.getAllGroupConversations();

  await initialiseMigrationOfProteusConversations(selfTeamGroupConversations, selfUserId, conversationHandler);

  const allGroupConversations = conversationHandler.getAllGroupConversations();
  await joinUnestablishedMixedConversations(allGroupConversations, selfUserId, {
    core,
    conversationHandler,
  });

  await finaliseMigrationOfMixedConversations(
    selfTeamGroupConversations,
    conversationHandler.updateConversationProtocol,
    getTeamMLSMigrationStatus,
  );
};
