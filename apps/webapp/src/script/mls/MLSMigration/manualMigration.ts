/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CONVERSATION_PROTOCOL, FEATURE_STATUS, type FeatureMLSMigration} from '@wireapp/api-client/lib/team';
import {Maybe, Task, task} from 'true-myth';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {isMixedConversation, isMLSConversation} from 'Repositories/conversation/ConversationSelectors';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';

import {mlsMigrationLogger} from './MLSMigrationLogger';
import {useManualMigrationStore} from './useManualMigrationStore';

export const canManuallyMigrateConversation = (
  conversation: Conversation,
  selfUser: Pick<User, 'teamId'>,
  feature: Maybe<NonNullable<FeatureMLSMigration>>,
): boolean =>
  conversation.isGroupOrChannel() &&
  !conversation.isSelfUserRemoved() &&
  !!conversation.teamId &&
  conversation.teamId === selfUser.teamId &&
  [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MIXED].includes(conversation.protocol) &&
  feature.isJust &&
  feature.value.status === FEATURE_STATUS.ENABLED &&
  feature.value.config.allowManualMigration === true;

export type ManualMigrationFailure = {
  stage: 'eligibility' | 'busy' | 'initialise' | 'establish' | 'finalise';
  reason: 'requestFailed' | 'notAllowed' | 'alreadyRunning' | 'missingGroup' | 'protocolUnchanged';
  cause: Maybe<{}>;
};

type MigrationRepository = Pick<
  ConversationRepository,
  'updateConversationProtocol' | 'tryEstablishingMLSGroup' | 'safeEnsureConversationExists'
>;

export const manuallyMigrateConversation = ({
  conversation,
  selfUser,
  repository,
  getFeature,
  onConversationUpdated,
}: {
  conversation: Conversation;
  selfUser: Pick<User, 'teamId' | 'qualifiedId'>;
  repository: MigrationRepository;
  getFeature: () => Maybe<NonNullable<FeatureMLSMigration>>;
  onConversationUpdated: (conversation: Conversation) => void;
}): Task<Conversation, ManualMigrationFailure> => {
  if (!canManuallyMigrateConversation(conversation, selfUser, getFeature())) {
    return task.reject({stage: 'eligibility', reason: 'notAllowed', cause: Maybe.nothing()});
  }

  const key = conversation.qualifiedId.id;
  const {tryStart, finish} = useManualMigrationStore.getState();
  if (!tryStart(key)) {
    return task.reject({stage: 'busy', reason: 'alreadyRunning', cause: Maybe.nothing()});
  }
  mlsMigrationLogger.info('Manual MLS migration started');

  const failure = (stage: ManualMigrationFailure['stage'], cause: unknown): ManualMigrationFailure => ({
    stage,
    reason: 'requestFailed',
    cause: Maybe.of(cause),
  });
  const update = (current: Conversation, protocol: CONVERSATION_PROTOCOL.MIXED | CONVERSATION_PROTOCOL.MLS) =>
    task
      .tryOrElse(
        cause => failure(protocol === CONVERSATION_PROTOCOL.MIXED ? 'initialise' : 'finalise', cause),
        () => repository.updateConversationProtocol(current, protocol),
      )
      .map(updated => {
        onConversationUpdated(updated);
        return updated;
      });

  const initialized =
    conversation.protocol === CONVERSATION_PROTOCOL.PROTEUS
      ? update(conversation, CONVERSATION_PROTOCOL.MIXED)
      : task.resolve<Conversation, ManualMigrationFailure>(conversation);

  return initialized
    .andThen(current => {
      // Another client may have completed migration while the update was in flight.
      if (isMLSConversation(current)) {
        return task.resolve<Conversation, ManualMigrationFailure>(current);
      }
      if (!isMixedConversation(current)) {
        return task.reject<Conversation, ManualMigrationFailure>({
          stage: 'initialise',
          reason: 'missingGroup',
          cause: Maybe.nothing(),
        });
      }
      const established =
        current.epoch > 0
          ? repository
              .safeEnsureConversationExists({conversationId: current.qualifiedId, groupId: current.groupId})
              .mapRejected(cause => failure('establish', cause))
          : task
              .tryOrElse(
                cause => failure('establish', cause),
                () =>
                  repository.tryEstablishingMLSGroup({
                    conversationId: current.qualifiedId,
                    groupId: current.groupId,
                    qualifiedUsers: current.participating_user_ids(),
                    selfUserId: selfUser.qualifiedId,
                  }),
              )
              .andThen(() =>
                repository
                  .safeEnsureConversationExists({conversationId: current.qualifiedId, groupId: current.groupId})
                  .mapRejected(cause => failure('establish', cause)),
              );
      return established
        .andThen(() =>
          canManuallyMigrateConversation(current, selfUser, getFeature())
            ? update(current, CONVERSATION_PROTOCOL.MLS)
            : task.reject<Conversation, ManualMigrationFailure>({
                stage: 'eligibility',
                reason: 'notAllowed',
                cause: Maybe.nothing(),
              }),
        )
        .andThen(updated =>
          isMLSConversation(updated)
            ? task.resolve<Conversation, ManualMigrationFailure>(updated)
            : task.reject<Conversation, ManualMigrationFailure>({
                stage: 'finalise',
                reason: 'protocolUnchanged',
                cause: Maybe.nothing(),
              }),
        );
    })
    .inspect(() => {
      finish(key);
      mlsMigrationLogger.info('Manual MLS migration succeeded');
    })
    .inspectRejected(error => {
      finish(key);
      mlsMigrationLogger.error(`Manual MLS migration failed at ${error.stage}`, {
        reason: error.reason,
        cause: error.cause,
      });
    });
};
