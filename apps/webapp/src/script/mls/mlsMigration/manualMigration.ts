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

import {isNonEmptyString} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL, FEATURE_STATUS, type FeatureMLSMigration} from '@wireapp/api-client/lib/team';
import {Maybe, Task, task} from 'true-myth';

import type {ConversationRepository} from 'Repositories/conversation/conversationRepository';
import {isMixedConversation, isMLSConversation} from 'Repositories/conversation/conversationSelectors';
import type {Conversation} from 'Repositories/entity/conversation';
import type {User} from 'Repositories/entity/user';

import {mlsMigrationLogger} from './mlsMigrationLogger';
import {useManualMigrationStore} from './useManualMigrationStore';

export const canManuallyMigrateConversation = (
  conversation: Conversation,
  selfUser: Pick<User, 'teamId' | 'qualifiedId'>,
  feature: Maybe<NonNullable<FeatureMLSMigration>>,
): boolean => {
  return (
    conversation.isGroupOrChannel() &&
    !conversation.isSelfUserRemoved() &&
    conversation.isAdmin(selfUser.qualifiedId) &&
    isNonEmptyString(conversation.teamId) &&
    conversation.teamId === selfUser.teamId &&
    [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_PROTOCOL.MIXED].includes(conversation.protocol) &&
    feature.isJust &&
    feature.value.status === FEATURE_STATUS.ENABLED &&
    feature.value.config.allowManualMigration === true
  );
};

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
}: {
  conversation: Conversation;
  selfUser: Pick<User, 'teamId' | 'qualifiedId'>;
  repository: MigrationRepository;
  getFeature: () => Maybe<NonNullable<FeatureMLSMigration>>;
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

  const failure = (stage: ManualMigrationFailure['stage'], cause: unknown): ManualMigrationFailure => {
    return {
      stage,
      reason: 'requestFailed',
      cause: Maybe.of(cause),
    };
  };
  const update = (current: Conversation, protocol: CONVERSATION_PROTOCOL.MIXED | CONVERSATION_PROTOCOL.MLS) => {
    return task.tryOrElse(
      cause => {
        return failure(protocol === CONVERSATION_PROTOCOL.MIXED ? 'initialise' : 'finalise', cause);
      },
      () => {
        return repository.updateConversationProtocol(current, protocol);
      },
    );
  };

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
              .mapRejected(cause => {
                return failure('establish', cause);
              })
          : task
              .tryOrElse(
                cause => {
                  return failure('establish', cause);
                },
                () => {
                  return repository.tryEstablishingMLSGroup({
                    conversationId: current.qualifiedId,
                    groupId: current.groupId,
                    qualifiedUsers: current.participating_user_ids(),
                    selfUserId: selfUser.qualifiedId,
                  });
                },
              )
              .andThen(() => {
                return repository
                  .safeEnsureConversationExists({conversationId: current.qualifiedId, groupId: current.groupId})
                  .mapRejected(cause => {
                    return failure('establish', cause);
                  });
              });
      return established
        .andThen(() => {
          return canManuallyMigrateConversation(current, selfUser, getFeature())
            ? update(current, CONVERSATION_PROTOCOL.MLS)
            : task.reject<Conversation, ManualMigrationFailure>({
                stage: 'eligibility',
                reason: 'notAllowed',
                cause: Maybe.nothing(),
              });
        })
        .andThen(updated => {
          return isMLSConversation(updated)
            ? task.resolve<Conversation, ManualMigrationFailure>(updated)
            : task.reject<Conversation, ManualMigrationFailure>({
                stage: 'finalise',
                reason: 'protocolUnchanged',
                cause: Maybe.nothing(),
              });
        });
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
