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
import {FeatureMLSMigrationConfig} from '@wireapp/api-client/lib/team';
import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {container} from 'tsyringe';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {groupConversationsByProtocol} from 'src/script/conversation/groupConversationsByProtocol';
import {Conversation} from 'src/script/entity/Conversation';
import {APIClient as APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {Core as CoreSingleton} from 'src/script/service/CoreSingleton';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {mlsMigrationLogger} from './MLSMigrationLogger';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

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
  migrationConfig: FeatureMLSMigrationConfig,
  conversations: Conversation[],
  {
    conversationRepository,
    isConversationOwnedBySelfTeam,
  }: {
    conversationRepository: ConversationRepository;
    isConversationOwnedBySelfTeam: (conversation: Conversation) => boolean;
  },
) => {
  const core = container.resolve(CoreSingleton);
  const apiClient = container.resolve(APIClientSingleton);

  return periodicallyCheckMigrationConfig(
    migrationConfig,
    () =>
      migrateConversationsToMLS(conversations, {
        isConversationOwnedBySelfTeam,
        apiClient,
        core,
        conversationRepository,
      }),
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
  mlsMigrationLogger.info('MLS migration feature enabled, checking the configuration...');
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({core, apiClient});

  if (!isMLSSupportedByEnv) {
    mlsMigrationLogger.error('MLS migration feature is enabled but MLS is not supported by the environment.');
    return;
  }

  //at this point we know that MLS is supported by environment, we can check MLS migration config
  //check if migration startTime has arrived
  const hasStartTimeArrived = Date.now() >= migrationConfig.startTime;
  if (!hasStartTimeArrived) {
    mlsMigrationLogger.error('MLS migration start time has not arrived yet, will retry in 24 hours or on app reload.');
  }

  return onMigrationStartTimeArrived();
};

const migrateConversationsToMLS = async (
  conversations: Conversation[],
  {
    apiClient,
    core,
    conversationRepository,
    isConversationOwnedBySelfTeam,
  }: {
    apiClient: APIClient;
    core: Account;
    conversationRepository: ConversationRepository;
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

  //TODO: it returns a map of protocol -> conversations, we need to iterate over it and continue with the migration based on the protocol
  groupConversationsByProtocol(regularGroupConversations);

  //TODO: implement logic for init and finalise the migration
};
