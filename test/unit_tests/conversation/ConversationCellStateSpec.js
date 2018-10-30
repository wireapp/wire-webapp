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

// grunt test_init && grunt test_run:conversation/ConversationCellState

'use strict';

describe('z.conversation.ConversationCellState', () => {
  const conversationCellState = z.conversation.ConversationCellState;
  const NOTIFICATION_STATES = z.conversation.NotificationSetting.STATE;

  describe('Notification state icon', () => {
    const conversationEntity = new z.entity.Conversation(z.util.createRandomUuid());

    const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
    selfUserEntity.is_me = true;
    selfUserEntity.inTeam(true);
    conversationEntity.selfUser(selfUserEntity);

    it('returns empty state if notifications are set to everything', () => {
      conversationEntity.mutedState(NOTIFICATION_STATES.EVERYTHING);

      expect(conversationCellState.generate(conversationEntity)).toEqual({description: '', icon: 'none'});
    });

    it('returns the muted icon if state is set to mentions and replies', () => {
      conversationEntity.mutedState(NOTIFICATION_STATES.MENTIONS_AND_REPLIES);

      expect(conversationCellState.generate(conversationEntity)).toEqual({description: '', icon: 'muted'});
    });

    it('returns the muted icon if no notifications are allowed', () => {
      conversationEntity.mutedState(NOTIFICATION_STATES.NOTHING);

      expect(conversationCellState.generate(conversationEntity)).toEqual({description: '', icon: 'muted'});
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

    const conversationEntity = new z.entity.Conversation(z.util.createRandomUuid());

    const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
    selfUserEntity.is_me = true;
    selfUserEntity.inTeam(true);
    conversationEntity.selfUser(selfUserEntity);

    conversationEntity.mutedState(NOTIFICATION_STATES.EVERYTHING);

    const contentMessage = new z.entity.ContentMessage();
    const text = new z.entity.Text('id', 'Hello there');
    contentMessage.unsafeSenderName = () => 'Felix';
    contentMessage.assets([text]);

    const pingMessage = new z.entity.PingMessage();

    const tests = [
      {
        description: 'returns the number of missed calls',
        expected: {description: '2 missed calls', icon: z.conversation.ConversationStatusIcon.MISSED_CALL},
        unreadState: Object.assign({}, defaultUnreadState, {
          calls: [{}, {}],
        }),
      },
      {
        description: "returns unread message's text if there is only a single text message",
        expected: {
          group: {description: 'Felix: Hello there', icon: z.conversation.ConversationStatusIcon.UNREAD_MESSAGES},
          one2one: {description: 'Hello there', icon: z.conversation.ConversationStatusIcon.UNREAD_MESSAGES},
        },
        unreadState: Object.assign({}, defaultUnreadState, {
          allMessages: [contentMessage],
        }),
      },
      {
        description: 'returns the number of pings',
        expected: {description: '2 pings', icon: z.conversation.ConversationStatusIcon.UNREAD_PING},
        unreadState: Object.assign({}, defaultUnreadState, {
          pings: [pingMessage, pingMessage],
        }),
      },
      {
        description: 'returns the number of mentions',
        expected: {description: '2 mentions', icon: z.conversation.ConversationStatusIcon.UNREAD_MENTION},
        unreadState: Object.assign({}, defaultUnreadState, {
          selfMentions: [1, 2],
        }),
      },
      {
        description: 'prioritizes mentions, calls, pings and messages',
        expected: {
          description: '2 mentions, 2 missed calls, 2 pings, 2 messages',
          icon: z.conversation.ConversationStatusIcon.UNREAD_MENTION,
        },
        unreadState: Object.assign({}, defaultUnreadState, {
          calls: [1, 2],
          otherMessages: [1, 2],
          pings: [1, 2],
          selfMentions: [1, 2],
        }),
      },
    ];

    conversationEntity.isGroup = () => false;
    tests.forEach(({description, expected, unreadState}) => {
      const expectedOne2One = expected.one2one || expected;
      conversationEntity.unreadState = () => unreadState;
      const state = conversationCellState.generate(conversationEntity);

      it(`${description} (1:1)`, () => {
        expect(state).toEqual(expectedOne2One);
      });
    });

    conversationEntity.isGroup = () => true;
    tests.forEach(({description, expected, unreadState}) => {
      const expectedGroup = expected.group || expected;
      conversationEntity.unreadState = () => unreadState;
      const state = conversationCellState.generate(conversationEntity);

      it(`${description} (group)`, () => {
        expect(state).toEqual(expectedGroup);
      });
    });
  });
});
