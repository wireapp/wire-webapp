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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {asyncNoop} from 'noop-esm';

import {generateConversation} from 'test/helper/ConversationGenerator';
import {translateForTest} from 'Util/test/translateForTest';

import {Conversation} from '../../repositories/entity/Conversation';
import {User} from '../../repositories/entity/User';

import {MLSMigrationStatus} from './migrationStatus';
import {initialiseMLSMigrationFlow, type MLSMigrationFlowDependencies} from './MLSMigration';

function createGroupConversation(teamId: string, protocol: CONVERSATION_PROTOCOL): Conversation {
  const conversation = generateConversation({protocol});
  conversation.teamId = teamId;

  return conversation;
}

function createSelfUser(teamId?: string): User {
  const selfUser = new User('self', 'wire.test', translateForTest);
  selfUser.teamId = teamId;
  selfUser.supportedProtocols([CONVERSATION_PROTOCOL.MLS]);

  return selfUser;
}

function createMigrationFlowDependencies(): MLSMigrationFlowDependencies {
  return {
    isMLSSupportedByEnvironment: jest.fn(async (): Promise<boolean> => {
      return true;
    }),
    registerDailyTask: jest.fn(asyncNoop),
    initialiseMigrationOfProteusConversations: jest.fn(asyncNoop),
    joinUnestablishedMixedConversations: jest.fn(asyncNoop),
    finaliseMigrationOfMixedConversations: jest.fn(asyncNoop),
  };
}

describe('initialiseMLSMigrationFlow', () => {
  const selfTeamId = 'self-team';

  it('initialises and finalises self-team conversations while joining mixed conversations from every team', async () => {
    const selfUser = createSelfUser(selfTeamId);
    const ownTeamProteusConversation = createGroupConversation(selfTeamId, CONVERSATION_PROTOCOL.PROTEUS);
    const ownTeamMixedConversation = createGroupConversation(selfTeamId, CONVERSATION_PROTOCOL.MIXED);
    const otherTeamMixedConversation = createGroupConversation('other-team', CONVERSATION_PROTOCOL.MIXED);
    const noTeamMixedConversation = createGroupConversation('', CONVERSATION_PROTOCOL.MIXED);
    const selfTeamGroupConversations = [ownTeamProteusConversation, ownTeamMixedConversation];
    const allGroupConversations = [...selfTeamGroupConversations, otherTeamMixedConversation, noTeamMixedConversation];
    const conversationRepository = {
      getAllTeamGroupConversations: jest.fn(() => {
        return selfTeamGroupConversations;
      }),
      getAllGroupConversations: jest.fn(() => {
        return allGroupConversations;
      }),
    };
    const dependencies = createMigrationFlowDependencies();

    await initialiseMLSMigrationFlow({
      selfUser,
      conversationRepository,
      getTeamMLSMigrationStatus: () => {
        return MLSMigrationStatus.ONGOING;
      },
      refreshAllKnownUsers: jest.fn(asyncNoop),
      dependencies,
    });

    expect(conversationRepository.getAllTeamGroupConversations).toHaveBeenCalledTimes(1);
    expect(dependencies.initialiseMigrationOfProteusConversations).toHaveBeenCalledWith(
      selfTeamGroupConversations,
      selfUser.qualifiedId,
    );
    expect(dependencies.finaliseMigrationOfMixedConversations).toHaveBeenCalledWith(selfTeamGroupConversations);
    expect(dependencies.joinUnestablishedMixedConversations).toHaveBeenCalledWith(
      allGroupConversations,
      selfUser.qualifiedId,
    );
  });

  it('does not initialise or finalise automatic migration for a user without a team', async () => {
    const selfUser = createSelfUser();
    const otherTeamMixedConversation = createGroupConversation('other-team', CONVERSATION_PROTOCOL.MIXED);
    const allGroupConversations = [otherTeamMixedConversation];
    const conversationRepository = {
      getAllTeamGroupConversations: jest.fn(() => {
        return [];
      }),
      getAllGroupConversations: jest.fn(() => {
        return allGroupConversations;
      }),
    };
    const dependencies = createMigrationFlowDependencies();

    await initialiseMLSMigrationFlow({
      selfUser,
      conversationRepository,
      getTeamMLSMigrationStatus: () => {
        return MLSMigrationStatus.ONGOING;
      },
      refreshAllKnownUsers: jest.fn(asyncNoop),
      dependencies,
    });

    expect(conversationRepository.getAllTeamGroupConversations).not.toHaveBeenCalled();
    expect(dependencies.initialiseMigrationOfProteusConversations).not.toHaveBeenCalled();
    expect(dependencies.finaliseMigrationOfMixedConversations).not.toHaveBeenCalled();
    expect(dependencies.joinUnestablishedMixedConversations).toHaveBeenCalledWith(
      allGroupConversations,
      selfUser.qualifiedId,
    );
  });
});
