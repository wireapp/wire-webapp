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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {container} from 'tsyringe';

import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {Core as CoreSingleton} from 'src/script/service/CoreSingleton';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {finaliseMigrationOfMixedConversations} from './finaliseMigration';
import {initialiseMigrationOfProteusConversations} from './initialiseMigration';
import {joinUnestablishedMixedConversations} from './initialiseMigration/joinUnestablishedMixedConversations';
import {MLSMigrationStatus} from './migrationStatus';
import {mlsMigrationLogger} from './MLSMigrationLogger';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

const MIGRATION_TASK_KEY = 'mls-migration';

interface InitialiseMLSMigrationFlowParams {
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  userRepository: UserRepository;
  selfUserId: QualifiedId;
}

/**
 * Will check the config of MLS migration feature and if the start time has arrived, will start (continue) the migration process based on the current state of the conversations and feature config.
 *
 * @param teamRepository - team repository
 * @param conversationRepository - conversation repository
 * @param userRepository - user repository
 * @param selfUserId - self user id
 */
export const initialiseMLSMigrationFlow = async ({
  teamRepository,
  conversationRepository,
  userRepository,
  selfUserId,
}: InitialiseMLSMigrationFlowParams) => {
  const core = container.resolve(CoreSingleton);

  return periodicallyCheckMigrationConfig(
    () =>
      migrateConversationsToMLS({
        teamRepository,
        core,
        conversationRepository,
        userRepository,
        selfUserId,
      }),
    {teamRepository},
  );
};

interface CheckMigrationConfigParams {
  teamRepository: TeamRepository;
}

const periodicallyCheckMigrationConfig = async (
  onMigrationStartTimeArrived: () => Promise<void>,
  {teamRepository}: CheckMigrationConfigParams,
) => {
  const checkMigrationConfigTask = () => checkMigrationConfig(onMigrationStartTimeArrived, {teamRepository});

  // We check the migration config immediately (on app load) and every 24 hours
  await checkMigrationConfigTask();

  registerRecurringTask({
    every: TIME_IN_MILLIS.DAY,
    task: checkMigrationConfigTask,
    key: MIGRATION_TASK_KEY,
  });
};

const checkMigrationConfig = async (
  onMigrationStartTimeArrived: () => Promise<void>,
  {teamRepository}: CheckMigrationConfigParams,
) => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment();

  if (!isMLSSupportedByEnv) {
    return;
  }
  //at this point we know that MLS is supported by environment, we can check MLS migration status

  //fetch current mls migration feature config from memory
  const migrationStatus = teamRepository.getTeamMLSMigrationStatus();

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
  conversationRepository: ConversationRepository;
  userRepository: UserRepository;
  teamRepository: TeamRepository;
}

const migrateConversationsToMLS = async ({
  core,
  selfUserId,
  conversationRepository,
  userRepository,
  teamRepository,
}: MigrateConversationsToMLSParams) => {
  //refetch all known users so we have the latest lists of the protocols they support
  await userRepository.refreshAllKnownUsers();

  //TODO: implement logic for 1on1 conversations (both team owned and federated)
  const conversations = conversationRepository.getAllSelfTeamOwnedGroupConversations();

  await initialiseMigrationOfProteusConversations(conversations, {
    core,
    conversationRepository,
    selfUserId,
  });

  await joinUnestablishedMixedConversations(conversations, {core});

  await finaliseMigrationOfMixedConversations(conversations, {conversationRepository, teamRepository});
};
