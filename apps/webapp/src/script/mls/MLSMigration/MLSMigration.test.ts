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
import {container} from 'tsyringe';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';

import {finaliseMigrationOfMixedConversations} from './migrationFinaliser';
import {initialiseMigrationOfProteusConversations, joinUnestablishedMixedConversations} from './migrationInitialiser';
import {MLSMigrationStatus} from './migrationStatus';
import {initialiseMLSMigrationFlow} from './MLSMigration';

import {isMLSSupportedByEnvironment} from '../isMLSSupportedByEnvironment';

jest.mock('./migrationFinaliser', () => {
  return {finaliseMigrationOfMixedConversations: jest.fn()};
});
jest.mock('./migrationInitialiser', () => {
  return {
    initialiseMigrationOfProteusConversations: jest.fn(),
    joinUnestablishedMixedConversations: jest.fn(),
  };
});
jest.mock('../isMLSSupportedByEnvironment', () => {
  return {isMLSSupportedByEnvironment: jest.fn()};
});
jest.mock('src/script/service/coreSingleton', () => {
  return {Core: class {}};
});

describe('initialiseMLSMigrationFlow', () => {
  const selfTeamId = 'self-team';
  const makeConversation = (teamId?: string): Conversation => {
    return {teamId} as unknown as Conversation;
  };
  const ownTeamConversation = makeConversation(selfTeamId);
  const otherTeamConversation = makeConversation('other-team');
  const noTeamConversation = makeConversation(undefined);

  const run = async (teamId: string | undefined): Promise<Conversation[]> => {
    const selfUser = {
      teamId,
      qualifiedId: {id: 'self', domain: 'wire.test'},
      supportedProtocols: () => {
        return [CONVERSATION_PROTOCOL.MLS];
      },
    } as unknown as User;
    const allConversations = [ownTeamConversation, otherTeamConversation, noTeamConversation];
    const conversationRepository = {
      getAllGroupConversations: jest.fn(() => {
        return allConversations;
      }),
      updateConversationProtocol: jest.fn(),
    } as unknown as ConversationRepository;

    jest.spyOn(container, 'resolve').mockReturnValue({recurringTaskScheduler: {registerTask: jest.fn()}});
    (isMLSSupportedByEnvironment as jest.Mock).mockResolvedValue(true);

    await initialiseMLSMigrationFlow({
      selfUser,
      conversationRepository,
      getTeamMLSMigrationStatus: () => {
        return MLSMigrationStatus.ONGOING;
      },
      refreshAllKnownUsers: jest.fn().mockResolvedValue(undefined),
    });
    return allConversations;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only initialises and finalises conversations that belong to the self user team', async () => {
    await run(selfTeamId);

    expect(initialiseMigrationOfProteusConversations).toHaveBeenCalledWith(
      [ownTeamConversation],
      expect.anything(),
      expect.anything(),
    );
    expect(finaliseMigrationOfMixedConversations).toHaveBeenCalledWith(
      [ownTeamConversation],
      expect.anything(),
      expect.anything(),
    );
  });

  it('still tries to join all unestablished mixed conversations', async () => {
    const all = await run(selfTeamId);
    expect(joinUnestablishedMixedConversations).toHaveBeenCalledWith(all, expect.anything(), expect.anything(), {
      core: expect.anything(),
    });
  });

  it('does not migrate any conversation if the self user has no team', async () => {
    await run(undefined);

    expect(initialiseMigrationOfProteusConversations).toHaveBeenCalledWith([], expect.anything(), expect.anything());
    expect(finaliseMigrationOfMixedConversations).toHaveBeenCalledWith([], expect.anything(), expect.anything());
  });
});
