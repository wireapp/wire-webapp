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

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {APIClient as APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {Core as CoreSingleton} from 'src/script/service/CoreSingleton';
import {TeamState} from 'src/script/team/TeamState';
import {UserRepository} from 'src/script/user/UserRepository';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {finaliseMigrationOfMixedConversations} from './finaliseMigration';
import {initialiseMigrationOfProteusConversations} from './initialiseMigration';
import {joinUnestablishedMixedConversations} from './initialiseMigration/joinUnestablishedMixedConversations';
import {getMLSMigrationStatus, MLSMigrationStatus} from './migrationStatus';
import {mlsMigrationLogger} from './MLSMigrationLogger';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

const MIGRATION_TASK_KEY = 'mls-migration';

interface InitialiseMLSMigrationFlowParams {
  teamState: TeamState;
  conversationRepository: ConversationRepository;
  userRepository: UserRepository;
  selfUserId: QualifiedId;
}

/**
 * Will check the config of MLS migration feature and if the start time has arrived, will start (continue) the migration process based on the current state of the conversations and feature config.
 *
 * @param teamState - team state
 * @param conversationRepository - conversation repository
 */
export const initialiseMLSMigrationFlow = async ({
  teamState,
  conversationRepository,
  userRepository,
  selfUserId,
}: InitialiseMLSMigrationFlowParams) => {
  const core = container.resolve(CoreSingleton);
  const apiClient = container.resolve(APIClientSingleton);

  return periodicallyCheckMigrationConfig(
    () =>
      migrateConversationsToMLS({
        teamState,
        core,
        conversationRepository,
        userRepository,
        selfUserId,
      }),
    {apiClient, teamState},
  );
};

interface CheckMigrationConfigParams {
  apiClient: APIClient;
  teamState: TeamState;
}

const periodicallyCheckMigrationConfig = async (
  onMigrationStartTimeArrived: () => Promise<void>,
  {apiClient, teamState}: CheckMigrationConfigParams,
) => {
  const checkMigrationConfigTask = () => checkMigrationConfig(onMigrationStartTimeArrived, {apiClient, teamState});

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
  {apiClient, teamState}: CheckMigrationConfigParams,
) => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({apiClient});

  if (!isMLSSupportedByEnv) {
    return;
  }
  //at this point we know that MLS is supported by environment, we can check MLS migration status

  //fetch current mls migration feature config from memory
  const mlsMigrationFeature = teamState.teamFeatures().mlsMigration;
  const migrationStatus = getMLSMigrationStatus(mlsMigrationFeature);

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
  teamState: TeamState;
}

const migrateConversationsToMLS = async ({
  core,
  selfUserId,
  conversationRepository,
  userRepository,
  teamState,
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

  await finaliseMigrationOfMixedConversations(conversations, {conversationRepository, teamState});
};
