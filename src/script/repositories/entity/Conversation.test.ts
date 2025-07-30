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

//@ts-check

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation/';

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ConnectionMapper} from 'Repositories/connection/ConnectionMapper';
import {ConversationMapper} from 'Repositories/conversation/ConversationMapper';
import {NOTIFICATION_STATE} from 'Repositories/conversation/NotificationSetting';
import 'src/script/localization/Localizer';
import {StatusType} from 'src/script/message/StatusType';
import {createUuid} from 'Util/uuid';

import {Conversation} from './Conversation';
import {ContentMessage} from './message/ContentMessage';
import {Message} from './message/Message';
import {PingMessage} from './message/PingMessage';
import {Text} from './message/Text';
import {User} from './User';

import {entities} from '../../../../test/api/payloads';

describe('Conversation', () => {
  let conversation_et: Conversation = null;
  let other_user: User = null;

  const self_user = new User(entities.user.john_doe.id, null);
  self_user.isMe = true;

  const first_timestamp = new Date('2017-09-26T09:21:14.225Z').getTime();
  const second_timestamp = new Date('2017-09-26T10:27:18.837Z').getTime();
  const third_timestamp = new Date('2017-09-26T11:29:21.837Z').getTime();

  beforeEach(() => {
    conversation_et = new Conversation();
    other_user = new User(entities.user.jane_roe.id, null);
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
      conversation_et.teamId = createUuid();

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

      conversation_et.participating_user_ids.push({domain: '', id: createUuid()});
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeFalsy();
      expect(conversation_et.is1to1()).toBeTruthy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();

      conversation_et.participating_user_ids.push({domain: '', id: createUuid()});
      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.isGroup()).toBeTruthy();
      expect(conversation_et.is1to1()).toBeFalsy();
      expect(conversation_et.isRequest()).toBeFalsy();
      expect(conversation_et.isSelf()).toBeFalsy();
    });
  });

  describe('add message', () => {
    let initial_message_et: Message = undefined;

    beforeEach(() => {
      initial_message_et = new Message(createUuid());
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
      const newMessageEntity = new Message(createUuid());
      newMessageEntity.id = initial_message_et.id;

      conversation_et.addMessage(newMessageEntity);

      expect(conversation_et.messages().length).toBe(initialLength);
      expect(conversation_et.messages().some(message => message == newMessageEntity)).toBe(false);
    });

    it('should add message with a newer timestamp', () => {
      const message_et = new Message(createUuid());
      message_et.timestamp(second_timestamp);

      conversation_et.addMessage(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getNewestMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(second_timestamp);
    });

    it('should add message with an older timestamp', () => {
      const older_timestamp = first_timestamp - 100;
      const message_et = new Message(createUuid());
      message_et.timestamp(older_timestamp);

      conversation_et.addMessage(message_et);

      expect(conversation_et.messages().length).toBe(2);
      const last_message_et = conversation_et.getOldestMessage();

      expect(last_message_et.id).toBe(message_et.id);
      expect(last_message_et.timestamp()).toBe(older_timestamp);
    });

    describe('affects last_event_timestamp', () => {
      it('and adding a message should update it', () => {
        const message_et = new Message(createUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(second_timestamp);
      });

      it('and adding a message should not update it if affect_order is false', () => {
        const message_et = new Message(createUuid());
        message_et.timestamp(second_timestamp);
        //@ts-ignore
        message_et.affect_order(false);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });

      it('and adding a message should not update it if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(createUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_event_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(first_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_event_timestamp()).toBe(first_timestamp);
      });
    });

    describe('affects last_read_timestamp', () => {
      it('and adding a message should update it if sent by self user', () => {
        const message_et = new Message(createUuid());
        message_et.timestamp(second_timestamp);
        message_et.user(self_user);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(second_timestamp);
      });

      it('should not update last read if last message was not send from self user', () => {
        const message_et = new Message(createUuid());
        message_et.timestamp(second_timestamp);

        conversation_et.last_read_timestamp(first_timestamp);
        conversation_et.last_server_timestamp(second_timestamp);

        conversation_et.addMessage(message_et);

        expect(conversation_et.last_read_timestamp()).toBe(first_timestamp);
      });

      it('should not update last read if timestamp is greater than the last server timestamp', () => {
        const message_et = new Message(createUuid());
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

    const message1 = new ContentMessage();
    message1.id = createUuid();
    message1.timestamp(reference_timestamp - 10000);
    message1.user(self_user);

    const message2 = new ContentMessage();
    message2.id = createUuid();
    message2.timestamp(reference_timestamp - 5000);

    it('adds multiple messages', () => {
      const message_ets: ContentMessage[] = [message1, message2];
      conversation_et.addMessages(message_ets);

      expect(conversation_et.messages_unordered().length).toBe(2);
    });
  });

  describe('getLastDeliveredMessage', () => {
    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.lastDeliveredMessage()).not.toBeDefined();
    });

    it('returns last delivered message', () => {
      const remoteUserEntity = new User(createUuid(), null);
      const selfUserEntity = new User(createUuid(), null);
      selfUserEntity.isMe = true;

      const sentMessageEntity = new ContentMessage(createUuid());
      sentMessageEntity.user(selfUserEntity);
      sentMessageEntity.status(StatusType.SENT);
      conversation_et.addMessage(sentMessageEntity);

      expect(conversation_et.lastDeliveredMessage()).not.toBeDefined();

      const deliveredMessageEntity = new ContentMessage(createUuid());
      deliveredMessageEntity.user(selfUserEntity);
      deliveredMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(deliveredMessageEntity);

      expect(conversation_et.lastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextSentMessageEntity = new ContentMessage(createUuid());
      nextSentMessageEntity.user(selfUserEntity);
      nextSentMessageEntity.status(StatusType.SENT);
      conversation_et.addMessage(nextSentMessageEntity);

      expect(conversation_et.lastDeliveredMessage()).toBe(deliveredMessageEntity);

      const nextDeliveredMessageEntity = new ContentMessage(createUuid());
      nextDeliveredMessageEntity.user(selfUserEntity);
      nextDeliveredMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(nextDeliveredMessageEntity);

      expect(conversation_et.lastDeliveredMessage()).toBe(nextDeliveredMessageEntity);

      const remoteMessageEntity = new ContentMessage(createUuid());
      remoteMessageEntity.user(remoteUserEntity);
      remoteMessageEntity.status(StatusType.DELIVERED);
      conversation_et.addMessage(remoteMessageEntity);

      expect(conversation_et.lastDeliveredMessage()).toBe(nextDeliveredMessageEntity);
    });
  });

  describe('getLastEditableMessage', () => {
    let self_user_et: User = undefined;

    beforeEach(() => {
      self_user_et = new User('', null);
      self_user_et.isMe = true;
    });

    afterEach(() => conversation_et.removeMessages());

    it('returns undefined if conversation has no messages', () => {
      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and not added by self user', () => {
      const message_et = new PingMessage();
      message_et.id = createUuid();
      message_et.user(new User('', null));
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is not text and is added by self user', () => {
      const message_et = new PingMessage();
      message_et.id = createUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns undefined if last message is text and not send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createUuid();
      message_et.user(new User('', null));
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).not.toBeDefined();
    });

    it('returns message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
    });

    it('returns last text message if last message is not text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const ping_message_et = new PingMessage();
      ping_message_et.id = createUuid();
      ping_message_et.user(new User('', null));
      conversation_et.addMessage(ping_message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
      expect(conversation_et.getLastEditableMessage().id).toBe(message_et.id);
    });

    it('returns last message if last message is text and send by self user', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const next_message_et = new ContentMessage();
      next_message_et.addAsset(new Text());
      next_message_et.id = createUuid();
      next_message_et.user(self_user_et);
      conversation_et.addMessage(next_message_et);

      expect(conversation_et.getLastEditableMessage()).toBeDefined();
      expect(conversation_et.getLastEditableMessage().id).toBe(next_message_et.id);
    });

    it('returns message if last message is text and ephemeral', () => {
      const message_et = new ContentMessage();
      message_et.addAsset(new Text());
      message_et.id = createUuid();
      message_et.user(self_user_et);
      conversation_et.addMessage(message_et);

      const ephemeral_message_et = new ContentMessage();
      ephemeral_message_et.addAsset(new Text());
      ephemeral_message_et.id = createUuid();
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
      //@ts-expect-error
      expect(new Date(conversation_et.getNextIsoDate('foo')).getTime()).toBeGreaterThan(
        new Date(reference_iso_date).getTime(),
      );

      const last_server_timestamp = referenceTimestamp + 10000;
      conversation_et.last_server_timestamp(last_server_timestamp);
      const expected_iso_date = new Date(last_server_timestamp + 1).toISOString();

      expect(conversation_et.getNextIsoDate(referenceTimestamp)).toEqual(expected_iso_date);
      //@ts-expect-error
      expect(conversation_et.getNextIsoDate('foo')).toEqual(expected_iso_date);
    });
  });

  describe('display_name', () => {
    it('displays a name if the conversation is a 1:1 conversation or a connection request', () => {
      other_user.name(entities.user.jane_roe.name);
      conversation_et.participating_user_ets.push(other_user);
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());

      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.display_name()).toBe(conversation_et.participating_user_ets()[0].name());
    });

    it('displays a fallback if no user name has been set', () => {
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.display_name()).toBe('Name not available');

      conversation_et.type(CONVERSATION_TYPE.CONNECT);

      expect(conversation_et.display_name()).toBe('Name not available');
    });

    it('displays a group conversation name with names from the participants', () => {
      const third_user = new User(createUuid(), null);
      third_user.name('Brad Delson');
      other_user.name(entities.user.jane_roe.name);
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

      expect(conversation_et.display_name()).toBe('Group conversation');
    });

    it('displays a fallback if no user name has been set for a group conversation', () => {
      const user = new User(createUuid(), null);
      conversation_et.type(CONVERSATION_TYPE.REGULAR);
      conversation_et.participating_user_ids.push({domain: '', id: other_user.id});
      conversation_et.participating_user_ids.push({domain: '', id: user.id});

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
      const first_client = new ClientEntity(false, null);
      first_client.id = '5021d77752286cac';

      const second_client = new ClientEntity(false, null);
      second_client.id = '575b7a890cdb7635';

      const third_client = new ClientEntity(false, null);
      third_client.id = '6c0daa855d6b8b6e';

      const user_et = new User('', null);
      user_et.devices.push(first_client);
      user_et.devices.push(second_client);

      const second_user_et = new User('', null);
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
      const verified_client_et = new ClientEntity(false, null);
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User(createUuid(), null);
      self_user_et.isMe = true;
      conversation_et.selfUser(self_user_et);

      const user_et = new User('', null);
      user_et.devices.push(verified_client_et);
      conversation_et.participating_user_ets.push(user_et);

      expect(conversation_et.is_verified()).toBeTruthy();
    });

    it('is not verified when participant has unverified device', () => {
      const unverified_client_et = new ClientEntity(false, null);
      const verified_client_et = new ClientEntity(false, null);
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User('', null);
      self_user_et.isMe = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new User('', null);
      user_et.devices.push(unverified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new User('', null);
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeFalsy();
    });

    it('is verified when all users are verified', () => {
      const verified_client_et = new ClientEntity(false, null);
      verified_client_et.meta.isVerified(true);

      const self_user_et = new User('', null);
      self_user_et.isMe = true;
      self_user_et.devices.push(verified_client_et);
      conversation_et.selfUser(self_user_et);

      const user_et = new User('', null);
      user_et.devices.push(verified_client_et);
      user_et.devices.push(verified_client_et);

      const user_et_two = new User('', null);
      user_et_two.devices.push(verified_client_et);

      conversation_et.participating_user_ets.push(user_et, user_et_two);

      expect(conversation_et.is_verified()).toBeTruthy();
    });
  });

  describe('hasGuest', () => {
    it('detects conversations with guest', () => {
      conversation_et = new Conversation(createUuid());
      const selfUserEntity = new User(createUuid(), null);
      selfUserEntity.isMe = true;
      selfUserEntity.teamId = createUuid();
      conversation_et.selfUser(selfUserEntity);

      // Is false for conversations not containing a guest
      const userEntity = new User(createUuid(), null);
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(false);

      // Is true for group conversations containing a guest
      const secondUserEntity = new User(createUuid(), null);
      secondUserEntity.isGuest(true);
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(true);

      // Is false for conversations containing a guest if the self user is a personal account
      selfUserEntity.teamId = createUuid();
      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasGuest()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasGuest()).toBe(true);
    });
  });

  describe('federation', () => {
    it('is considered a team conversation when teamId and domain are equal', () => {
      const teamId = 'team1';
      const conversation = new Conversation(createUuid(), 'domain.test');
      conversation.teamId = teamId;
      const selfUser = new User(createUuid(), 'domain.test');
      selfUser.isMe = true;
      selfUser.teamId = teamId;
      conversation.selfUser(selfUser);

      expect(conversation.inTeam()).toBe(true);
    });

    // @SF.Federation @SF.Separation @TSFI.UserInterface @S0.2
    it('is not considered a team conversation when teamId are equal but domains differ', () => {
      const teamId = 'team1';
      const conversation = new Conversation(createUuid(), 'otherdomain.test');
      conversation.teamId = teamId;
      const selfUser = new User(createUuid(), 'domain.test');
      selfUser.isMe = true;
      selfUser.teamId = teamId;
      conversation.selfUser(selfUser);

      expect(conversation.inTeam()).toBe(false);
    });
  });

  describe('hasService', () => {
    it('detects conversations with services', () => {
      const userEntity = new User(createUuid(), null);

      conversation_et = new Conversation(createUuid());
      conversation_et.participating_user_ets.push(userEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasService()).toBe(false);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasService()).toBe(false);

      const secondUserEntity = new User(createUuid(), null);
      secondUserEntity.isService = true;
      conversation_et.participating_user_ets.push(secondUserEntity);

      conversation_et.type(CONVERSATION_TYPE.ONE_TO_ONE);

      expect(conversation_et.hasService()).toBe(true);

      conversation_et.type(CONVERSATION_TYPE.REGULAR);

      expect(conversation_et.hasService()).toBe(true);
    });
  });

  describe('release', () => {
    it('if there are any incoming messages, they should be moved to regular messages', () => {
      const message_et = new Message(createUuid());
      message_et.timestamp(second_timestamp);
      conversation_et.addMessage(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      const incomingMessage = new Message(createUuid());
      conversation_et.last_event_timestamp(third_timestamp);
      conversation_et.addMessage(incomingMessage);

      expect(conversation_et.messages()).toEqual([message_et]);
      expect(conversation_et.unreadState().allEvents.length).toBe(2);

      conversation_et.release();

      // Incoming message should be moved to regular messages
      expect(conversation_et.messages()).toEqual([message_et, incomingMessage]);
      expect(conversation_et.unreadState().allEvents.length).toBe(2);
    });

    it('should release messages if conversation has no unread messages', () => {
      const message_et = new Message(createUuid());
      message_et.timestamp(first_timestamp);
      conversation_et.addMessage(message_et);
      conversation_et.last_read_timestamp(first_timestamp);

      expect(conversation_et.messages().length).toBe(1);
      expect(conversation_et.unreadState().allEvents.length).toBe(0);

      conversation_et.release();

      expect(conversation_et.hasAdditionalMessages()).toBeTruthy();
      expect(conversation_et.messages().length).toBe(0);
      expect(conversation_et.unreadState().allEvents.length).toBe(0);
    });
  });

  describe('removeMessageById', () => {
    let message_id: string = undefined;

    beforeEach(() => {
      const message_et = new Message(createUuid());
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
      const first_message_et = new Message(createUuid());
      first_message_et.timestamp(first_timestamp);
      conversation_et.addMessage(first_message_et);

      message_et = new Message(createUuid());
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
      //@ts-expect-error
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

  describe('_incrementTimeOnly', () => {
    it('should update only to newer timestamps', () => {
      //@ts-ignore
      expect(conversation_et._incrementTimeOnly(first_timestamp, second_timestamp)).toBe(second_timestamp);
      //@ts-ignore
      expect(conversation_et._incrementTimeOnly(second_timestamp, first_timestamp)).toBeFalsy();
      //@ts-ignore
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

      /** @type {import('@wireapp/api-client/lib/connection/').Connection} */
      const payload_connection = {
        conversation: '15a7f358-8eba-4b8e-bcf2-61a08eb53349',
        from: '616cbbeb-1360-4e17-b333-e000662257bd',
        last_update: '2017-05-10T11:34:18.396Z',
        message: ' ',
        status: ConnectionStatus.SENT,
        to: `${connector_user_id}`,
      };
      /** @type {any} */
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
      } as any;

      const connectionEntity = ConnectionMapper.mapConnectionFromJson(payload_connection);

      const [new_conversation] = ConversationMapper.mapConversations([payload_conversation]);
      new_conversation.connection(connectionEntity);

      expect(new_conversation.participating_user_ids().length).toBe(1);
      expect(new_conversation.participating_user_ids()[0]).toEqual({domain: '', id: connector_user_id});
    });
  });

  describe('notificationState', () => {
    it('returns expected values', () => {
      const NOTIFICATION_STATES = NOTIFICATION_STATE;
      const conversationEntity = new Conversation(createUuid());
      const selfUserEntity = new User(createUuid(), undefined);

      expect(conversationEntity.notificationState()).toBe(NOTIFICATION_STATES.NOTHING);

      conversationEntity.selfUser(selfUserEntity);
      conversationEntity.mutedState(NOTIFICATION_STATES.EVERYTHING);
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
