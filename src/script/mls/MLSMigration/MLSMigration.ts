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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {groupConversationsByProtocol} from 'src/script/conversation/groupConversationsByProtocol';
import {Conversation} from 'src/script/entity/Conversation';
import {getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {initialiseMigrationOfProteusConversations} from './initialiseMigration';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

const logger = getLogger('MLSMigration');

//FIXME: This will not live here, it will be part of team features config once it's implemented on backend
interface MLSMigrationConfig {
  startTime: number; //migrtion start timestamp
  finaliseRegardlessAfter: number; //timestamp of the date until the migration has to finalise
  usersThreshold: number; //percentage of migrated users needed for migration to finalize (0-100)
  clientsThreshold: number; ////percentage of migrated clients needed for migration to finalize (0-100)
}

const MIGRATION_TASK_KEY = 'mls-migration';

/**
 * Will check the config of migration feature and try to initialise/finalise the migration on provided conversations.
 *
 * @param migrationConfig - the config of the MLS migration feature
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 * @param apiClient - the instance of the apiClient
 * @param isConversationOwnedBySelfTeam - callback that checks if the provided conversation is owned by a self team
 */
export const initialiseMLSMigrationFlow = async (
  migrationConfig: MLSMigrationConfig,
  conversations: Conversation[],
  {
    core,
    apiClient,
    isConversationOwnedBySelfTeam,
  }: {
    core: Account;
    apiClient: APIClient;
    isConversationOwnedBySelfTeam: (conversation: Conversation) => boolean;
  },
) => {
  return periodicallyCheckMigrationConfig(
    migrationConfig,
    () => migrateConversationsToMLS(conversations, {isConversationOwnedBySelfTeam, apiClient, core}),
    {core, apiClient},
  );
};

const periodicallyCheckMigrationConfig = async (
  migrationConfig: MLSMigrationConfig,
  onMigrationStartTimeArrived: () => Promise<void>,
  {
    core,
    apiClient,
  }: {
    core: Account;
    apiClient: APIClient;
  },
) => {
  const checkMigrationConfigTask = () =>
    checkMigrationConfig(migrationConfig, onMigrationStartTimeArrived, {core, apiClient});

  // We check the migration config immediately (on app load) and every 24 hours
  await checkMigrationConfigTask();

  registerRecurringTask({
    every: TIME_IN_MILLIS.DAY,
    task: checkMigrationConfigTask,
    key: MIGRATION_TASK_KEY,
  });
};

const checkMigrationConfig = async (
  migrationConfig: MLSMigrationConfig,
  onMigrationStartTimeArrived: () => Promise<void>,
  {
    core,
    apiClient,
  }: {
    core: Account;
    apiClient: APIClient;
  },
) => {
  logger.info('MLS migration feature enabled, checking the configuration...');
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({core, apiClient});

  if (!isMLSSupportedByEnv) {
    logger.error('MLS migration feature is enabled but MLS is not supported by the environment.');
    return;
  }

  //at this point we know that MLS is supported by environment, we can check MLS migration config
  //check if migration startTime has arrived
  const hasStartTimeArrived = Date.now() >= migrationConfig.startTime;
  if (!hasStartTimeArrived) {
    logger.error('MLS migration start time has not arrived yet, will retry in 24 hours or on app reload.');
  }

  return onMigrationStartTimeArrived();
};

const migrateConversationsToMLS = async (
  conversations: Conversation[],
  {
    apiClient,
    core,
    isConversationOwnedBySelfTeam,
  }: {
    apiClient: APIClient;
    core: Account;
    isConversationOwnedBySelfTeam: (conversation: Conversation) => boolean;
  },
) => {
  //TODO: implement logic for 1on1 conversations (both team owned and federated)
  const regularGroupConversations = conversations.filter(
    conversation =>
      conversation.type() === CONVERSATION_TYPE.REGULAR &&
      isConversationOwnedBySelfTeam(conversation) &&
      !conversation.isTeam1to1(),
  );

  const {proteus: proteusConversations} = groupConversationsByProtocol(regularGroupConversations);

  await initialiseMigrationOfProteusConversations(proteusConversations, {core, apiClient});

  //TODO: implement logic for finalising mixed conversations
};
