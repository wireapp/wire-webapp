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

describe('Conversation', function() {
  let conversation_et = null;
  let other_user = null;

  const self_user = new z.entity.User(entities.user.john_doe.id);
  self_user.is_me = true;

  beforeEach(function() {
    conversation_et = new z.entity.Conversation();
    other_user = new z.entity.User(entities.user.jane_roe.id);
  });

  describe('Conversation type checks', function() {
    beforeEach(function() {
      conversation_et = new z.entity.Conversation();
    });

    it('should return the expected value for personal conversations', function() {
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

    it('should return the expected value for team conversations', function() {
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

  describe('timestamp', function() {
    it('adding a message should update the conversation timestamp', function() {
      const message_et = new z.entity.Message();
      message_et.timestamp(new Date('2014-12-15T09:21:14.225Z').getTime());
      conversation_et.last_event_timestamp(new Date('2014-12-14T09:21:14.225Z').getTime());
      conversation_et.add_message(message_et);
      expect(conversation_et.last_event_timestamp()).toBe(message_et.timestamp());
    });

    it('adding a message should not update the conversation timestamp if should_effect_conversation_timestamp is false', function() {
      const message_et = new z.entity.Message();
      message_et.timestamp(new Date('2014-12-15T09:21:14.225Z').getTime());
      conversation_et.add_message(message_et);

      const message_two_et = new z.entity.Message();
      message_two_et.timestamp(new Date('2014-12-16T09:21:14.225Z').getTime());
      message_two_et.should_effect_conversation_timestamp = false;
      conversation_et.add_message(message_two_et);
      expect(conversation_et.last_event_timestamp()).toBe(message_et.timestamp());
    });
  });

  describe('_increment_time_only', function() {
    const first_date = new Date('2014-12-15T09:21:14.225Z').getTime();
    const second_date = new Date('2014-12-15T09:22:14.225Z').getTime();

    it('should update with newer timestamp', function() {
      expect(conversation_et._increment_time_only(first_date, second_date)).toBe(second_date);
    });

    it('should not update with older timestamp', function() {
      expect(conversation_et._increment_time_only(second_date, first_date)).toBeFalsy();
    });

    // TODO: Flaky test
    xit('should not update with same timestamp', function() {
      expect(conversation_et._increment_time_only(first_date, first_date)).toBeFalsy();
    });
  });

  describe('is_archived', function() {
    const first_date = new Date('2014-12-15T09:21:14.225Z').getTime();
    const second_date = new Date('2014-12-15T09:22:14.225Z').getTime();

    it('is not archived when nothing is set', function() {
      expect(conversation_et.is_archived()).toBeFalsy();
    });

    it('is archived when archived event is last event', function() {
      conversation_et.archived_state(true);
      conversation_et.archived_timestamp(first_date);
      conversation_et.last_event_timestamp(first_date);
      expect(conversation_et.is_archived()).toBeTruthy();
    });

    it('is not archived when archived event is older then last event', function() {
      conversation_et.archived_state(true);
      conversation_et.archived_timestamp(first_date);
      conversation_et.last_event_timestamp(second_date);
      expect(conversation_et.is_archived()).toBeFalsy();
    });

    // TODO: test is flaky
    xit('is archived when archived event is older then last event but its muted', function() {
      conversation_et.archived_state(true);
      conversation_et.archived_timestamp(first_date);
      conversation_et.last_event_timestamp(second_date);
      conversation_et.muted_timestamp(first_date);
      conversation_et.muted_state(true);
      expect(conversation_et.is_muted()).toBeTruthy();
      expect(conversation_et.is_archived()).toBeTruthy();
    });
  });

  describe('is_verified', function() {
    it('is not verified when nothing is set', function() {
      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when self user has no remote clients', function() {
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

    it('is not verified when participant has unverified device', function() {
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

    it('is verified when all users are verified', function() {
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

  describe('display_name', function() {
    it('displays a name if the conversation is a 1:1 conversation or a connection request', function() {
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());

      conversation_et.type(z.conversation.ConversationType.CONNECT);
      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());
    });

    it('displays a fallback if no user name has been set', function() {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      expect(conversation_et.display_name()).toBe('…');

      conversation_et.type(z.conversation.ConversationType.CONNECT);
      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays a group conversation name with names from the participants', function() {
      const third_user = new z.entity.User(z.util.create_random_uuid());
      third_user.name('Brad Delson');
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.participating_user_ets.push(third_user);
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      const expected_display_name = `${conversation_et.participating_user_ets()[0].first_name()}, ${conversation_et.participating_user_ets()[1].first_name()}`;
      expect(conversation_et.display_name()).toBe(expected_display_name);
    });

    it('displays "Empty Conversation" if no other participants are in the conversation', function() {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      expect(conversation_et.display_name()).toBe(z.string.conversations_empty_conversation);
    });

    it('displays a fallback if no user name has been set for a group conversation', function() {
      const user = new z.entity.User(z.util.create_random_uuid());
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.participating_user_ids.push(other_user.id);
      conversation_et.participating_user_ids.push(user.id);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays the conversation name for a self conversation', function() {
      conversation_et.type(z.conversation.ConversationType.SELF);
      expect(conversation_et.display_name()).toBe('…');

      const conversation_name = 'My favorite music band';
      conversation_et.name(conversation_name);
      expect(conversation_et.display_name()).toBe(conversation_name);
    });
  });

  describe('_subscribe_to_states_updates', () =>
    it('creates subscribers to state updates', function() {
      spyOn(conversation_et, '_subscribe_to_states_updates').and.callThrough();

      conversation_et._subscribe_to_states_updates();
      conversation_et.archived_state(false);
      conversation_et.cleared_timestamp(0);
      conversation_et.last_event_timestamp(1467650148305);
      conversation_et.last_read_timestamp(1467650148305);
      conversation_et.muted_state(false);

      expect(conversation_et._subscribe_to_states_updates.calls.count()).toEqual(1);
    })
  );

  describe('message sorting', function() {
    const reference_timestamp = Date.now();

    beforeEach(function() {
      const message = new z.entity.Message();
      message.timestamp(reference_timestamp);
      conversation_et.add_message(message);
    });

    it('can add message with a newer timestamp', function() {
      const message_id = z.util.create_random_uuid();
      const message = new z.entity.Message();
      message.id = message_id;
      message.timestamp(Date.now());
      conversation_et.add_message(message);
      expect(conversation_et.messages().length).toBe(2);
      expect(conversation_et.get_last_message().id).toBe(message_id);
    });
  });

  describe('add_messages', function() {
    const reference_timestamp = Date.now();

    const message1 = new z.entity.Message();
    message1.id = z.util.create_random_uuid();
    message1.timestamp(reference_timestamp - 10000);
    message1.user(self_user);

    const message2 = new z.entity.Message();
    message2.id = z.util.create_random_uuid();
    message2.timestamp(reference_timestamp - 5000);

    it('adds many messages', function() {
      const message_ets = [message1, message2];
      conversation_et.add_messages(message_ets);

      expect(conversation_et.messages_unordered().length).toBe(2);
    });

    it('detects duplicate messages', function() {
      const content = z.message.SuperType.CONTENT;
      const asset_meta = z.event.Client.CONVERSATION.ASSET_META;

      message1.super_type = content;
      message1.type = asset_meta;

      message2.super_type = content;
      message2.type = asset_meta;
      const message_ets = [message1, message2];
      conversation_et.add_messages(message_ets);

      expect(message2.visible()).toBe(false);
      expect(message1.visible()).toBe(true);
    });
  });

  describe('message deletion', function() {
    let message_et = null;

    beforeEach(function() {
      message_et = new z.entity.Message();
      message_et.id = z.util.create_random_uuid();
      conversation_et.add_message(message_et);
    });

    afterEach(function() {
      conversation_et.remove_messages();
    });

    it('should remove message by id', function() {
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.remove_message_by_id(message_et.id);
      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all message with the same id', function() {
      const duplicated_message_et = new z.entity.Message();
      duplicated_message_et.id = message_et.id;
      conversation_et.add_message(duplicated_message_et);

      expect(conversation_et.messages().length).toBe(2);
      conversation_et.remove_message_by_id(message_et.id);
      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove message by message entity', function() {
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.remove_message(message_et);
      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all messages', function() {
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.remove_messages();
      expect(conversation_et.messages().length).toBe(0);
    });
  });

  describe('_creation_message', function() {
    beforeEach(function() {
      conversation_et.self = self_user;
      conversation_et.participating_user_ets.push(other_user);
    });

    it('can create a message for an outgoing connection request', function() {
      conversation_et.type(z.conversation.ConversationType.CONNECT);
      other_user.connection().status(z.user.ConnectionStatus.SENT);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONNECTION_REQUEST);
    });

    it('can create a message for an accepted connection request', function() {
      conversation_et.type(z.conversation.ConversationType.ONE2ONE);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONNECTION_ACCEPTED);
    });

    it('can create a message for a group the user started', function() {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = self_user.id;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_CREATE);
      expect(creation_message.user().id).toBe(self_user.id);
    });

    it('can create a message for a group another user started', function() {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = other_user.id;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_CREATE);
      expect(creation_message.user().id).toBe(other_user.id);
    });

    it('can create a message for a group a user started that is no longer part of the group', function() {
      conversation_et.type(z.conversation.ConversationType.REGULAR);
      conversation_et.creator = z.util.create_random_uuid;
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeDefined();
      expect(creation_message.member_message_type).toBe(z.message.SystemMessageType.CONVERSATION_RESUME);
      expect(creation_message.user().id).toBe('');
    });

    it('returns undefined if there are no participating users', function() {
      conversation_et.participating_user_ets([]);
      const creation_message = conversation_et._creation_message();
      expect(creation_message).toBeUndefined();
    });
  });

  describe('messages_visible', function() {
    it('returns no messages if conversation ID is empty', function() {
      expect(conversation_et.id).toBe('');
      expect(conversation_et.messages_visible().length).toBe(0);
    });

    it('creates a creation message and returns visible messages', function() {
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

    it('returns visible unmerged pings', function() {
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

  describe('last read', function() {
    it('should update last read if last message was send from self user', function() {
      const last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime();
      const last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime();

      conversation_et.last_read_timestamp(last_read_timestamp);

      const message_et = new z.entity.Message();
      message_et.user(self_user);
      message_et.timestamp(last_message_timestamp);
      message_et.id = z.util.create_random_uuid();

      expect(conversation_et.last_read_timestamp()).toBe(last_read_timestamp);
      conversation_et.add_message(message_et);
      expect(conversation_et.last_read_timestamp()).toBe(last_message_timestamp);
    });

    it('should not update last read if last message was not send from self user', function() {
      const last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime();
      const last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime();

      conversation_et.last_read_timestamp(last_read_timestamp);

      const message_et = new z.entity.Message();
      message_et.timestamp(last_message_timestamp);
      message_et.id = z.util.create_random_uuid();

      expect(conversation_et.last_read_timestamp()).toBe(last_read_timestamp);
      conversation_et.add_message(message_et);
      expect(conversation_et.last_read_timestamp()).toBe(last_read_timestamp);
    });
  });

  describe('release', function() {
    it('should not release messages if conversation has unread messages', function() {
      const last_read_timestamp = new Date('December 24, 2000 18:00:00').getTime();
      const last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime();

      conversation_et.last_read_timestamp(last_read_timestamp);

      const message_et = new z.entity.PingMessage();
      message_et.timestamp(last_message_timestamp);
      message_et.id = z.util.create_random_uuid();
      conversation_et.add_message(message_et);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unread_event_count()).toBe(1);
      conversation_et.release();
      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unread_event_count()).toBe(1);
    });

    it('should release messages if conversation has no unread messages', function() {
      const last_message_timestamp = new Date('December 24, 2000 18:01:00').getTime();

      const message_et = new z.entity.Message();
      message_et.timestamp(last_message_timestamp);
      message_et.id = z.util.create_random_uuid();
      conversation_et.add_message(message_et);

      conversation_et.last_read_timestamp(last_message_timestamp);

      expect(conversation_et.unread_event_count()).toBe(0);
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.release();
      expect(conversation_et.messages().length).toBe(0);
      expect(conversation_et.is_loaded()).toBeFalsy();
      expect(conversation_et.has_further_messages()).toBeTruthy();
    });
  });

  describe('_check_for_duplicate_nonce', () =>
    it('should hide newer duplicated audio asset', function() {
      const older_timestamp = new Date('December 24, 2000 18:00:00').getTime();
      const newer_timestamp = new Date('December 24, 2000 18:01:00').getTime();

      const asset_et = new z.entity.File(z.util.create_random_uuid());
      asset_et.file_size = 'audio/mp4';

      const older_message_et = new z.entity.ContentMessage();
      older_message_et.timestamp(older_timestamp);
      older_message_et.id = z.util.create_random_uuid();
      older_message_et.nonce = z.util.create_random_uuid();
      older_message_et.type = z.event.Client.CONVERSATION.ASSET_META;
      older_message_et.add_asset(asset_et);

      const newer_message_et = new z.entity.ContentMessage();
      newer_message_et.timestamp(newer_timestamp);
      newer_message_et.id = older_message_et.id;
      newer_message_et.nonce = older_message_et.nonce;
      newer_message_et.type = z.event.Client.CONVERSATION.ASSET_META;
      newer_message_et.add_asset(asset_et);

      conversation_et._check_for_duplicate_nonce(older_message_et, newer_message_et);

      expect(older_message_et.visible()).toBeTruthy();
      expect(newer_message_et.visible()).toBeFalsy();
    })
  );

  describe('is_with_bot', () =>
    it('detects bot conversations by the username of the remote participant', function() {
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
    })
  );

  describe('get_last_editable_message', function() {
    let self_user_et = undefined;

    beforeEach(function() {
      self_user_et = new z.entity.User();
      self_user_et.is_me = true;
    });

    afterEach(function() {
      conversation_et.remove_messages();
    });

    it('returns undefined if conversation has no messages', function() {
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', function() {
      const message_et = new z.entity.PingMessage();
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', function() {
      const message_et = new z.entity.PingMessage();
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns undefined if last message is text and not send by self user', function() {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(new z.entity.User());
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).not.toBeDefined();
    });

    it('returns message if last message is text and send by self user', function() {
      const message_et = new z.entity.ContentMessage();
      message_et.add_asset(new z.entity.Text());
      message_et.id = z.util.create_random_uuid();
      message_et.user(self_user_et);
      conversation_et.add_message(message_et);
      expect(conversation_et.get_last_editable_message()).toBeDefined();
    });

    it('returns message if last message is text and send by self user', function() {
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

    it('returns message if last message is text and send by self user', function() {
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

    it('returns message if last message is text and ephemeral', function() {
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

  describe('get_last_delivered_message', function() {
    it('returns undefined if conversation has no messages', function() {
      expect(conversation_et.get_last_delivered_message()).not.toBeDefined();
    });

    it('returns last delivered message', function() {
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

  describe('set_timestamp', () =>
    it('turns strings into numbers', function() {
      const lrt = conversation_et.last_read_timestamp();
      expect(lrt).toBe(0);
      const new_lrt_string = '1480338525243';
      const new_lrt_number = window.parseInt(new_lrt_string, 10);
      conversation_et.set_timestamp(new_lrt_string, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP);
      expect(conversation_et.last_read_timestamp()).toBe(new_lrt_number);
    })
  );

  describe('connection', function() {
    it('updates the participating user IDs with the user ID of the other party', function() {
      const connector_user_id = 'b43b376d-7b5a-4d77-89be-81a02892db8c';

      // @formatter:off
      /* eslint-disable comma-spacing, key-spacing, sort-keys, quotes */
      const payload_connection = {"status":"sent","conversation":"15a7f358-8eba-4b8e-bcf2-61a08eb53349","to":`${connector_user_id}`,"from":"616cbbeb-1360-4e17-b333-e000662257bd","last_update":"2017-05-10T11:34:18.396Z","message":" "};
      const payload_conversation = {"access":["private"],"creator":"616cbbeb-1360-4e17-b333-e000662257bd","members":{"self":{"hidden_ref":null,"status":0,"last_read":"1.800122000a73cb62","muted_time":null,"service":null,"otr_muted_ref":null,"muted":null,"status_time":"2017-05-10T11:34:18.376Z","hidden":false,"status_ref":"0.0","id":"616cbbeb-1360-4e17-b333-e000662257bd","otr_archived":false,"cleared":null,"otr_muted":false,"otr_archived_ref":null,"archived":null},"others":[]},"name":"Marco","id":"15a7f358-8eba-4b8e-bcf2-61a08eb53349","type":3,"last_event_time":"2017-05-10T11:34:18.376Z","last_event":"2.800122000a73cb63"};
      /* eslint-enable comma-spacing, key-spacing, sort-keys, quotes */
      // @formatter:on

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
