/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {Maybe} from 'true-myth';
import {match, P} from 'ts-pattern';

import {Account, MLSService} from '@wireapp/core';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {
  isMLSCapableConversation,
  isMLSConversation,
  isSelfConversation,
  isTeamConversation,
  MLSCapableConversation,
  MLSConversation,
} from 'Repositories/conversation/ConversationSelectors';
import {ConversationService} from 'Repositories/conversation/ConversationService';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {getLogger} from 'Util/logger';

const logger = getLogger('Webapp/MLSConversations');

/**
 * Will initialize all the MLS conversations that the user is member of but that are not yet locally established.
 * Includes group, channel, and meeting conversations.
 *
 * @param conversations - all the conversations that the user is part of
 * @param core - the instance of the core
 */
export async function initMLSGroupConversations(
  conversations: Conversation[],
  conversationRepository: ConversationRepository,
  {
    core,
    onSuccessfulJoin,
    onError,
  }: {
    core: Account;
    onSuccessfulJoin?: (conversation: Conversation) => void;
    onError?: (conversation: Conversation, error: unknown) => void;
  },
): Promise<void> {
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  const mlsGroupConversations = conversations.filter(
    (conversation): conversation is MLSCapableConversation =>
      (conversation.isGroupOrChannel() || conversation.isMeeting()) &&
      isMLSCapableConversation(conversation) &&
      !conversation.isSelfUserRemoved(),
  );

  for (const mlsConversation of mlsGroupConversations) {
    await initMLSGroupConversation(mlsConversation, conversationRepository, {
      core,
      onSuccessfulJoin,
      onError,
    });
  }
}

/**
 * Will initialize a single MLS conversation that the user is member of but that are not yet locally established.
 *
 * @param mlsConversation - the conversation to initialize
 * @param core - the instance of the core
 */
export async function initMLSGroupConversation(
  mlsConversation: MLSCapableConversation,
  conversationRepository: ConversationRepository,
  {
    core,
    onSuccessfulJoin,
    onError,
  }: {
    core: Account;
    onSuccessfulJoin?: (conversation: Conversation) => void;
    onError?: (conversation: Conversation, error: unknown) => void;
  },
): Promise<void> {
  logger.info('Initialising MLS group conversation', {
    conversationId: mlsConversation.qualifiedId,
    groupId: mlsConversation.groupId,
  });
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  try {
    const {groupId, qualifiedId} = mlsConversation;

    const doesMLSGroupExist = await conversationService.mlsGroupExistsLocally(groupId);

    // if group is already established, we just schedule periodic key material updates
    if (doesMLSGroupExist) {
      await mlsService.scheduleKeyMaterialRenewal(groupId);
      return;
    }

    // otherwise we should try to ensure the conversation exists (this will establish it if epoch is 0, or join by external commit if epoch > 0)
    console.info('Conversation does not exist, ensuring establishment');
    await conversationRepository.ensureConversationExists({
      groupId,
      conversationId: qualifiedId,
      core,
    });

    onSuccessfulJoin?.(mlsConversation);
  } catch (error: unknown) {
    onError?.(mlsConversation, error);
  }
}

/**
 * Will register self and team MLS conversations.
 * The self conversation and the team conversation are special conversations created by noone and, thus, need to be manually created by the first device that detects them
 *
 * @param conversations all the conversations the user is part of
 * @param selfUser entity of the self user
 * @param selfClientId id of the current client
 * @param core instance of the core
 */
