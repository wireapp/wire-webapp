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

import {GROUP_CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {task} from 'true-myth';

import {meetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrapErr} from 'Util/test/resultTestSupport';

import {syncMeetingConversationName} from './syncMeetingConversationName';

const qualifiedConversationId = {id: 'conversation-id', domain: 'example.com'};

const createConversation = ({
  name = 'Old title',
  groupConversationType = GROUP_CONVERSATION_TYPE.MEETING,
}: {
  name?: string;
  groupConversationType?: GROUP_CONVERSATION_TYPE;
} = {}) => {
  const conversation = new Conversation(
    qualifiedConversationId.id,
    qualifiedConversationId.domain,
    CONVERSATION_PROTOCOL.MLS,
    translateForTest,
  );
  conversation.name(name);
  conversation.groupConversationType(groupConversationType);
  return conversation;
};

describe('syncMeetingConversationName', () => {
  it('renames a dedicated meeting conversation when the live name differs from the title', async () => {
    const conversation = createConversation({name: 'Old title'});
    const renameConversation = jest.fn().mockResolvedValue(undefined);
    const conversationRepository = {
      safeGetConversationById: jest.fn().mockReturnValue(task.resolve(conversation)),
      renameConversation,
    } as unknown as ConversationRepository;

    const result = await syncMeetingConversationName(conversationRepository, {
      qualifiedConversationId,
      title: 'New title',
    });

    expect(result.isOk).toBe(true);
    expect(renameConversation).toHaveBeenCalledWith(conversation, 'New title');
  });

  it('skips rename when the conversation name already matches the title', async () => {
    const conversation = createConversation({name: 'Same title'});
    const renameConversation = jest.fn().mockResolvedValue(undefined);
    const conversationRepository = {
      safeGetConversationById: jest.fn().mockReturnValue(task.resolve(conversation)),
      renameConversation,
    } as unknown as ConversationRepository;

    const result = await syncMeetingConversationName(conversationRepository, {
      qualifiedConversationId,
      title: 'Same title',
    });

    expect(result.isOk).toBe(true);
    expect(renameConversation).not.toHaveBeenCalled();
  });

  it('skips rename when the conversation is not a dedicated meeting conversation', async () => {
    const conversation = createConversation({
      name: 'Old title',
      groupConversationType: GROUP_CONVERSATION_TYPE.GROUP_CONVERSATION,
    });
    const renameConversation = jest.fn().mockResolvedValue(undefined);
    const conversationRepository = {
      safeGetConversationById: jest.fn().mockReturnValue(task.resolve(conversation)),
      renameConversation,
    } as unknown as ConversationRepository;

    const result = await syncMeetingConversationName(conversationRepository, {
      qualifiedConversationId,
      title: 'New title',
    });

    expect(result.isOk).toBe(true);
    expect(renameConversation).not.toHaveBeenCalled();
  });

  it('returns conversationRenameFailed when the conversation cannot be loaded', async () => {
    const conversationRepository = {
      safeGetConversationById: jest.fn().mockReturnValue(task.reject(new Error('missing'))),
      renameConversation: jest.fn(),
    } as unknown as ConversationRepository;

    const result = await syncMeetingConversationName(conversationRepository, {
      qualifiedConversationId,
      title: 'New title',
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.conversationRenameFailed);
  });

  it('returns conversationRenameFailed when renameConversation fails', async () => {
    const conversation = createConversation({name: 'Old title'});
    const conversationRepository = {
      safeGetConversationById: jest.fn().mockReturnValue(task.resolve(conversation)),
      renameConversation: jest.fn().mockRejectedValue(new Error('network')),
    } as unknown as ConversationRepository;

    const result = await syncMeetingConversationName(conversationRepository, {
      qualifiedConversationId,
      title: 'New title',
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(meetingSubmitErrors.conversationRenameFailed);
  });
});
