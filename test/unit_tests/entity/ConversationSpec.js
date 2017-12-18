/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:entity/Conversation

'use strict';

describe('Conversation', () => {
  let conversation_et = null;
  let other_user = null;

  const self_user = new z.entity.User(entities.user.john_doe.id);
  self_user.is_me = true;

  const first_timestamp = new Date('2017-09-26T09:21:14.225Z').getTime();
  const second_timestamp = new Date('2017-09-26T10:27:18.837Z').getTime();

  beforeEach(() => {
    conversation_et = new z.entity.Conversation();
    other_user = new z.entity.User(entities.user.jane_roe.id);
  });

  describe('type checks', () => {
    beforeEach(() => (conversation_et = new z.entity.Conversation()));

    it('should return the expected value for personal conversations', () => {
      conversation_et.type(z.conversation.ConversationType.CONNECT);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeTruthy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeTruthy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.SELF);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeTruthy();

      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.is_group()).toBeTruthy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();
    });

    it('should return the expected value for team conversations', () => {
      conversation_et.team_id = z.util.create_random_uuid();

      conversation_et.type(z.conversation.ConversationType.CONNECT);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeTruthy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeTruthy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.type(z.conversation.ConversationType.SELF);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeTruthy();

      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.is_group()).toBeTruthy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.participating_user_ids.push(z.util.create_random_uuid());
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.is_group()).toBeFalsy();
      expect(conversation_et.is_one2one()).toBeTruthy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();

      conversation_et.participating_user_ids.push(z.util.create_random_uuid());
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.is_group()).toBeTruthy();
      expect(conversation_et.is_one2one()).toBeFalsy();
      expect(conversation_et.is_request()).toBeFalsy();
      expect(conversation_et.is_self()).toBeFalsy();
    });
  });

  describe('add message', () => {
    let initial_message_et = undefined;

    beforeEach(() => {
      initial_message_et = new z.entity.Message(z.util.create_random_uuid());
      initial_message_et.timestamp(first_timestamp);
      conversation_et.add_message(initial_message_et);
    });

    afterEach(() => conversation_et.remove_messages());

    it('should not add message with an exisiting id', () => {
      conversation_et.add_message(initial_message_et);
      expect(conversation_et.messages().length).toBe(1);
    });

    it('should add message with a newer timestamp', () => {
      const message_et = new z.entity.Message(z.util.create_random_uuid());
      message_et.timestamp(second_timestamp);

      conversation_et.add_message(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.get_last_message();
      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(second_timestamp);
    });

    it('should add message with an older timestamp', () => {
      const older_timestamp = first_timestamp - 100;
      const message_et = new z.entity.Message(z.util.create_random_uuid());
      message_et.timestamp(older_timestamp);

      conversation_et.add_message(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.get_first_message();
      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(older_timestamp);
    });

    describe('affects last_event_timestamp', () => {
      it('and adding a message should update it', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(second_timestamp);
      });

      it('and adding a message should not update it if affect_order is false', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
        message_et.timestamp(second_timestamp);
        message_et.affect_order(false);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });

      it('and adding a message should not update it if timestamp is greater than the last server timestamp', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });
    });

    describe('affects last_read_timestamp', () => {
      it('and adding a message should update it if sent by self user', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
        message_et.timestamp(second_timestamp);
        message_et.user(self_user);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(second_timestamp);
      });

      it('should not update last read if last message was not send from self user', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.add_message(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });

      it('should not update last read if timestamp is greater than the last server timestamp', () => {
        const message_et = new z.entity.Message(z.util.create_random_uuid());
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

    const message1 = new z.entity.Message();
    message1.id = z.util.create_random_uuid();
    message1.timestamp(reference_timestamp - 10000);
    message1.user(self_user);

    const message2 = new z.entity.Message();
    message2.id = z.util.create_random_uuid();
    message2.timestamp(reference_timestamp - 5000);

    it('adds multiple messages', () => {
      const message_ets = [message1, message2];
      conversation_et.add_messages(message_ets);

      expect(conversation_et.messages_unordered().length).toBe(2);
    });
  });

  describe('get_last_delivered_message', () => {
    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.get_last_delivered_message()).not.toBeDefined();
    });

    it('returns last delivered message', () => {
      const sent_message_et = new z.entity.ContentMessage();
      sent_message_et.id = z.util.create_random_uuid();
      sent_message_et.status(z.message.StatusType.SENT);
      conversation_et.add_message(sent_message_et);
      expect(conversation_et.get_last_delivered_message()).not.toBeDefined();

      const delivered_message_et = new z.entity.ContentMessage();
      delivered_message_et.id = z.util.create_random_uuid();
      delivered_message_et.status(z.message.StatusType.DELIVERED);
      conversation_et.add_message(delivered_message_et);
      expect(conversation_et.get_last_delivered_message()).toBe(delivered_message_et);

      const next_sent_message_et = new z.entity.ContentMessage();
      next_sent_message_et.id = z.util.create_random_uuid();
      next_sent_message_et.status(z.message.StatusType.SENT);
      conversation_et.add_message(next_sent_message_et);
      expect(conversation_et.get_last_delivered_message()).toBe(delivered_message_et);

      const next_delivered_message_et = new z.entity.ContentMessage();
      next_delivered_message_et.id = z.util.create_random_uuid();
      next_delivered_message_et.status(z.message.StatusType.DELIVERED);
      conversation_et.add_message(next_delivered_message_et);
      expect(conversation_et.get_last_delivered_message()).toBe(next_delivered_message_et);
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
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', () => {
      const message_et = new z.entity.PingMessage();
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is text and not send by self user', () => {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const ping_message_et = new z.entity.PingMessage();
      ping_message_et.id = z.util.create_random_uuid();
      ping_message_et.user(new z.entity.User());
      conversation_et.add_message(ping_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(message_et.id);
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const next_message_et = new z.entity.ContentMessage();
      next_message_et.add_asset(new z.entity.Text());
      next_message_et.id = z.util.create_random_uuid();
      next_message_et.user(self_user_et);
      conversation_et.add_message(next_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(next_message_et.id);
    });

    it('returns message if last message is text and ephemeral', () => {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);

      const ephemeral_message_et = new z.entity.ContentMessage();
      ephemeral_message_et.add_asset(new z.entity.Text());
      ephemeral_message_et.id = z.util.create_random_uuid();
      ephemeral_message_et.user(self_user_et);
      ephemeral_message_et.ephemeral_expires(true);
      conversation_et.add_message(ephemeral_message_et);

      expect(conversation_et.get_last_editable_message()).toBeDefined();
      expect(conversation_et.get_last_editable_message().id).toBe(message_et.id);
    });
  });

  describe('get_next_iso_date', () => {
    it('should return an expected ISO string', () => {
      const reference_date = new Date(Date.now() - 1);
      const reference_iso_date = reference_date.toISOString();

      expect(conversation_et.get_next_iso_date()).toBeGreaterThan(reference_iso_date);
      expect(conversation_et.get_next_iso_date(1000)).toBeLessThan(reference_iso_date);
      expect(conversation_et.get_next_iso_date(-1000)).toBeGreaterThan(
        new Date(reference_date.getTime() + 1000).toISOString()
      );
      expect(conversation_et.get_next_iso_date('foo')).toBeGreaterThan(reference_iso_date);

      const last_server_timestamp = Date.now() + 10000;
      conversation_et.last_server_timestamp(last_server_timestamp);
      const expected_iso_date = new Date(last_server_timestamp + 1).toISOString();

      expect(conversation_et.get_next_iso_date()).toEqual(expected_iso_date);
      expect(conversation_et.get_next_iso_date(1000)).toEqual(expected_iso_date);
      expect(conversation_et.get_next_iso_date(-1000)).toEqual(expected_iso_date);
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
      const third_user = new z.entity.User(z.util.create_random_uuid());
      third_user.name('Brad Delson');
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.participating_user_ets.push(third_user);
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      const expected_display_name = `${conversation_et
        .participating_user_ets()[0]
        .first_name()}, ${conversation_et.participating_user_ets()[1].first_name()}`;
      expect(conversation_et.display_name()).toBe(expected_display_name);
    });

    it('displays "Empty Conversation" if no other participants are in the conversation', () => {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.display_name()).toBe(z.string.conversations_empty_conversation);
    });

    it('displays a fallback if no user name has been set for a group conversation', () => {
      const user = new z.entity.User(z.util.create_random_uuid());
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.participating_user_ids.push(other_user.id);
      conversation_et.participating_user_ids.push(user.id);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays the conversation name for a self conversation', () => {
      conversation_et.type(z.conversation.ConversationType.SELF);
      expect(conversation_et.display_name()).toBe('…');

      const conversation_name = 'My favorite music band';
      conversation_et.name(conversation_name);
      expect(conversation_et.display_name()).toBe(conversation_name);
    });
  });

  describe('getNumberOfClients', () => {
    it('should return the number of all known clients  (including own clients)', () => {
      const first_client = new z.client.Client();
      first_client.id = '5021d77752286cac';

      const second_client = new z.client.Client();
      second_client.id = '575b7a890cdb7635';

      const third_client = new z.client.Client();
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
      const verified_client_et = new z.client.Client();
      verified_client_et.meta.is_verified(true);

      const self_user_et = new z.entity.User();
      self_user_et.is_me = true;
      conversation_et.self = self_user_et;

      const user_et = new z.entity.User();
      user_et.devices.push(verified_client_et);
      conversation_et.participating_user_ets.push(user_et);

      expect(conversation_et.is_verified()).toBeTruthy();
    });

    it('is not verified when participant has unverified device', () => {
      const unverified_client_et = new z.client.Client();
      const verified_client_et = new z.client.Client();
      verified_client_et.meta.is_verified(true);

      const self_user_et = new z.entity.User();
      self_user_et.is_me = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.self = self_user_et;

      const user_et = new z.entity.User();
      user_et.devices.push(unverified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new z.entity.User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when all users are verified', () => {
      const verified_client_et = new z.client.Client();
      verified_client_et.meta.is_verified(true);

      const self_user_et = new z.entity.User();
      self_user_et.is_me = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.self = self_user_et;

      const user_et = new z.entity.User();
      user_et.devices.push(verified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new z.entity.User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeTruthy();
    });
  });

  describe('is_with_bot', () =>
    it('detects bot conversations by the username of the remote participant', () => {
      const user_et = new z.entity.User(z.util.create_random_uuid());

      conversation_et = new z.entity.Conversation(z.util.create_random_uuid());
      conversation_et.participating_user_ets.push(user_et);

      user_et.username('ottothebot');
      conversation_et.type(z.conversation.ConversationType.SELF);
      expect(conversation_et.is_with_bot()).toBe(false);

      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      expect(conversation_et.is_with_bot()).toBe(true);

      user_et.username('annathebot');
      expect(conversation_et.is_with_bot()).toBe(true);

      user_et.username(undefined);
      expect(conversation_et.is_with_bot()).toBe(false);

      user_et.username('');
      expect(conversation_et.is_with_bot()).toBe(false);

      user_et.username('bob');
      expect(conversation_et.is_with_bot()).toBe(false);

      user_et.username('bobthebot');
      expect(conversation_et.is_with_bot()).toBe(false);

      user_et.username('bot');
      expect(conversation_et.is_with_bot()).toBe(false);

      user_et.username('wire');
      expect(conversation_et.is_with_bot()).toBe(false);
    }));

  describe('messages_visible', () => {
    it('should return no messages if conversation ID is empty', () => {
      expect(conversation_et.id).toBe('');
      expect(conversation_et.messages_visible().length).toBe(0);
    });

    it('creates a creation message and returns visible messages', () => {
      conversation_et.self = self_user;
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.id = z.util.create_random_uuid();
      conversation_et.has_further_messages(false);

      expect(conversation_et.messages_visible().length).toBe(1);
      expect(conversation_et.messages_visible()[0].super_type).toBe(z.message.SuperType.MEMBER);

      const member_message = new z.entity.MemberMessage();
      member_message.super_type = z.message.SuperType.MEMBER;

      conversation_et.add_message(member_message);

      expect(conversation_et.messages_visible().length).toBe(2);
      expect(conversation_et.messages_visible()[0].super_type).toBe(z.message.SuperType.MEMBER);
    });

    it('returns visible unmerged pings', () => {
      const timestamp = Date.now();
      conversation_et.id = z.util.create_random_uuid();

      const ping_message_1 = new z.entity.PingMessage();
      ping_message_1.timestamp(timestamp - 4000);
      ping_message_1.id = z.util.create_random_uuid();

      const ping_message_2 = new z.entity.PingMessage();
      ping_message_2.timestamp(timestamp - 2000);
      ping_message_2.id = z.util.create_random_uuid();

      const ping_message_3 = new z.entity.PingMessage();
      ping_message_3.timestamp(timestamp);
      ping_message_3.id = z.util.create_random_uuid();

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
      const message_et = new z.entity.Message(z.util.create_random_uuid());
      message_et.timestamp(second_timestamp);
      conversation_et.add_message(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unread_event_count()).toBe(1);

      conversation_et.release();

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unread_event_count()).toBe(1);
    });

    it('should release messages if conversation has no unread messages', () => {
      const message_et = new z.entity.Message(z.util.create_random_uuid());
      message_et.timestamp(first_timestamp);
      conversation_et.add_message(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unread_event_count()).toBe(0);

      conversation_et.release();

      expect(conversation_et.has_further_messages()).toBeTruthy();
      expect(conversation_et.is_loaded()).toBeFalsy();
      expect(conversation_et.messages().length).toBe(0);
      expect(conversation_et.unread_event_count()).toBe(0);
    });
  });

  describe('remove_message_by_id', () => {
    let message_id = undefined;

    beforeEach(() => {
      const message_et = new z.entity.Message(z.util.create_random_uuid());
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
      const duplicated_message_et = new z.entity.Message(message_id);

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
      const first_message_et = new z.entity.Message(z.util.create_random_uuid());
      first_message_et.timestamp(first_timestamp);
      conversation_et.add_message(first_message_et);

      message_et = new z.entity.Message(z.util.create_random_uuid());
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

  describe('set_timestamp', () =>
    it('turns strings into numbers', () => {
      const lrt = conversation_et.last_read_timestamp();
      expect(lrt).toBe(0);
      const new_lrt_string = '1480338525243';
      const new_lrt_number = window.parseInt(new_lrt_string, 10);
      conversation_et.set_timestamp(new_lrt_string, z.conversation.TIMESTAMP_TYPE.LAST_READ);
      expect(conversation_et.last_read_timestamp()).toBe(new_lrt_number);
    }));

  describe('should_unarchive', () => {
    let time = undefined;

    beforeEach(() => {
      time = Date.now();
      conversation_et.archived_timestamp(time);
      conversation_et.archived_state(true);
      conversation_et.muted_state(true);
    });

    it('returns expected bool whether a conversation should be unarchived', () => {
      conversation_et.last_event_timestamp(time - 100);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time + 100);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.muted_state(false);
      conversation_et.last_event_timestamp(time - 100);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time + 100);
      expect(conversation_et.should_unarchive()).toBeTruthy();

      conversation_et.archived_state(false);
      conversation_et.last_event_timestamp(time - 100);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time);
      expect(conversation_et.should_unarchive()).toBeFalsy();

      conversation_et.last_event_timestamp(time + 100);
      expect(conversation_et.should_unarchive()).toBeFalsy();
    });
  });

  describe('_creation_message', () => {
    beforeEach(() => {
      conversation_et.self = self_user;
      conversation_et.participating_user_ets.push(other_user);
    });

    it('can create a message for an outgoing connection request', () => {
      conversation_et.type(z.conversation.ConversationType.CONNECT);
      other_user.connection().status(z.user.ConnectionStatus.SENT);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONNECTION_REQUEST);
    });

    it('can create a message for an accepted connection request', () => {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONNECTION_ACCEPTED);
    });

    it('can create a message for a group the user started', () => {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = self_user.id;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_CREATE);
      expect(creation_message.user().id).toBe(self_user.id);
    });

    it('can create a message for a group another user started', () => {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = other_user.id;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_CREATE);
      expect(creation_message.user().id).toBe(other_user.id);
    });

    it('can create a message for a group a user started that is no longer part of the group', () => {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = z.util.create_random_uuid;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_RESUME);
      expect(creation_message.user().id).toBe('');
    });

    it('returns undefined if there are no participating users', () => {
      conversation_et.participating_user_ets([]);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeUndefined();
    });
  });

  describe('_increment_time_only', () => {
    it('should update only to newer timestamps', () => {
      expect(conversation_et._increment_time_only(first_timestamp, second_timestamp)).toBe(second_timestamp);
      expect(conversation_et._increment_time_only(second_timestamp, first_timestamp)).toBeFalsy();
      expect(conversation_et._increment_time_only(first_timestamp, first_timestamp)).toBeFalsy();
    });
  });

  describe('subscribe_to_state_updates', () =>
    it('creates subscribers to state updates', () => {
      conversation_et.subscribe_to_state_updates();
      conversation_et.archived_state(false);
      conversation_et.cleared_timestamp(0);
      conversation_et.last_event_timestamp(1467650148305);
      conversation_et.last_read_timestamp(1467650148305);
      conversation_et.muted_state(false);

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

      const user_connection_mapper = new z.user.UserConnectionMapper();
      const connection_et = user_connection_mapper.map_user_connection_from_json(payload_connection);

      const conversation_mapper = new z.conversation.ConversationMapper();
      const new_conversation = conversation_mapper._create_conversation_et(payload_conversation);
      new_conversation.connection(connection_et);

      expect(new_conversation.participating_user_ids().length).toBe(1);
      expect(new_conversation.participating_user_ids()[0]).toBe(connector_user_id);
    });
  });
});
