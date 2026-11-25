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

import {isEveryoneMentionApplicable, isSelfMentioned, isSelfTargeted} from './selfMention';

import {CONVERSATION_TYPE, GROUP_CONVERSATION_TYPE} from '../apiClient/conversation/conversation';
import {CONVERSATION_PROTOCOL} from '../apiClient/team/feature/featureList.types';
import {Conversation} from '../repositories/entity/Conversation';
import {ContentMessage} from '../repositories/entity/message/contentMessage';
import {Text} from '../repositories/entity/message/text';
import {User} from '../repositories/entity/User';
import {translateForTest} from '../util/test/translateForTest';
import {createUuid} from '../util/uuid';

import {MentionEntity} from './mentionEntity';

const createConversation = (
  type: CONVERSATION_TYPE,
  groupConversationType: GROUP_CONVERSATION_TYPE = GROUP_CONVERSATION_TYPE.GROUP_CONVERSATION,
): Conversation => {
  const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.MLS, translateForTest);
  conversation.type(type);
  conversation.groupConversationType(groupConversationType);
  return conversation;
};

const createMessage = (sender: User, mentions: MentionEntity[]): ContentMessage => {
  const text = new Text(createUuid(), 'Hey @all and @Self');
  text.mentions(mentions);
  const message = new ContentMessage(createUuid(), translateForTest);
  message.addAsset(text);
  message.user(sender);
  return message;
};

describe('selfMention', () => {
  const selfUser = new User(createUuid(), '', translateForTest);
  selfUser.isMe = true;
  const otherUser = new User(createUuid(), '', translateForTest);
  const everyoneMention = MentionEntity.everyone(4, 4);
  const directSelfMention = new MentionEntity(13, 5, selfUser.id, '');

  it.each([
    ['a group', CONVERSATION_TYPE.REGULAR, GROUP_CONVERSATION_TYPE.GROUP_CONVERSATION],
    ['a channel', CONVERSATION_TYPE.REGULAR, GROUP_CONVERSATION_TYPE.CHANNEL],
    ['a meeting', CONVERSATION_TYPE.REGULAR, GROUP_CONVERSATION_TYPE.MEETING],
  ])('counts a mention of everyone as mentioning self in %s', (_name, type, groupConversationType) => {
    const conversation = createConversation(type, groupConversationType);
    const message = createMessage(otherUser, [everyoneMention]);

    expect(isEveryoneMentionApplicable(conversation, message)).toBe(true);
    expect(isSelfMentioned(message, conversation, selfUser.qualifiedId)).toBe(true);
    expect(isSelfTargeted(message, conversation, selfUser.qualifiedId)).toBe(true);
  });

  it('does not count a mention of everyone in a 1:1', () => {
    const conversation = createConversation(CONVERSATION_TYPE.ONE_TO_ONE);
    const message = createMessage(otherUser, [everyoneMention]);

    expect(isSelfMentioned(message, conversation, selfUser.qualifiedId)).toBe(false);
  });

  it('does not count a mention of everyone in the self user own message', () => {
    const conversation = createConversation(CONVERSATION_TYPE.REGULAR);
    const message = createMessage(selfUser, [everyoneMention]);

    expect(isSelfMentioned(message, conversation, selfUser.qualifiedId)).toBe(false);
  });

  it('does not count a mention of everyone without a conversation', () => {
    const message = createMessage(otherUser, [everyoneMention]);

    expect(isSelfMentioned(message, undefined, selfUser.qualifiedId)).toBe(false);
  });

  it('still counts a direct mention in a 1:1', () => {
    const conversation = createConversation(CONVERSATION_TYPE.ONE_TO_ONE);
    const message = createMessage(otherUser, [directSelfMention]);

    expect(isSelfMentioned(message, conversation, selfUser.qualifiedId)).toBe(true);
  });

  it('counts a message with both a mention of everyone and a direct mention once in the unread state', () => {
    const conversation = createConversation(CONVERSATION_TYPE.REGULAR);
    conversation.selfUser(selfUser);
    const message = createMessage(otherUser, [everyoneMention, directSelfMention]);
    message.timestamp(Date.now());
    conversation.addMessage(message);

    expect(conversation.unreadState().selfMentions).toEqual([message]);
  });

  it('puts an unread mention of everyone in the self mentions of a group, not of a 1:1', () => {
    const group = createConversation(CONVERSATION_TYPE.REGULAR);
    group.selfUser(selfUser);
    const groupMessage = createMessage(otherUser, [everyoneMention]);
    groupMessage.timestamp(Date.now());
    group.addMessage(groupMessage);

    const oneToOne = createConversation(CONVERSATION_TYPE.ONE_TO_ONE);
    oneToOne.selfUser(selfUser);
    const oneToOneMessage = createMessage(otherUser, [everyoneMention]);
    oneToOneMessage.timestamp(Date.now());
    oneToOne.addMessage(oneToOneMessage);

    expect(group.unreadState().selfMentions).toEqual([groupMessage]);
    expect(oneToOne.unreadState().selfMentions).toEqual([]);
    expect(oneToOne.unreadState().otherMessages).toEqual([oneToOneMessage]);
  });
});
