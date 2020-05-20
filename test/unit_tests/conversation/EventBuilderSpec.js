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

import {EventMapper} from 'src/script/conversation/EventMapper';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ClientEvent} from 'src/script/event/Client';
import {EventBuilder} from 'src/script/conversation/EventBuilder';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';
import {SuperType} from 'src/script/message/SuperType';

describe('EventBuilder', () => {
  let event_mapper = undefined;
  let conversation_et = undefined;
  let self_user_et = undefined;

  beforeEach(() => {
    self_user_et = new User(createRandomUuid());
    self_user_et.isMe = true;

    conversation_et = new Conversation(createRandomUuid());
    conversation_et.selfUser(self_user_et);

    event_mapper = new EventMapper();
  });

  it('buildAllVerified', () => {
    const event = EventBuilder.buildAllVerified(conversation_et, 0);

    return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
      expect(messageEntity).toBeDefined();
      expect(messageEntity.super_type).toBe(SuperType.VERIFICATION);
      expect(messageEntity.verificationMessageType()).toBe(VerificationMessageType.VERIFIED);
      expect(messageEntity.from).toBe(conversation_et.selfUser().id);
      expect(messageEntity.conversation_id).toBe(conversation_et.id);
    });
  });

  it('buildDegraded', () => {
    const user_ids = [createRandomUuid()];
    const event = EventBuilder.buildDegraded(conversation_et, user_ids, VerificationMessageType.NEW_DEVICE, 0);

    return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
      expect(messageEntity).toBeDefined();
      expect(messageEntity.super_type).toBe(SuperType.VERIFICATION);
      expect(messageEntity.verificationMessageType()).toBe(VerificationMessageType.NEW_DEVICE);
      expect(messageEntity.from).toBe(conversation_et.selfUser().id);
      expect(messageEntity.conversation_id).toBe(conversation_et.id);
      expect(messageEntity.userIds()).toEqual(user_ids);
    });
  });

  it('buildMissed', () => {
    const event = EventBuilder.buildMissed(conversation_et, 0);

    return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
      expect(messageEntity).toBeDefined();
      expect(messageEntity.super_type).toBe(SuperType.MISSED);
      expect(messageEntity.from).toBe(conversation_et.selfUser().id);
      expect(messageEntity.conversation_id).toBe(conversation_et.id);
    });
  });

  it('buildGroupCreation', () => {
    conversation_et.participating_user_ids(['one', 'two', 'three']);
    conversation_et.creator = 'one';
    const event = EventBuilder.buildGroupCreation(conversation_et);

    return event_mapper.mapJsonEvent(event, conversation_et).then(messageEntity => {
      expect(messageEntity).toBeDefined();
      expect(messageEntity.type).toBe(ClientEvent.CONVERSATION.GROUP_CREATION);
      expect(messageEntity.conversation_id).toBe(conversation_et.id);
      expect(conversation_et.participating_user_ids().length).toBe(3);
    });
  });
});