export async function initialiseSelfAndTeamConversations(
  conversations: Conversation[],
  conversationRepository: ConversationRepository,
  selfUser: User,
  selfClientId: string,
  core: Account,
): Promise<void> {
  logger.info('Initialising self and team conversations');
  const {mls: mlsService, conversation: conversationService} = core.service || {};
  if (!mlsService || !conversationService) {
    throw new Error('MLS or Conversation service is not available!');
  }

  const conversationsToEstablish = conversations.filter(
    (conversation): conversation is MLSConversation =>
      isMLSConversation(conversation) && (isSelfConversation(conversation) || isTeamConversation(conversation)),
  );

  await Promise.all(
    conversationsToEstablish.map(async conversation => {
      if (conversation.epoch < 1) {
        return mlsService.registerConversation(conversation.groupId, [selfUser.qualifiedId], {
          creator: {
            user: selfUser,
            client: selfClientId,
          },
        });
      }

      // If the conversation is already established, we don't need to do anything.
      const isGroupAlreadyEstablished = await mlsService.isConversationEstablished(conversation.groupId);
      logger.info('Checking if group is already established', {
        isGroupAlreadyEstablished,
        qualifiedId: conversation.qualifiedId,
      });
      if (isGroupAlreadyEstablished) {
        return Promise.resolve();
      }

      logger.info('Conversation is not established, trying to establish', {
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
      });

      // Otherwise, we need to ensure the conversation exists by establishing it or joining it by external commit.
      await conversationRepository.ensureConversationExists({
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
        core,
      });
    }),
  );
}

/**
 * Result of reading an MLS epoch from a source.
 * Lifts the read failure (whether `Result.Err` from CoreCrypto or a thrown error
 * from the backend) into a domain-shaped tagged union so it becomes part of the data model.
 */
export type EpochReading = {kind: 'epoch'; value: number} | {kind: 'unreadable'; error: unknown};

/**
 * Local CoreCrypto state for an MLS group: whether the group exists and its epoch reading.
 */
export type LocalMLSState = {
  existsLocally: boolean;
  epoch: EpochReading;
};

/**
 * The four mutually exclusive outcomes the local state can produce.
 * Each variant maps to one branch in `ensureMLSGroupIsEstablished`.
 */
export type LocalDecision =
  | {kind: 'alreadyEstablished'}
  | {kind: 'staleNeedsWipe'}
  | {kind: 'missing'}
  | {kind: 'epochUnreadable'; error: unknown};

/**
 * The three mutually exclusive outcomes the backend epoch can produce.
 * `unreadable` covers any reason we could not obtain a valid remote epoch:
 * the fetch failed, the response shape was wrong, or the value was not a non-negative finite number.
 */
export type RemoteDecision =
  {kind: 'establish'; epoch: 0} | {kind: 'joinExisting'; epoch: number} | {kind: 'unreadable'; error: unknown};

export const classifyLocal = ({existsLocally, epoch}: LocalMLSState): LocalDecision => {
  if (!existsLocally) {
    return {kind: 'missing'};
  }

  return match(epoch)
    .returnType<LocalDecision>()
    .with({kind: 'unreadable'}, ({error}) => ({kind: 'epochUnreadable', error}))
    .with({kind: 'epoch', value: P.number.gt(0)}, () => ({kind: 'alreadyEstablished'}))
    .with({kind: 'epoch'}, () => ({kind: 'staleNeedsWipe'}))
    .exhaustive();
};

export const classifyRemote = (reading: EpochReading): RemoteDecision =>
  match(reading)
    .returnType<RemoteDecision>()
    .with({kind: 'unreadable'}, ({error}) => ({kind: 'unreadable', error}))
    .with({kind: 'epoch', value: 0}, () => ({kind: 'establish', epoch: 0}))
    .with({kind: 'epoch'}, ({value}) => ({kind: 'joinExisting', epoch: value}))
    .exhaustive();

export async function readLocalMLSState(
  groupId: string,
  conversationService: ConversationService,
  mlsService: MLSService,
): Promise<LocalMLSState> {
  const existsLocally = await conversationService.mlsGroupExistsLocally(groupId);
  const epochResult = await mlsService.getSafeEpoch(groupId);
  const epoch = epochResult.match<EpochReading>({
    Ok: value => ({kind: 'epoch', value}),
    Err: error => {
      logger.warn('Failed to read local MLS epoch', {error});
      return {kind: 'unreadable', error};
    },
  });
  return {existsLocally, epoch};
}

export async function fetchRemoteEpoch(
  conversationId: QualifiedId,
  conversationService: ConversationService,
): Promise<EpochReading> {
  const result = await conversationService.getSafeConversationById(conversationId);
  return result.match<EpochReading>({
    Ok: ({epoch}) => {
      if (typeof epoch === 'number' && Number.isFinite(epoch) && epoch >= 0) {
        return {kind: 'epoch', value: epoch};
      }

      return {
        kind: 'unreadable',
        error: new Error(`Remote epoch is not a non-negative finite number: ${String(epoch)}`),
      };
    },
    Err: error => {
      logger.warn('Failed to read remote MLS epoch', {error});
      return {kind: 'unreadable', error};
    },
  });
}

