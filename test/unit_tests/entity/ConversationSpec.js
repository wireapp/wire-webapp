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

import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';

import 'src/script/localization/Localizer';
import {createRandomUuid} from 'Util/util';
import {CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation/';

import {Conversation} from 'src/script/entity/Conversation';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {CallMessage} from 'src/script/entity/message/CallMessage';
import {Message} from 'src/script/entity/message/Message';
import {PingMessage} from 'src/script/entity/message/PingMessage';
import {User} from 'src/script/entity/User';
import {Text} from 'src/script/entity/message/Text';
import {MemberMessage} from 'src/script/entity/message/MemberMessage';

import {ConversationMapper} from 'src/script/conversation/ConversationMapper';
import {NOTIFICATION_STATE} from 'src/script/conversation/NotificationSetting';

import {StatusType} from 'src/script/message/StatusType';
import {CALL_MESSAGE_TYPE} from 'src/script/message/CallMessageType';

import {ConnectionMapper} from 'src/script/connection/ConnectionMapper';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {MentionEntity} from 'src/script/message/MentionEntity';

describe('Conversation', () => {
  let conversation_et = null;
  let other_user = null;

  const self_user = new User(window.entities.user.john_doe.id);
  self_user.isMe = true;

  const first_timestamp = new Date('2017-09-26T09:21:14.225Z').getTime();
  const second_timestamp = new Date('2017-09-26T10:27:18.837Z').getTime();

  beforeEach(() => {
    conversation_et = new Conversation();
    other_user = new User(window.entities.user.jane_roe.id);
  });

  describe('type checks', () => {
    beforeEach(() => (conversation_et = new Conversation()));

    it('should return the expected value for personal conversations', () => {
      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeTruthy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(CONVERSATION_TYPE.SELF);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeTruthy();

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();
    });

    it('should return the expected value for team conversations', () => {
      conversation_et.team_id = createRandomUuid();

      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeTruthy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.type(CONVERSATION_TYPE.SELF);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeTruthy();

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.participating_user_ids.push(createRandomUuid());
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.participating_user_ids.push(createRandomUuid());
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();
    });
  });

  describe('add message', () => {
    let initial_message_et = undefined;

    beforeEach(() => {
      initial_message_et = new Message(createRandomUuid());
      initial_message_et.timestamp(first_timestamp);
      conversation_et.addMessage(initial_message_et);
    });

    afterEach(() => conversation_et.removeMessages());

    it('should not add message with an exisiting id', () => {
      conversation_et.addMessage(initial_message_et);

      expect(conversation_et.messages().length).toBe(1);
    });

    it('does not add new message if it already exists in the message list', () => {
      const initialLength = conversation_et.messages().length;
      const newMessageEntity = new Message(createRandomUuid());
      newMessageEntity.id = initial_message_et.id;

      conversation_et.addMessage(newMessageEntity, true);

      expect(conversation_et.messages().length).toBe(initialLength);
      expect(conversation_et.messages().some(message => message == newMessageEntity)).toBe(false);
    });

    it('should add message with a newer timestamp', () => {
      const message_et = new Message(createRandomUuid());
      message_et.timestamp(second_timestamp);

      conversation_et.addMessage(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getLastMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(second_timestamp);
    });

    it('should add message with an older timestamp', () => {
      const older_timestamp = first_timestamp - 100;
      const message_et = new Message(createRandomUuid());
      message_et.timestamp(older_timestamp);

      conversation_et.addMessage(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getFirstMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(older_timestamp);
    });

    describe('affects last_event_timestamp', () => {
      it('and adding a message should update it', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(second_timestamp);
      });

      it('and adding a message should not update it if affect_order is false', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);
        message_et.affect_order(false);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });

      it('and adding a message should not update it if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });
    });

    describe('affects last_read_timestamp', () => {
      it('and adding a message should update it if sent by self user', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);
        message_et.user(self_user);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(second_timestamp);
      });

      it('should not update last read if last message was not send from self user', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });

      it('should not update last read if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(createRandomUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });
    });
  });

  describe('addMessages', () => {
    const reference_timestamp = Date.now();

    const message1 = new Message();
    message1.id = createRandomUuid();
    message1.timestamp(reference_timestamp - 10000);
    message1.user(self_user);

    const message2 = new Message();
    message2.id = createRandomUuid();
    message2.timestamp(reference_timestamp - 5000);

    it('adds multiple messages', () => {
      const message_ets = [message1, message2];
      conversation_et.addMessages(message_ets);

      expect(conversation_et.messages_unordered().length).toBe(2);
    });
  });

  describe('getLastDeliveredMessage', () => {
    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.getLastDeliveredMessage()).not.toBeDefined();
    });

    it('returns last delivered message', () => {
      const remoteUserEntity = new User(createRandomUuid());
      const selfUserEntity = new User(createRandomUuid());
      selfUserEntity.isMe = true;

      const sentMessageEntity = new ContentMessage(createRandomUuid());
      sentMessageEntity.user(selfUserEntity);
      sentMessageEntity.status(StatusType.SENT);
      conversation_et.addMessage(sentMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).not.toBeDefined();

      const deliveredMessageEntity = new ContentMessage(createRandomUuid());
      deliveredMessageEntity.user(selfUserEntity);
      deliveredMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(deliveredMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextSentMessageEntity = new ContentMessage(createRandomUuid());
      nextSentMessageEntity.user(selfUserEntity);
      nextSentMessageEntity.status(StatusType.SENT);
      conversation_et.addMessage(nextSentMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextDeliveredMessageEntity = new ContentMessage(createRandomUuid());
      nextDeliveredMessageEntity.user(selfUserEntity);
      nextDeliveredMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(nextDeliveredMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(nextDeliveredMessageEntity);

      const remoteMessageEntity = new ContentMessage(createRandomUuid());
      remoteMessageEntity.user(remoteUserEntity);
      remoteMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(remoteMessageEntity);

      expect(conversation_et.getLastDeliveredMessage()).toBe(nextDeliveredMessageEntity);
    });
  });

  describe('getLastEditableMessage', () => {
    let self_user_et = undefined;

    beforeEach(() => {
      self_user_et = new User();
      self_user_et.isMe = true;
    });

    afterEach(() => conversation_et.removeMessages());

    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', () => {
      const message_et = new PingMessage();
      message_et.id = createRandomUuid();
      message_et.user(new User());
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and is added by self user', () => {
      const message_et = new PingMessage();
      message_et.id = createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is text and not send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createRandomUuid();
      message_et.user(new User());
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
    });

    it('returns last text message if last message is not text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const ping_message_et = new PingMessage();
      ping_message_et.id = createRandomUuid();
      ping_message_et.user(new User());
      conversation_et.addMessage(ping_message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
      expect(conversation_et.getLastEditableMessage().id).toBe(message_et.id);
    });

    it('returns last message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const next_message_et = new ContentMessage();
      next_message_et.addAsset(new Text());
      next_message_et.id = createRandomUuid();
      next_message_et.user(self_user_et);
      conversation_et.addMessage(next_message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
      expect(conversation_et.getLastEditableMessage().id).toBe(next_message_et.id);
    });

    it('returns message if last message is text and ephemeral', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createRandomUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const ephemeral_message_et = new ContentMessage();
      ephemeral_message_et.addAsset(new Text());
      ephemeral_message_et.id = createRandomUuid();
      ephemeral_message_et.user(self_user_et);
      ephemeral_message_et.ephemeral_expires(true);
      conversation_et.addMessage(ephemeral_message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
      expect(conversation_et.getLastEditableMessage().id).toBe(message_et.id);
    });
  });

  describe('getNextIsoDate', () => {
    it('should return an expected ISO string', () => {
      const referenceTimestamp = Date.now() - 1;
      const reference_iso_date = new Date(referenceTimestamp).toISOString();

      expect(conversation_et.getNextIsoDate(referenceTimestamp)).toBe(reference_iso_date);
      expect(new Date(conversation_et.getNextIsoDate('foo')).getTime()).toBeGreaterThan(
        new Date(reference_iso_date).getTime(),
      );

      const last_server_timestamp = referenceTimestamp + 10000;
      conversation_et.last_server_timestamp(last_server_timestamp);
      const expected_iso_date = new Date(last_server_timestamp + 1).toISOString();

      expect(conversation_et.getNextIsoDate(referenceTimestamp)).toEqual(expected_iso_date);
      expect(conversation_et.getNextIsoDate('foo')).toEqual(expected_iso_date);
    });
  });

  describe('display_name', () => {
    it('displays a name if the conversation is a 1:1 conversation or a connection request', () => {
      other_user.name(window.entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());

      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());
    });

    it('displays a fallback if no user name has been set', () => {
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.display_name()).toBe('…');

      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays a group conversation name with names from the participants', () => {
      const third_user = new User(createRandomUuid());
      third_user.name('Brad Delson');
      other_user.name(window.entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.participating_user_ets.push(third_user);
      conversation_et.type(CONVERSATION_TYPE.REGULAR);
      const expected_display_name = `${conversation_et.participating_user_ets()[0].name()}, ${conversation_et
        .participating_user_ets()[1]
        .name()}`;

      expect(conversation_et.display_name()).toBe(expected_display_name);
    });

    it('displays "Empty Conversation" if no other participants are in the conversation', () => {
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.display_name()).toBe(z.string.conversationsEmptyConversation);
    });

    it('displays a fallback if no user name has been set for a group conversation', () => {
      const user = new User(createRandomUuid());
      conversation_et.type(CONVERSATION_TYPE.REGULAR);
      conversation_et.participating_user_ids.push(other_user.id);
      conversation_et.participating_user_ids.push(user.id);

      expect(conversation_et.display_name()).toBe('…');
    });

    it('displays the conversation name for a self conversation', () => {
      conversation_et.type(CONVERSATION_TYPE.SELF);

      expect(conversation_et.display_name()).toBe('…');

      const conversation_name = 'My favorite music band';
      conversation_et.name(conversation_name);

      expect(conversation_et.display_name()).toBe('…');
    });
  });

  describe('getNumberOfClients', () => {
    it('should return the number of all known clients  (including own clients)', () => {
      const first_client = new ClientEntity();
      first_client.id = '5021d77752286cac';

      const second_client = new ClientEntity();
      second_client.id = '575b7a890cdb7635';

      const third_client = new ClientEntity();
      third_client.id = '6c0daa855d6b8b6e';

      const user_et = new User();
      user_et.devices.push(first_client);
      user_et.devices.push(second_client);

      const second_user_et = new User();
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
      const verified_client_et = new ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User(createRandomUuid());
      self_user_et.isMe = true;
      conversation_et.selfUser(self_user_et);

      const user_et = new User();
      user_et.devices.push(verified_client_et);
      conversation_et.participating_user_ets.push(user_et);

      expect(conversation_et.is_verified()).toBeTruthy();
    });

    it('is not verified when participant has unverified device', () => {
      const unverified_client_et = new ClientEntity();
      const verified_client_et = new ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User();
      self_user_et.isMe = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new User();
      user_et.devices.push(unverified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when all users are verified', () => {
      const verified_client_et = new ClientEntity();
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User();
      self_user_et.isMe = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new User();
      user_et.devices.push(verified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new User();
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeTruthy();
    });
  });

  describe('hasGuest', () => {
    it('detects conversations with guest', () => {
      conversation_et = new Conversation(createRandomUuid());
      const selfUserEntity = new User(createRandomUuid());
      selfUserEntity.isMe = true;
      selfUserEntity.inTeam(true);
      conversation_et.selfUser(selfUserEntity);

      // Is false for conversations not containing a guest
      const userEntity = new User(createRandomUuid());
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(false);

      // Is true for group conversations containing a guest
      const secondUserEntity = new User(createRandomUuid());
      secondUserEntity.isGuest(true);
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(true);

      // Is false for conversations containing a guest if the self user is a personal account
      selfUserEntity.inTeam(false);
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(false);
    });
  });

  describe('hasService', () => {
    it('detects conversations with services', () => {
      const userEntity = new User(createRandomUuid());

      conversation_et = new Conversation(createRandomUuid());
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasService()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasService()).toBe(false);

      const secondUserEntity = new User(createRandomUuid());
      secondUserEntity.isService = true;
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasService()).toBe(true);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

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
      conversation_et.id = createRandomUuid();

      const ping_message_1 = new PingMessage();
      ping_message_1.timestamp(timestamp - 4000);
      ping_message_1.id = createRandomUuid();

      const ping_message_2 = new PingMessage();
      ping_message_2.timestamp(timestamp - 2000);
      ping_message_2.id = createRandomUuid();

      const ping_message_3 = new PingMessage();
      ping_message_3.timestamp(timestamp);
      ping_message_3.id = createRandomUuid();

      conversation_et.addMessage(ping_message_1);
      conversation_et.addMessage(ping_message_2);
      conversation_et.addMessage(ping_message_3);

      expect(conversation_et.messages_unordered().length).toBe(3);
      expect(conversation_et.messages().length).toBe(3);
      expect(conversation_et.messages_visible().length).toBe(3);
    });
  });

  describe('release', () => {
    it('should not release messages if conversation has unread messages', () => {
      const message_et = new Message(createRandomUuid());
      message_et.timestamp(second_timestamp);
      conversation_et.addMessage(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(1);

      conversation_et.release();

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(1);
    });

    it('should release messages if conversation has no unread messages', () => {
      const message_et = new Message(createRandomUuid());
      message_et.timestamp(first_timestamp);
      conversation_et.addMessage(message_et);
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

  describe('removeMessageById', () => {
    let message_id = undefined;

    beforeEach(() => {
      const message_et = new Message(createRandomUuid());
      conversation_et.addMessage(message_et);
      message_id = message_et.id;
    });

    afterEach(() => conversation_et.removeMessages());

    it('should remove message by id', () => {
      expect(conversation_et.messages().length).toBe(1);
      conversation_et.removeMessageById(message_id);

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all message with the same id', () => {
      const duplicated_message_et = new Message(message_id);

      expect(conversation_et.messages().length).toBe(1);
      conversation_et.addMessage(duplicated_message_et);

      expect(conversation_et.messages().length).toBe(1);
      conversation_et.messages_unordered.push(duplicated_message_et);

      expect(conversation_et.messages().length).toBe(2);

      conversation_et.removeMessageById(message_id);

      expect(conversation_et.messages().length).toBe(0);
    });
  });

  describe('removeMessages', () => {
    let message_et = undefined;

    beforeEach(() => {
      const first_message_et = new Message(createRandomUuid());
      first_message_et.timestamp(first_timestamp);
      conversation_et.addMessage(first_message_et);

      message_et = new Message(createRandomUuid());
      message_et.timestamp(second_timestamp);
      conversation_et.addMessage(message_et);
    });

    afterEach(() => conversation_et.removeMessages());

    it('should remove all messages', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.removeMessages();

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove all messages for invalid input timestamp', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.removeMessages('foo');

      expect(conversation_et.messages().length).toBe(0);
    });

    it('should remove expected messages for timestamp greater than message', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.removeMessages(first_timestamp + 1);

      expect(conversation_et.messages().length).toBe(1);
    });

    it('should remove expected messages for timestamp equal to message', () => {
      expect(conversation_et.messages().length).toBe(2);
      conversation_et.removeMessages(first_timestamp);

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

    const conversationEntity = new Conversation(createRandomUuid());

    const selfUserEntity = new User(createRandomUuid());
    selfUserEntity.isMe = true;
    selfUserEntity.inTeam(true);
    conversationEntity.selfUser(selfUserEntity);

    beforeEach(() => {
      timestamp = Date.now();
      conversationEntity.archivedTimestamp(timestamp);
      conversationEntity.archivedState(true);

      mutedTimestampMessage = new PingMessage();
      mutedTimestampMessage.timestamp(timestamp);

      outdatedMessage = new PingMessage();
      outdatedMessage.timestamp(timestamp - 100);

      contentMessage = new ContentMessage();
      contentMessage.assets([new Text('id', 'Hello there')]);
      contentMessage.timestamp(timestamp + 100);

      pingMessage = new PingMessage();
      pingMessage.timestamp(timestamp + 200);

      selfMentionMessage = new ContentMessage();
      const mentionEntity = new MentionEntity(0, 7, selfUserEntity.id);
      const textAsset = new Text('id', '@Gregor, Hello there');
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
      conversationEntity.mutedState(NOTIFICATION_STATE.NOTHING);

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
      conversationEntity.mutedState(NOTIFICATION_STATE.MENTIONS_AND_REPLIES);

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
      conversationEntity.mutedState(NOTIFICATION_STATE.EVERYTHING);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(outdatedMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(mutedTimestampMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      conversationEntity.messages_unordered.push(contentMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
      conversationEntity.messages_unordered.removeAll();

      const memberLeaveMessage = new MemberMessage();
      memberLeaveMessage.type = CONVERSATION_EVENT.MEMBER_LEAVE;
      memberLeaveMessage.timestamp(timestamp + 100);
      conversationEntity.messages_unordered.push(memberLeaveMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);

      const callMessage = new CallMessage();
      callMessage.call_message_type = CALL_MESSAGE_TYPE.ACTIVATED;
      callMessage.timestamp(timestamp + 200);
      conversationEntity.messages_unordered.push(callMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(true);
      conversationEntity.messages_unordered.removeAll();
      conversationEntity.messages_unordered.push(memberLeaveMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      const memberJoinMessage = new MemberMessage();
      memberJoinMessage.type = CONVERSATION_EVENT.MEMBER_JOIN;
      memberJoinMessage.timestamp(timestamp + 200);
      conversationEntity.messages_unordered.push(memberJoinMessage);

      expect(conversationEntity.shouldUnarchive()).toBe(false);
      const selfJoinMessage = new MemberMessage();
      selfJoinMessage.type = CONVERSATION_EVENT.MEMBER_JOIN;
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

  describe('check subscribers', () => {
    it('to state updates', () => {
      conversation_et.archivedState(false);
      conversation_et.cleared_timestamp(0);
      conversation_et.last_event_timestamp(1467650148305);
      conversation_et.last_read_timestamp(1467650148305);
      conversation_et.mutedState(NOTIFICATION_STATE.EVERYTHING);

      expect(conversation_et.last_event_timestamp.getSubscriptionsCount()).toEqual(1);
      expect(conversation_et.last_read_timestamp.getSubscriptionsCount()).toEqual(1);
    });
  });

  describe('connection', () => {
    it('updates the participating user IDs with the user ID of the other party', () => {
      const connector_user_id = 'b43b376d-7b5a-4d77-89be-81a02892db8c';

      const payload_connection = {
        conversation: '15a7f358-8eba-4b8e-bcf2-61a08eb53349',
        from: '616cbbeb-1360-4e17-b333-e000662257bd',
        last_update: '2017-05-10T11:34:18.396Z',
        message: ' ',
        status: 'sent',
        to: `${connector_user_id}`,
      };
      const payload_conversation = {
        access: ['private'],
        creator: '616cbbeb-1360-4e17-b333-e000662257bd',
        id: '15a7f358-8eba-4b8e-bcf2-61a08eb53349',
        last_event: '2.800122000a73cb63',
        last_event_time: '2017-05-10T11:34:18.376Z',
        members: {
          others: [],
          self: {
            archived: null,
            cleared: null,
            hidden: false,
            hidden_ref: null,
            id: '616cbbeb-1360-4e17-b333-e000662257bd',
            last_read: '1.800122000a73cb62',
            muted: null,
            muted_time: null,
            otr_archived: false,
            otr_archived_ref: null,
            otr_muted: false,
            otr_muted_ref: null,
            service: null,
            status: 0,
            status_ref: '0.0',
            status_time: '2017-05-10T11:34:18.376Z',
          },
        },
        name: 'Marco',
        type: 3,
      };

      const connectionMapper = new ConnectionMapper();
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
      const NOTIFICATION_STATES = NOTIFICATION_STATE;
      const conversationEntity = new Conversation(createRandomUuid());
      const selfUserEntity = new User(createRandomUuid());

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
