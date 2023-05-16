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
import {FeatureStatus} from '@wireapp/api-client/lib/team';
import {registerRecurringTask} from '@wireapp/core/lib/util/RecurringTaskScheduler';
import {container} from 'tsyringe';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {groupConversationsByProtocol} from 'src/script/conversation/groupConversationsByProtocol';
import {Conversation} from 'src/script/entity/Conversation';
import {APIClient as APIClientSingleton} from 'src/script/service/APIClientSingleton';
import {Core as CoreSingleton} from 'src/script/service/CoreSingleton';
import {TeamState} from 'src/script/team/TeamState';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {mlsMigrationLogger} from './MLSMigrationLogger';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

const MIGRATION_TASK_KEY = 'mls-migration';

/**
 * Will check the config of MLS migration feature and if the start time has arrived, will start (continue) the migration process based on the current state of the conversations and feature config.
 *
 * @param teamState - team state
 * @param conversationRepository - conversation repository
 * @param isConversationOwnedBySelfTeam - callback that checks if the provided conversation is owned by a self team
 */
export const initialiseMLSMigrationFlow = async ({
  teamState,
  conversationRepository,
  isConversationOwnedBySelfTeam,
}: {
  teamState: TeamState;
  conversationRepository: ConversationRepository;
  isConversationOwnedBySelfTeam: (conversation: Conversation) => boolean;
}) => {
  const core = container.resolve(CoreSingleton);
  const apiClient = container.resolve(APIClientSingleton);

  return periodicallyCheckMigrationConfig(
    () =>
      migrateConversationsToMLS({
        isConversationOwnedBySelfTeam,
        apiClient,
        core,
        conversationRepository,
      }),
    {core, apiClient, teamState},
  );
};

const periodicallyCheckMigrationConfig = async (
  onMigrationStartTimeArrived: () => Promise<void>,
  {
    core,
    apiClient,
    teamState,
  }: {
    core: Account;
    apiClient: APIClient;
    teamState: TeamState;
  },
) => {
  const checkMigrationConfigTask = () =>
    checkMigrationConfig(onMigrationStartTimeArrived, {core, apiClient, teamState});

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
  {
    core,
    apiClient,
    teamState,
  }: {
    core: Account;
    apiClient: APIClient;
    teamState: TeamState;
  },
) => {
  const isMLSSupportedByEnv = await isMLSSupportedByEnvironment({core, apiClient});

  if (!isMLSSupportedByEnv) {
    return;
  }
  //at this point we know that MLS is supported by environment, we can check MLS migration config
  //fetch current mls migration feature config from memory
  let mlsMigrationFeature = teamState.teamFeatures().mlsMigration;

  //FIXME: remove this when we have a proper config from the backend
  mlsMigrationFeature = {
    config: {
      clientsThreshold: 100,
      usersThreshold: 100,
      finaliseRegardlessAfter: '2025-05-16T09:25:27.123Z',
      startTime: '2023-05-16T13:17:32.739Z',
    },
    status: FeatureStatus.ENABLED,
  };

  if (!mlsMigrationFeature || mlsMigrationFeature.status === FeatureStatus.DISABLED) {
    mlsMigrationLogger.info('MLS migration feature is disabled, will retry in 24 hours or on next app reload.');
    return;
  }

  mlsMigrationLogger.info('MLS migration feature enabled, checking the configuration...');

  //if startTime is not defined, we never start the migration, will retry in 24 hours or on next app reload
  const startDateISO = mlsMigrationFeature.config.startTime;
  const startTime = (startDateISO && Date.parse(startDateISO)) || Infinity;
  const hasStartTimeArrived = Date.now() >= startTime;

  if (!hasStartTimeArrived) {
    mlsMigrationLogger.info(
      'MLS migration start time has not arrived yet, will retry in 24 hours or on next app reload.',
    );
  }

  mlsMigrationLogger.info(
    'MLS migration start time has arrived, will start the migration process for all the conversations.',
  );
  return onMigrationStartTimeArrived();
};

const migrateConversationsToMLS = async ({
  apiClient,
  core,
  conversationRepository,
  isConversationOwnedBySelfTeam,
}: {
  apiClient: APIClient;
  core: Account;
  conversationRepository: ConversationRepository;
  isConversationOwnedBySelfTeam: (conversation: Conversation) => boolean;
}) => {
  const conversations = conversationRepository.getLocalConversations();

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
