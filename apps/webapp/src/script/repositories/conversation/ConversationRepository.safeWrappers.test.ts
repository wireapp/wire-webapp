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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {AddUsersFailureReasons} from '@wireapp/core/lib/conversation';

import {generateConversation as _generateConversation} from 'test/helper/ConversationGenerator';
import {TestFactory} from 'test/helper/TestFactory';
import {generateUser} from 'test/helper/UserGenerator';

describe('ConversationRepository safe* wrappers', () => {
  const testFactory = new TestFactory();

  beforeEach(async () => {
    await testFactory.exposeConversationActors();
  });

  describe('safeGetConversationById', () => {
    it('resolves to Ok when getConversationById succeeds', async () => {
      const conversation = _generateConversation();
      const conversationRepository = testFactory.conversation_repository!;
      jest.spyOn(conversationRepository, 'getConversationById').mockResolvedValue(conversation);

      const settled = await conversationRepository.safeGetConversationById(conversation.qualifiedId);

      expect(settled.isOk).toBe(true);
      expect(settled.match({Ok: value => value, Err: () => null})).toBe(conversation);
    });

    it('resolves to Err when getConversationById throws', async () => {
      const conversationId: QualifiedId = {id: 'missing', domain: 'wire.com'};
      const error = new Error('not found');
      const conversationRepository = testFactory.conversation_repository!;
      jest.spyOn(conversationRepository, 'getConversationById').mockRejectedValue(error);

      const settled = await conversationRepository.safeGetConversationById(conversationId);

      expect(settled.isErr).toBe(true);
      expect(settled.match({Ok: () => null, Err: value => value})).toBe(error);
    });
  });

  describe('establishMeetingConversation', () => {
    it('resolves to Ok with failedToAdd when establishment succeeds', async () => {
      const conversation = _generateConversation();
      const selfUser = generateUser();
      const failedToAdd = [{users: [], backends: [], reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}];
      const conversationRepository = testFactory.conversation_repository!;
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);
      conversationRepository['core'].service!.conversation.establishMLSGroupConversation = jest
        .fn()
        .mockResolvedValue({failedToAdd});

      const settled = await conversationRepository.establishMeetingConversation({
        groupId: 'group-id',
        userIdsToAdd: [generateUser().qualifiedId],
        conversationQualifiedId: conversation.qualifiedId,
      });

      expect(settled.isOk).toBe(true);
      expect(settled.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual(failedToAdd);
    });

    it('resolves to Err when establishment throws', async () => {
      const conversation = _generateConversation();
      const selfUser = generateUser();
      const error = new Error('MLS commit failed');
      const conversationRepository = testFactory.conversation_repository!;
      jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);
      conversationRepository['core'].service!.conversation.establishMLSGroupConversation = jest
        .fn()
        .mockRejectedValue(error);

      const settled = await conversationRepository.establishMeetingConversation({
        groupId: 'group-id',
        userIdsToAdd: [],
        conversationQualifiedId: conversation.qualifiedId,
      });

      expect(settled.isErr).toBe(true);
      expect(settled.match({Ok: () => null, Err: value => value})).toBe(error);
    });
  });

  describe('safeAddUsers', () => {
    it('resolves to Ok with failedToAdd when adding users succeeds', async () => {
      const conversation = _generateConversation();
      conversation.groupId = 'group-id';
      const user = generateUser();
      const failedToAdd = [{users: [], backends: [], reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}];
      const conversationRepository = testFactory.conversation_repository!;
      conversationRepository['core'].service!.conversation.addUsersToMLSConversation = jest
        .fn()
        .mockResolvedValue({failedToAdd});

      const settled = await conversationRepository.safeAddUsers(conversation, [user]);

      expect(settled.isOk).toBe(true);
      expect(settled.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual(failedToAdd);
      expect(conversationRepository['core'].service!.conversation.addUsersToMLSConversation).toHaveBeenCalledWith({
        conversationId: conversation.qualifiedId,
        groupId: conversation.groupId,
        qualifiedUsers: [user.qualifiedId],
      });
    });

    it('resolves to Ok with empty failedToAdd when no users are provided', async () => {
      const conversation = _generateConversation();
      conversation.groupId = 'group-id';
      const conversationRepository = testFactory.conversation_repository!;
      conversationRepository['core'].service!.conversation.addUsersToMLSConversation = jest.fn();

      const settled = await conversationRepository.safeAddUsers(conversation, []);

      expect(settled.isOk).toBe(true);
      expect(settled.match({Ok: value => value.failedToAdd, Err: () => null})).toEqual([]);
      expect(conversationRepository['core'].service!.conversation.addUsersToMLSConversation).not.toHaveBeenCalled();
    });

    it('resolves to Err when adding users throws', async () => {
      const conversation = _generateConversation();
      conversation.groupId = 'group-id';
      const user = generateUser();
      const error = new Error('MLS commit failed');
      const conversationRepository = testFactory.conversation_repository!;
      conversationRepository['core'].service!.conversation.addUsersToMLSConversation = jest
        .fn()
        .mockRejectedValue(error);

      const settled = await conversationRepository.safeAddUsers(conversation, [user]);

      expect(settled.isErr).toBe(true);
      expect(settled.match({Ok: () => null, Err: value => value})).toBe(error);
    });

    it('resolves to Err when the conversation has no group id', async () => {
      const conversation = _generateConversation();
      conversation.groupId = undefined;
      const user = generateUser();
      const conversationRepository = testFactory.conversation_repository!;

      const settled = await conversationRepository.safeAddUsers(conversation, [user]);

      expect(settled.isErr).toBe(true);
      expect(settled.match({Ok: () => null, Err: value => (value as Error).message})).toBe(
        'Cannot add users to MLS conversation without group id',
      );
    });
  });
});
