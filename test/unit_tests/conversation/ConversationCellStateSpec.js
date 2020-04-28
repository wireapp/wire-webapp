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

import {createRandomUuid} from 'Util/util';
import {t} from 'Util/LocalizerUtil';

import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {Text} from 'src/script/entity/message/Text';
import {PingMessage} from 'src/script/entity/message/PingMessage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';
import {ConversationStatusIcon} from 'src/script/conversation/ConversationStatusIcon';
import {generateCellState} from 'src/script/conversation/ConversationCellState';

describe('ConversationCellState', () => {
  describe('Notification state icon', () => {
    const conversationEntity = new Conversation(createRandomUuid());

    const selfUserEntity = new User(createRandomUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.inTeam(true);
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
    const defaultUnreadState = {
      allEvents: [],
      allMessages: [],
      calls: [],
      otherMessages: [],
      pings: [],
      selfMentions: [],
      selfReplies: [],
    };

    const conversationEntity = new Conversation(createRandomUuid());

    const selfUserEntity = new User(createRandomUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.inTeam(true);
    conversationEntity.selfUser(selfUserEntity);

    conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);

    const contentMessage = new ContentMessage();
    const text = new Text('id', 'Hello there');
    contentMessage.unsafeSenderName = () => 'Felix';
    contentMessage.assets([text]);

    const pingMessage = new PingMessage();

    const tests = [
      {
        description: 'returns the number of missed calls',
        expected: {
          description: t('conversationsSecondaryLineSummaryMissedCalls', 2),
          icon: ConversationStatusIcon.MISSED_CALL,
        },
        unreadState: {...defaultUnreadState, calls: [{}, {}]},
      },
      {
        description: "returns unread message's text if there is only a single text message",
        expected: {
          group: {description: 'Felix: Hello there', icon: ConversationStatusIcon.UNREAD_MESSAGES},
          one2one: {description: 'Hello there', icon: ConversationStatusIcon.UNREAD_MESSAGES},
        },
        unreadState: {...defaultUnreadState, allMessages: [contentMessage]},
      },
      {
        description: 'returns the number of pings',
        expected: {
          description: t('conversationsSecondaryLineSummaryPings', 2),
          icon: ConversationStatusIcon.UNREAD_PING,
        },
        unreadState: {...defaultUnreadState, pings: [pingMessage, pingMessage]},
      },
      {
        description: 'returns the number of mentions',
        expected: {
          description: t('conversationsSecondaryLineSummaryMentions', 2),
          icon: ConversationStatusIcon.UNREAD_MENTION,
        },
        unreadState: {...defaultUnreadState, selfMentions: [1, 2]},
      },
      {
        description: 'prioritizes mentions, calls, pings and messages',
        expected: {
          description: `${t('conversationsSecondaryLineSummaryMentions', 2)}, ${t(
            'conversationsSecondaryLineSummaryMissedCalls',
            2,
          )}, ${t('conversationsSecondaryLineSummaryPings', 2)}, ${t('conversationsSecondaryLineSummaryMessages', 2)}`,
          icon: ConversationStatusIcon.UNREAD_MENTION,
        },
        unreadState: {...defaultUnreadState, calls: [1, 2], otherMessages: [1, 2], pings: [1, 2], selfMentions: [1, 2]},
      },
    ];

    conversationEntity.isGroup = () => false;
    tests.forEach(({description, expected, unreadState}) => {
      const expectedOne2One = expected.one2one || expected;
      conversationEntity.unreadState = () => unreadState;
      const state = generateCellState(conversationEntity);

      it(`${description} (1:1)`, () => {
        expect(state).toEqual(expectedOne2One);
      });
    });

    conversationEntity.isGroup = () => true;
    tests.forEach(({description, expected, unreadState}) => {
      const expectedGroup = expected.group || expected;
      conversationEntity.unreadState = () => unreadState;
      const state = generateCellState(conversationEntity);

      it(`${description} (group)`, () => {
        expect(state).toEqual(expectedGroup);
      });
    });
  });
});
