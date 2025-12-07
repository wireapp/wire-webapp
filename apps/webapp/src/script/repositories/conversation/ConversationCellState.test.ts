/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
import {Conversation} from 'Repositories/entity/Conversation';
import {CallMessage} from 'Repositories/entity/message/CallMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {PingMessage} from 'Repositories/entity/message/PingMessage';
import {Text} from 'Repositories/entity/message/Text';
import {User} from 'Repositories/entity/User';
import {t} from 'Util/LocalizerUtil';
import {createUuid} from 'Util/uuid';

import {generateCellState} from './ConversationCellState';
import {ConversationStatusIcon} from './ConversationStatusIcon';
import {NOTIFICATION_STATE} from './NotificationSetting';

import {CALL_MESSAGE_TYPE} from '../../message/CallMessageType';

describe('ConversationCellState', () => {
  describe('Notification state icon', () => {
    const conversationEntity = new Conversation(createUuid());

    const selfUserEntity = new User(createUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.teamId = createUuid();
    conversationEntity.selfUser(selfUserEntity);

    it('returns empty state if notifications are set to everything', () => {
      conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);

      expect(generateCellState(conversationEntity)).toEqual({description: '', icon: 'none'});
    });

    it('returns the muted icon if state is set to mentions and replies', () => {
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);

      expect(generateCellState(conversationEntity)).toEqual({description: '', icon: 'muted'});
    });

    it('returns the muted icon if no notifications are allowed', () => {
      conversationEntity.mutedState(NOTIFICATION_STATE.NOTHING);

      expect(generateCellState(conversationEntity)).toEqual({description: '', icon: 'muted'});
    });
  });

  describe('Second line description for conversations', () => {
    const conversationEntity = new Conversation(createUuid());

    const selfUserEntity = new User(createUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.teamId = createUuid();
    conversationEntity.selfUser(selfUserEntity);

    conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);

    const sender = new User();
    sender.name('Felix');
    const contentMessage = new ContentMessage();
    const text = new Text('id', 'Hello there');
    contentMessage.user(sender);
    contentMessage.assets([text]);

    const pingMessage = new PingMessage();

    const callMessage = new CallMessage(CALL_MESSAGE_TYPE.ACTIVATED, undefined, 0);

    const mention = new ContentMessage();
    jest.spyOn(mention, 'isUserMentioned').mockReturnValue(true);

    const tests = [
      {
        description: 'returns the number of missed calls',
        expected: {
          description: t('conversationsSecondaryLineSummaryMissedCalls', {number: 2}),
          icon: ConversationStatusIcon.MISSED_CALL,
        },
        messages: [callMessage, callMessage],
      },
      {
        description: "returns unread message's text if there is only a single text message",
        expected: {
          group: {description: 'Felix: Hello there', icon: ConversationStatusIcon.UNREAD_MESSAGES},
          one2one: {description: 'Hello there', icon: ConversationStatusIcon.UNREAD_MESSAGES},
        },
        messages: [contentMessage],
      },
      {
        description: 'returns the number of pings',
        expected: {
          description: t('conversationsSecondaryLineSummaryPings', {number: 2}),
          icon: ConversationStatusIcon.UNREAD_PING,
        },
        messages: [pingMessage, pingMessage],
      },
      {
        description: 'returns the number of mentions',
        expected: {
          description: t('conversationsSecondaryLineSummaryMentions', {number: 2}),
          icon: ConversationStatusIcon.UNREAD_MENTION,
        },
        messages: [mention, mention],
      },
      {
        description: 'prioritizes mentions, calls, pings and messages',
        expected: {
          description: `${t('conversationsSecondaryLineSummaryMentions', {number: 2})}, ${t(
            'conversationsSecondaryLineSummaryMissedCalls',
            {number: 2},
          )}, ${t('conversationsSecondaryLineSummaryPings', {number: 2})}, ${t('conversationsSecondaryLineSummaryMessages', {number: 2})}`,
          icon: ConversationStatusIcon.UNREAD_MENTION,
        },
        messages: [
          contentMessage,
          contentMessage,
          callMessage,
          callMessage,
          mention,
          mention,
          pingMessage,
          pingMessage,
        ],
      },
    ];

    conversationEntity.type(CONVERSATION_TYPE.ONE_TO_ONE);

    tests.forEach(({description, expected, messages}) => {
      const expectedOne2One = expected.one2one || expected;
      conversationEntity.messages_unordered(messages);
      const state = generateCellState(conversationEntity);

      it(`${description} (1:1)`, () => {
        expect(state).toEqual(expectedOne2One);
      });
    });

    conversationEntity.type(CONVERSATION_TYPE.REGULAR);
    tests.forEach(({description, expected, messages}) => {
      const expectedGroup = expected.group || expected;
      conversationEntity.messages_unordered(messages);
      const state = generateCellState(conversationEntity);

      it(`${description} (group)`, () => {
        expect(state).toEqual(expectedGroup);
      });
    });
  });
});
