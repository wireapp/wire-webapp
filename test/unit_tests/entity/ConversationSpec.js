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

import Conversation from 'src/script/entity/Conversation';
import ContentMessage from 'src/script/entity/message/ContentMessage';
import Message from 'src/script/entity/message/Message';
import ConversationMapper from 'src/script/conversation/ConversationMapper';

describe('Conversation', () => {
  let conversation_et = null;
  let other_user = null;

  const self_user = new z.entity.User(entities.user.john_doe.id);
  self_user.is_me = true;

  const first_timestamp = new Date('2017-09-26T09:21:14.225Z').getTime();
  const second_timestamp = new Date('2017-09-26T10:27:18.837Z').getTime();

  beforeEach(() => {
    conversation_et = new Conversation();
    other_user = new z.entity.User(entities.user.jane_roe.id);
  });

  describe('type checks', () => {
    beforeEach(() => (conversation_et = new Conversation()));

    it('should return the expected value for personal conversations', () => {
      conversation_et.type(z.conversation.ConversationType.CONNECT);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeTruthy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.SELF);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeTruthy();

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();
    });

    it('should return the expected value for team conversations', () => {
      conversation_et.team_id = z.util.createRandomUuid();

      conversation_et.type(z.conversation.ConversationType.CONNECT);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeTruthy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.SELF);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeTruthy();

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.participating_user_ids.push(z.util.createRandomUuid());
      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.participating_user_ids.push(z.util.createRandomUuid());
      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();
    });
  });

  describe('add message', () => {
    let initial_message_et = undefined;

    beforeEach(() => {
      initial_message_et = new Message(z.util.createRandomUuid());
      initial_message_et.timestamp(first_timestamp);
      conversation_et.add_message(initial_message_et);
    });

    afterEach(() => conversation_et.remove_messages());

    it('should not add message with an exisiting id', () => {
      conversation_et.add_message(initial_message_et);

      expect(conversation_et.messages().length).toBe(1);
    });

    it('does not add new message if it already exists in the message list', () => {
      const initialLength = conversation_et.messages().length;
      const newMessageEntity = new Message(z.util.createRandomUuid());
      newMessageEntity.id = initial_message_et.id;

      conversation_et.add_message(newMessageEntity, true);

      expect(conversation_et.messages().length).toBe(initialLength);
      expect(conversation_et.messages().some(message => message == newMessageEntity)).toBe(false);
    });

    it('should add message with a newer timestamp', () => {
      const message_et = new Message(z.util.createRandomUuid());
      message_et.timestamp(second_timestamp);

      conversation_et.add_message(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getLastMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(second_timestamp);
    });

    it('should add message with an older timestamp', () => {
      const older_timestamp = first_timestamp - 100;
      const message_et = new Message(z.util.createRandomUuid());
      message_et.timestamp(older_timestamp);

      conversation_et.add_message(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getFirstMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(older_timestamp);
    });

    describe('affects last_event_timestamp', () => {
      it('and adding a message should update it', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(second_timestamp);
      });

      it('and adding a message should not update it if affect_order is false', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);
        message_et.affect_order(false);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });

      it('and adding a message should not update it if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });
    });

    describe('affects last_read_timestamp', () => {
      it('and adding a message should update it if sent by self user', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);
        message_et.user(self_user);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(second_timestamp);
      });

      it('should not update last read if last message was not send from self user', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });

      it('should not update last read if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(z.util.createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });
    });
  });

  describe('add_messages', () => {
    const reference_timestamp = Date.now();

    const message1 = new Message();
    message1.id = z.util.createRandomUuid();
    message1.timestamp(reference_timestamp - 10000);
    message1.user(self_user);

    const message2 = new Message();
    message2.id = z.util.createRandomUuid();
    message2.timestamp(reference_timestamp - 5000);

    it('adds multiple messages', () => {
      const message_ets = [message1, message2];
      conversation_et.add_messages(message_ets);

      expect(conversation_et.messages_unordered().length).toBe(2);
    });
  });

  describe('getLastDeliveredMessage', () => {
    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.getLastDeliveredMessage()).not.toBeDefined();
    });

    it('returns last delivered message', () => {
      const remoteUserEntity = new z.entity.User(z.util.createRandomUuid());
      const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
      selfUserEntity.is_me = true;

      const sentMessageEntity = new ContentMessage(z.util.createRandomUuid());
      sentMessageEntity.user(selfUserEntity);
      sentMessageEntity.status(z.message.StatusType.SENT);
      conversation_et.add_message(sentMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).not.toBeDefined();

      const deliveredMessageEntity = new ContentMessage(z.util.createRandomUuid());
      deliveredMessageEntity.user(selfUserEntity);
      deliveredMessageEntity.status(z.message.StatusType.DELIVERED);
      conversation_et.add_message(deliveredMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextSentMessageEntity = new ContentMessage(z.util.createRandomUuid());
      nextSentMessageEntity.user(selfUserEntity);
      nextSentMessageEntity.status(z.message.StatusType.SENT);
      conversation_et.add_message(nextSentMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextDeliveredMessageEntity = new ContentMessage(z.util.createRandomUuid());
      nextDeliveredMessageEntity.user(selfUserEntity);
      nextDeliveredMessageEntity.status(z.message.StatusType.DELIVERED);
      conversation_et.add_message(nextDeliveredMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(nextDeliveredMessageEntity);

      const remoteMessageEntity = new ContentMessage(z.util.createRandomUuid());
      remoteMessageEntity.user(remoteUserEntity);
      remoteMessageEntity.status(z.message.StatusType.DELIVERED);
      conversation_et.add_message(remoteMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(nextDeliveredMessageEntity);
    });
  });

  describe('get_last_editable_message', () => {
    let self_user_et = undefined;

    beforeEach(() => {
      self_user_et = new z.entity.User();
      self_user_et.is_me = true;
    });

    afterEach(() => conversation_et.remove_messages());

    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', () => {
      const message_et = new z.entity.PingMessage();
      message_et.id = z.util.createRandomUuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);

      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', () => {
      const message_et = new z.entity.PingMessage();
      message_et.id = z.util.createRandomUuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);

      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is text and not send by self user', () => {
      const message_et = new ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.createRandomUuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);

      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const ping_message_et = new z.entity.PingMessage();
      ping_message_et.id = z.util.createRandomUuid();
      ping_message_et.user(new z.entity.User());
      conversation_et.add_message(ping_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(message_et.id);
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const next_message_et = new ContentMessage();
      next_message_et.add_asset(new z.entity.Text());
      next_message_et.id = z.util.createRandomUuid();
      next_message_et.user(self_user_et);
      conversation_et.add_message(next_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(next_message_et.id);
    });

    it('returns message if last message is text and ephemeral', () => {
      const message_et = new ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const ephemeral_message_et = new ContentMessage();
      ephemeral_message_et.add_asset(new z.entity.Text());
      ephemeral_message_et.id = z.util.createRandomUuid();
      ephemeral_message_et.user(self_user_et);
      ephemeral_message_et.ephemeral_expires(true);
      conversation_et.add_message(ephemeral_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(message_et.id);
    });
  });

  describe('get_next_iso_date', () => {
    it('should return an expected ISO string', () => {
      const referenceTimestamp = Date.now() - 1;
      const reference_iso_date = new Date(referenceTimestamp).toISOString();

      expect(conversation_et.get_next_iso_date(referenceTimestamp)).toBe(reference_iso_date);
      expect(conversation_et.get_next_iso_date('foo')).toBeGreaterThan(reference_iso_date);

      const last_server_timestamp = referenceTimestamp + 10000;
      conversation_et.last_server_timestamp(last_server_timestamp);
      const expected_iso_date = new Date(last_server_timestamp + 1).toISOString();

      expect(conversation_et.get_next_iso_date(referenceTimestamp)).toEqual(expected_iso_date);
      expect(conversation_et.get_next_iso_date('foo')).toEqual(expected_iso_date);
    });
  });

  describe('display_name', () => {
    it('displays a name if the conversation is a 1:1 conversation or a connection request', () => {
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());

      conversation_et.type(z.conversation.ConversationType.CONNECT);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());
    });

    it('displays a fallback if no user name has been set', () => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.display_name()).toBe('…');

      conversation_et.type(z.conversation.ConversationType.CONNECT);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays a group conversation name with names from the participants', () => {
      const third_user = new z.entity.User(z.util.createRandomUuid());
      third_user.name('Brad Delson');
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.participating_user_ets.push(third_user);
      conversation_et.type(z.conversation.ConversationType.GROUP);
      const expected_display_name = `${conversation_et
        .participating_user_ets()[0]
        .first_name()}, ${conversation_et.participating_user_ets()[1].first_name()}`;

      expect(conversation_et.display_name()).toBe(expected_display_name);
    });

    it('displays "Empty Conversation" if no other participants are in the conversation', () => {
      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.display_name()).toBe(z.string.conversationsEmptyConversation);
    });

    it('displays a fallback if no user name has been set for a group conversation', () => {
      const user = new z.entity.User(z.util.createRandomUuid());
      conversation_et.type(z.conversation.ConversationType.GROUP);
      conversation_et.participating_user_ids.push(other_user.id);
      conversation_et.participating_user_ids.push(user.id);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays the conversation name for a self conversation', () => {
      conversation_et.type(z.conversation.ConversationType.SELF);

      expect(conversation_et.display_name()).toBe('…');

      const conversation_name = 'My favorite music band';
      conversation_et.name(conversation_name);

      expect(conversation_et.display_name()).toBe('…');
    });
  });

  describe('getNumberOfClients', () => {
    it('should return the number of all known clients  (including own clients)', () => {
      const first_client = new z.client.ClientEntity();
      first_client.id = '5021d77752286cac';

      const second_client = new z.client.ClientEntity();
      second_client.id = '575b7a890cdb7635';

      const third_client = new z.client.ClientEntity();
      third_client.id = '6c0daa855d6b8b6e';

      const user_et = new z.entity.User();
      user_et.devices.push(first_client);
      user_et.devices.push(second_client);

      const second_user_et = new z.entity.User();
      second_user_et.devices.push(third_client);

      conversation_et.participating_user_ets.push(user_et);
      conversation_et.participating_user_ets.push(second_user_et);

      expect(conversation_et.getNumberOfClients()).toBe(4);
    });
  });

  describe('is_verified', () => {
    it('is not verified when nothing is set', () => {
      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when self user has no remote clients', () => {
      const verified_client_et = new z.client.ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new z.entity.User(z.util.createRandomUuid());
      self_user_et.is_me = true;
      conversation_et.selfUser(self_user_et);

      const user_et = new z.entity.User();
      user_et.devices.push(verified_client_et);
      conversation_et.participating_user_ets.push(user_et);

      expect(conversation_et.is_verified()).toBeTruthy();
    });

    it('is not verified when participant has unverified device', () => {
      const unverified_client_et = new z.client.ClientEntity();
      const verified_client_et = new z.client.ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new z.entity.User();
      self_user_et.is_me = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new z.entity.User();
      user_et.devices.push(unverified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new z.entity.User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when all users are verified', () => {
      const verified_client_et = new z.client.ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new z.entity.User();
      self_user_et.is_me = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new z.entity.User();
      user_et.devices.push(verified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new z.entity.User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeTruthy();
    });
  });

  describe('hasGuest', () => {
    it('detects conversations with guest', () => {
      conversation_et = new Conversation(z.util.createRandomUuid());
      const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
      selfUserEntity.is_me = true;
      selfUserEntity.inTeam(true);
      conversation_et.selfUser(selfUserEntity);

      // Is false for conversations not containing a guest
      const userEntity = new z.entity.User(z.util.createRandomUuid());
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.hasGuest()).toBe(false);

      // Is true for group conversations containing a guest
      const secondUserEntity = new z.entity.User(z.util.createRandomUuid());
      secondUserEntity.isGuest(true);
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.hasGuest()).toBe(true);

      // Is false for conversations containing a guest if the self user is a personal account
      selfUserEntity.inTeam(false);
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.hasGuest()).toBe(false);
    });
  });

  describe('hasService', () => {
    it('detects conversations with services', () => {
      const userEntity = new z.entity.User(z.util.createRandomUuid());

      conversation_et = new Conversation(z.util.createRandomUuid());
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.hasService()).toBe(false);

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.hasService()).toBe(false);

      const secondUserEntity = new z.entity.User(z.util.createRandomUuid());
      secondUserEntity.isService = true;
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);

      expect(conversation_et.hasService()).toBe(true);

      conversation_et.type(z.conversation.ConversationType.GROUP);

      expect(conversation_et.hasService()).toBe(true);
    });
  });

  describe('messages_visible', () => {
    it('should return no messages if conversation ID is empty', () => {
      expect(conversation_et.id).toBe('');
      expect(conversation_et.messages_visible().length).toBe(0);
    });

    it('returns visible unmerged pings', () => {
      const timestamp = Date.now();
      conversation_et.id = z.util.createRandomUuid();

      const ping_message_1 = new z.entity.PingMessage();
      ping_message_1.timestamp(timestamp - 4000);
      ping_message_1.id = z.util.createRandomUuid();

      const ping_message_2 = new z.entity.PingMessage();
      ping_message_2.timestamp(timestamp - 2000);
      ping_message_2.id = z.util.createRandomUuid();

      const ping_message_3 = new z.entity.PingMessage();
      ping_message_3.timestamp(timestamp);
      ping_message_3.id = z.util.createRandomUuid();

      conversation_et.add_message(ping_message_1);
      conversation_et.add_message(ping_message_2);
      conversation_et.add_message(ping_message_3);

      expect(conversation_et.messages_unordered().length).toBe(3);
      expect(conversation_et.messages().length).toBe(3);
      expect(conversation_et.messages_visible().length).toBe(3);
    });
  });

  describe('release', () => {
    it('should not release messages if conversation has unread messages', () => {
      const message_et = new Message(z.util.createRandomUuid());
      message_et.timestamp(second_timestamp);
      conversation_et.add_message(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(1);

      conversation_et.release();

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(1);
    });

    it('should release messages if conversation has no unread messages', () => {
      const message_et = new Message(z.util.createRandomUuid());
      message_et.timestamp(first_timestamp);
      conversation_et.add_message(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(0);

      conversation_et.release();

      expect(conversation_et.hasAdditionalMessages()).toBeTruthy();
      expect(conversation_et.is_loaded()).toBeFalsy();
      expect(conversation_et.messages().length).toBe(0);
      expect(conversation_et.unreadState().allEvents.length).toBe(0);
    });
  });

  describe('remove_message_by_id', () => {
    let message_id = undefined;

    beforeEach(() => {
      const message_et = new Message(z.util.createRandomUuid());
      conversation_et.add_message(message_et);
      message_id = message_et.id;
    });

    afterEach(() => conversation_et.remove_messages());

    it('should remove message by id', () => {
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.remove_message_by_id(message_id);

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all message with the same id', () => {
      const duplicated_message_et = new Message(message_id);

      expect(conversation_et.messages().length).toBe(1);
      conversation_et.add_message(duplicated_message_et);

      expect(conversation_et.messages().length).toBe(1);
      conversation_et.messages_unordered.push(duplicated_message_et);

      expect(conversation_et.messages().length).toBe(2);

      conversation_et.remove_message_by_id(message_id);

      expect(conversation_et.messages().length).toBe(0);
    });
  });

  describe('remove_messages', () => {
    let message_et = undefined;

    beforeEach(() => {
      const first_message_et = new Message(z.util.createRandomUuid());
      first_message_et.timestamp(first_timestamp);
      conversation_et.add_message(first_message_et);

      message_et = new Message(z.util.createRandomUuid());
      message_et.timestamp(second_timestamp);
      conversation_et.add_message(message_et);
    });

    afterEach(() => conversation_et.remove_messages());

    it('should remove all messages', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.remove_messages();

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all messages for invalid input timestamp', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.remove_messages('foo');

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove expected messages for timestamp greater than message', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.remove_messages(first_timestamp + 1);

      expect(conversation_et.messages().length).toBe(1);
    });

    it('should remove expected messages for timestamp equal to message', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.remove_messages(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
    });
  });

  describe('setTimestamp', () => {
    it('turns strings into numbers', () => {
      const lrt = conversation_et.last_read_timestamp();

      expect(lrt).toBe(0);
      const new_lrt_string = '1480338525243';
      const new_lrt_number = window.parseInt(new_lrt_string, 10);
      conversation_et.setTimestamp(new_lrt_string, Conversation.TIMESTAMP_TYPE.LAST_READ);

      expect(conversation_et.last_read_timestamp()).toBe(new_lrt_number);
    });

    it('checks that new timestamp is newer that previous one', () => {
      const currentTimestamp = conversation_et.last_read_timestamp();
      const newTimestamp = currentTimestamp - 10;
      conversation_et.setTimestamp(newTimestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);

      expect(conversation_et.last_read_timestamp()).toBe(currentTimestamp);
    });

    it('allows to set an older timestamp with the forceUpdate flag', () => {
      const currentTimestamp = conversation_et.last_read_timestamp();
      const newTimestamp = currentTimestamp - 10;
      conversation_et.setTimestamp(newTimestamp, Conversation.TIMESTAMP_TYPE.LAST_READ, true);

      expect(conversation_et.last_read_timestamp()).toBe(newTimestamp);
    });
  });

  describe('shouldUnarchive', () => {
    let timestamp = undefined;
    let contentMessage = undefined;
    let mutedTimestampMessage = undefined;
    let outdatedMessage = undefined;
    let pingMessage = undefined;
    let selfMentionMessage = undefined;

    const conversationEntity = new Conversation(z.util.createRandomUuid());

    const selfUserEntity = new z.entity.User(z.util.createRandomUuid());
    selfUserEntity.is_me = true;
    selfUserEntity.inTeam(true);
    conversationEntity.selfUser(selfUserEntity);

    beforeEach(() => {
      timestamp = Date.now();
      conversationEntity.archivedTimestamp(timestamp);
      conversationEntity.archivedState(true);

      mutedTimestampMessage = new z.entity.PingMessage();
      mutedTimestampMessage.timestamp(timestamp);

      outdatedMessage = new z.entity.PingMessage();
      outdatedMessage.timestamp(timestamp - 100);

      contentMessage = new ContentMessage();
      contentMessage.assets([new z.entity.Text('id', 'Hello there')]);
      contentMessage.timestamp(timestamp + 100);

      pingMessage = new z.entity.PingMessage();
      pingMessage.timestamp(timestamp + 200);

      selfMentionMessage = new ContentMessage();
      const mentionEntity = new z.message.MentionEntity(0, 7, selfUserEntity.id);
      const textAsset = new z.entity.Text('id', '@Gregor, Hello there');
      textAsset.mentions.push(mentionEntity);
      selfMentionMessage.assets([textAsset]);
      selfMentionMessage.timestamp(timestamp + 300);
    });

    afterEach(() => conversationEntity.messages_unordered.removeAll());

    it('returns false if conversation is not archived', () => {
      conversationEntity.archivedState(false);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(outdatedMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(mutedTimestampMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(contentMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(pingMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(selfMentionMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
    });

    it('returns false if conversation is in no notification state', () => {
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.NOTHING);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(outdatedMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(mutedTimestampMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(contentMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(pingMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(selfMentionMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
    });

    it('returns expected value if conversation is in only mentions notifications state', () => {
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.MENTIONS_AND_REPLIES);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(outdatedMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(mutedTimestampMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(contentMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(pingMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(selfMentionMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
    });

    it('returns expected value if conversation is in everything notifications state', () => {
      conversationEntity.mutedState(z.conversation.NotificationSetting.STATE.EVERYTHING);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(outdatedMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(mutedTimestampMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(contentMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
      conversationEntity.messages_unordered.removeAll();

      const memberLeaveMessage = new z.entity.MemberMessage();
      memberLeaveMessage.type = z.event.Backend.CONVERSATION.MEMBER_LEAVE;
      memberLeaveMessage.timestamp(timestamp + 100);
      conversationEntity.messages_unordered.push(memberLeaveMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);

      const callMessage = new z.entity.CallMessage();
      callMessage.call_message_type = z.message.CALL_MESSAGE_TYPE.ACTIVATED;
      callMessage.timestamp(timestamp + 200);
      conversationEntity.messages_unordered.push(callMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
      conversationEntity.messages_unordered.removeAll();
      conversationEntity.messages_unordered.push(memberLeaveMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      const memberJoinMessage = new z.entity.MemberMessage();
      memberJoinMessage.type = z.event.Backend.CONVERSATION.MEMBER_JOIN;
      memberJoinMessage.timestamp(timestamp + 200);
      conversationEntity.messages_unordered.push(memberJoinMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      const selfJoinMessage = new z.entity.MemberMessage();
      selfJoinMessage.type = z.event.Backend.CONVERSATION.MEMBER_JOIN;
      selfJoinMessage.userIds.push(selfUserEntity.id);
      selfJoinMessage.timestamp(timestamp + 200);
      conversationEntity.messages_unordered.push(selfJoinMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
    });
  });

  describe('_incrementTimeOnly', () => {
    it('should update only to newer timestamps', () => {
      expect(conversation_et._incrementTimeOnly(first_timestamp, second_timestamp)).toBe(second_timestamp);
      expect(conversation_et._incrementTimeOnly(second_timestamp, first_timestamp)).toBeFalsy();
      expect(conversation_et._incrementTimeOnly(first_timestamp, first_timestamp)).toBeFalsy();
    });
  });

  describe('check subscribers', () =>
    it('to state updates', () => {
      conversation_et.archivedState(false);
      conversation_et.cleared_timestamp(0);
      conversation_et.last_event_timestamp(1467650148305);
      conversation_et.last_read_timestamp(1467650148305);
      conversation_et.mutedState(z.conversation.NotificationSetting.STATE.EVERYTHING);

      expect(conversation_et.last_event_timestamp.getSubscriptionsCount()).toEqual(1);
      expect(conversation_et.last_read_timestamp.getSubscriptionsCount()).toEqual(1);
    }));

  describe('connection', () => {
    it('updates the participating user IDs with the user ID of the other party', () => {
      const connector_user_id = 'b43b376d-7b5a-4d77-89be-81a02892db8c';

      // prettier-ignore
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const payload_connection = {"status":"sent","conversation":"15a7f358-8eba-4b8e-bcf2-61a08eb53349","to":`${connector_user_id}`,"from":"616cbbeb-1360-4e17-b333-e000662257bd","last_update":"2017-05-10T11:34:18.396Z","message":" "};
      // prettier-ignore
      const payload_conversation = {"access":["private"],"creator":"616cbbeb-1360-4e17-b333-e000662257bd","members":{"self":{"hidden_ref":null,"status":0,"last_read":"1.800122000a73cb62","muted_time":null,"service":null,"otr_muted_ref":null,"muted":null,"status_time":"2017-05-10T11:34:18.376Z","hidden":false,"status_ref":"0.0","id":"616cbbeb-1360-4e17-b333-e000662257bd","otr_archived":false,"cleared":null,"otr_muted":false,"otr_archived_ref":null,"archived":null},"others":[]},"name":"Marco","id":"15a7f358-8eba-4b8e-bcf2-61a08eb53349","type":3,"last_event_time":"2017-05-10T11:34:18.376Z","last_event":"2.800122000a73cb63"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */

      const connectionMapper = new z.connection.ConnectionMapper();
      const connectionEntity = connectionMapper.mapConnectionFromJson(payload_connection);

      const conversation_mapper = new ConversationMapper();
      const [new_conversation] = conversation_mapper.mapConversations([payload_conversation]);
      new_conversation.connection(connectionEntity);

      expect(new_conversation.participating_user_ids().length).toBe(1);
      expect(new_conversation.participating_user_ids()[0]).toBe(connector_user_id);
    });
  });

  describe('notificationState', () => {
    it('returns expected values', () => {
      const NOTIFICATION_STATES = z.conversation.NotificationSetting.STATE;
      const conversationEntity = new Conversation(z.util.createRandomUuid());
      const selfUserEntity = new z.entity.User(z.util.createRandomUuid());

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);
      conversationEntity.selfUser(selfUserEntity);
      conversationEntity.mutedState(undefined);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState('true');

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState(true);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);
      conversationEntity.mutedState(false);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState(NOTIFICATION_STATES.NOTHING);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);
      conversationEntity.mutedState(NOTIFICATION_STATES.MENTIONS_AND_REPLIES);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);
      conversationEntity.mutedState(NOTIFICATION_STATES.EVERYTHING);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      selfUserEntity.inTeam(true);
      conversationEntity.mutedState(undefined);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState('true');

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState(true);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.MENTIONS_AND_REPLIES);
      conversationEntity.mutedState(false);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
      conversationEntity.mutedState(NOTIFICATION_STATES.NOTHING);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);
      conversationEntity.mutedState(NOTIFICATION_STATES.MENTIONS_AND_REPLIES);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.MENTIONS_AND_REPLIES);
      conversationEntity.mutedState(NOTIFICATION_STATES.EVERYTHING);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.EVERYTHING);
    });
  });
});
