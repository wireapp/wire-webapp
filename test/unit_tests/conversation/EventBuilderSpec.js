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

// grunt test_init && grunt test_run:conversation/EventBuilder

'use strict';

describe('z.conversation.EventBuilder', function() {
  let event_mapper = undefined;
  let conversation_et = undefined;
  let self_user_et = undefined;

  beforeEach(function() {
    self_user_et = new z.entity.User(z.util.create_random_uuid());
    self_user_et.is_me = true;

    conversation_et = new z.entity.Conversation(z.util.create_random_uuid());
    conversation_et.self = self_user_et;

    event_mapper = new z.conversation.EventMapper();
  });

  it('build_all_verified', function() {
    const event = z.conversation.EventBuilder.build_all_verified(
      conversation_et
    );
    const message_et = event_mapper.map_json_event(event, conversation_et);
    expect(message_et).toBeDefined();
    expect(message_et.super_type).toBe(z.message.SuperType.VERIFICATION);
    expect(message_et.verification_message_type).toBe(
      z.message.VerificationMessageType.VERIFIED
    );
    expect(message_et.from).toBe(conversation_et.self.id);
    expect(message_et.conversation_id).toBe(conversation_et.id);
  });

  it('build_degraded', function() {
    const user_ids = [z.util.create_random_uuid()];
    const event = z.conversation.EventBuilder.build_degraded(
      conversation_et,
      user_ids,
      z.message.VerificationMessageType.NEW_DEVICE
    );
    const message_et = event_mapper.map_json_event(event, conversation_et);
    expect(message_et).toBeDefined();
    expect(message_et.super_type).toBe(z.message.SuperType.VERIFICATION);
    expect(message_et.verification_message_type).toBe(
      z.message.VerificationMessageType.NEW_DEVICE
    );
    expect(message_et.from).toBe(conversation_et.self.id);
    expect(message_et.conversation_id).toBe(conversation_et.id);
    expect(message_et.user_ids()).toEqual(user_ids);
  });

  it('build_missed', function() {
    const event = z.conversation.EventBuilder.build_missed(
      conversation_et,
      self_user_et
    );
    const message_et = event_mapper.map_json_event(event, conversation_et);
    expect(message_et).toBeDefined();
    expect(message_et.super_type).toBe(z.message.SuperType.MISSED);
    expect(message_et.from).toBe(conversation_et.self.id);
    expect(message_et.conversation_id).toBe(conversation_et.id);
  });
});