async function wipeLocalMLSGroup(groupId: string, core: Account): Promise<void> {
  await core.service?.conversation?.wipeMLSConversation(groupId);
}

export async function ensureMLSGroupIsEstablished(
  groupId: string,
  conversationId: QualifiedId,
  dependencies: {
    core: Account;
    conversationService: ConversationService;
    userState: UserState;
    conversationState: ConversationState;
  },
): Promise<void> {
  const {core, conversationService, userState, conversationState} = dependencies;
  const mlsService = Maybe.of(core.service?.mls);

  if (mlsService.isNothing) {
    logger.error('MLS service is not available!');
    return;
  }

  const localState = await readLocalMLSState(groupId, conversationService, mlsService.value);
  const localDecision = classifyLocal(localState);

  logger.info('Ensuring MLS group is established', {
    conversationId,
    groupId,
    existsLocally: localState.existsLocally,
    epoch: localState.epoch,
    localDecision: localDecision.kind,
  });

  const shouldReconcileWithRemote = await match(localDecision)
    .with({kind: 'alreadyEstablished'}, async () => {
      logger.info('MLS group is already established, no action needed');
      return false;
    })
    .with({kind: 'missing'}, async () => true)
    .with({kind: 'staleNeedsWipe'}, async () => {
      logger.info('MLS group exists locally but epoch is 0, wiping it');
      await wipeLocalMLSGroup(groupId, core);
      return true;
    })
    .with({kind: 'epochUnreadable'}, async ({error}) => {
      logger.warn('Local MLS epoch is unreadable; wiping local group and reconciling with backend', {error});
      await wipeLocalMLSGroup(groupId, core);
      return true;
    })
    .exhaustive();

  if (!shouldReconcileWithRemote) {
    return;
  }

  const remoteDecision = classifyRemote(await fetchRemoteEpoch(conversationId, conversationService));

  return match(remoteDecision)
    .with({kind: 'establish'}, async ({epoch}) => {
      logger.info('Establishing MLS group as remote epoch is 0');
      await establishMlsGroupConversation({
        conversationId,
        groupId,
        epoch,
        dependencies: {core, userState, conversationState},
      });
    })
    .with({kind: 'joinExisting'}, async ({epoch}) => {
      logger.info('Joining MLS group by external commit', {remoteEpoch: epoch});
      await core.service?.conversation?.joinByExternalCommit(conversationId);
    })
    .with({kind: 'unreadable'}, ({error}) => {
      logger.error('Could not read remote MLS epoch; aborting reconciliation', {error});
      throw new Error('Could not read remote MLS epoch', {cause: error});
    })
    .exhaustive();
}

/**
 * Establishes a MLS group conversation.
 */
async function establishMlsGroupConversation({
  conversationId,
  groupId,
  epoch,
  dependencies,
}: {
  conversationId: QualifiedId;
  groupId: string;
  epoch: number;
  dependencies: {
    core: Account;
    userState: UserState;
    conversationState: ConversationState;
  };
}): Promise<void> {
  const {core, userState, conversationState} = dependencies;
  logger.info('Establishing MLS conversation', {conversationId, groupId, epoch});
  const selfUser = userState.self();
  const conversation = conversationState.findConversation(conversationId);

  if (!selfUser || !conversation) {
    logger.error('Self user or conversation is not available!', {selfUser, conversation});
    throw new Error('Self user or conversation is not available!');
  }

  const selfUserClientId = selfUser.localClient?.id;
  if (!selfUserClientId) {
    logger.error('Self user client id is not available!', {selfUserClientId});
    throw new Error('Self user client id is not available!');
  }

  const members = conversation.participating_user_ids();
  await core.service?.conversation?.establishMLSGroupConversation(
    groupId,
    members,
    selfUser.qualifiedId,
    selfUserClientId,
    conversationId,
  );
}
