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

import ClientEntity from 'app/script/client/ClientEntity';
import Conversation from 'app/script/entity/Conversation';
import User from 'app/script/entity/User';

describe('z.conversation.ConversationVerificationStateHandler', () => {
  const test_factory = new TestFactory();
  let state_handler = undefined;
  let conversation_repository = undefined;

  let conversation_ab = undefined;
  let conversation_b = undefined;
  let conversation_c = undefined;

  let selfUserEntity = undefined;
  let user_a = undefined;
  let user_b = undefined;

  let client_a = undefined;
  let client_b = undefined;

  beforeEach(() => {
    return test_factory.exposeConversationActors().then(_conversation_repository => {
      spyOn(TestFactory.event_repository, 'injectEvent').and.returnValue(undefined);
      conversation_repository = _conversation_repository;
      state_handler = conversation_repository.verification_state_handler;

      conversation_ab = new Conversation(z.util.createRandomUuid());
      conversation_b = new Conversation(z.util.createRandomUuid());
      conversation_c = new Conversation(z.util.createRandomUuid());

      selfUserEntity = conversation_repository.selfUser();
      selfUserEntity.devices().forEach(clientEntity => clientEntity.meta.isVerified(true));

      user_a = new User(z.util.createRandomUuid());
      user_b = new User(z.util.createRandomUuid());

      client_a = new ClientEntity();
      client_a.meta.isVerified(true);
      user_a.devices.push(client_a);

      client_b = new ClientEntity();
      client_b.meta.isVerified(true);
      user_b.devices.push(client_b);

      conversation_ab.selfUser(selfUserEntity);
      conversation_ab.participating_user_ids.push(user_a.id, user_b.id);
      conversation_ab.participating_user_ets.push(user_a, user_b);
      conversation_ab.verification_state(z.conversation.ConversationVerificationState.VERIFIED);

      conversation_b.selfUser(selfUserEntity);
      conversation_b.participating_user_ids.push(user_b.id);
      conversation_b.verification_state(z.conversation.ConversationVerificationState.VERIFIED);
      conversation_b.participating_user_ets.push(user_b);

      conversation_c.selfUser(selfUserEntity);
      conversation_c.verification_state(z.conversation.ConversationVerificationState.VERIFIED);

      conversation_repository.conversations.removeAll();
      return Promise.all([
        conversation_repository.save_conversation(conversation_ab),
        conversation_repository.save_conversation(conversation_b),
        conversation_repository.save_conversation(conversation_c),
      ]);
    });
  });

  describe('onClientAdd', () => {
    it('should change state to DEGRADED if new unverified client was added', () => {
      const degradedEvent = {type: 'degraded'};
      spyOn(z.conversation.EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_ab.is_verified()).toBeTruthy();

      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(false);
      user_b.devices.push(new_client_b);

      state_handler.onClientAdded(user_b.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_ab.is_verified()).toBeDefined();
      expect(conversation_ab.is_verified()).toBeFalsy();
      expect(z.conversation.EventBuilder.buildDegraded.calls.count()).toEqual(2);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);
    });

    it('should not change VERIFIED state if new verified client was added', () => {
      spyOn(z.conversation.EventBuilder, 'buildAllVerified');

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_ab.is_verified()).toBeDefined();
      expect(conversation_ab.is_verified()).toBeTruthy();

      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(true);
      user_b.devices.push(new_client_b);

      state_handler.onClientAdded(user_b.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_ab.is_verified()).toBeDefined();
      expect(conversation_ab.is_verified()).toBeTruthy();
      expect(z.conversation.EventBuilder.buildAllVerified).not.toHaveBeenCalled();
      expect(TestFactory.event_repository.injectEvent).not.toHaveBeenCalled();
    });
  });

  describe('onClientRemoved', () => {
    it('should change state from DEGRADED to VERIFIED if last unverified client was removed', () => {
      const degradedEvent = {type: 'degraded'};
      const verifiedEvent = {type: 'verified'};
      spyOn(z.conversation.EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);
      spyOn(z.conversation.EventBuilder, 'buildAllVerified').and.returnValue(verifiedEvent);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_c.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);

      const new_client = new ClientEntity();
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      state_handler.onClientAdded(selfUserEntity.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_c.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(z.conversation.EventBuilder.buildDegraded.calls.count()).toEqual(3);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      state_handler.onClientRemoved(selfUserEntity.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_c.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(z.conversation.EventBuilder.buildAllVerified.calls.count()).toEqual(3);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(verifiedEvent);
    });
  });

  describe('onClientsUpdated', () => {
    it('should change state from DEGRADED to VERIFIED if last unverified client was removed by other user', () => {
      const degradedEvent = {type: 'degraded'};
      const verifiedEvent = {type: 'verified'};
      spyOn(z.conversation.EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);
      spyOn(z.conversation.EventBuilder, 'buildAllVerified').and.returnValue(verifiedEvent);

      const new_client = new ClientEntity();
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      state_handler.onClientAdded(selfUserEntity.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_c.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(z.conversation.EventBuilder.buildDegraded.calls.count()).toEqual(3);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      state_handler.onClientsUpdated(selfUserEntity.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_c.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(z.conversation.EventBuilder.buildAllVerified.calls.count()).toEqual(3);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(verifiedEvent);
    });
  });

  describe('onMemberJoined', () => {
    it('should change state to DEGRADED if new user with unverified client was added to conversation', () => {
      const degradedEvent = {type: 'degraded'};
      spyOn(z.conversation.EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);

      const new_user = new User(z.util.createRandomUuid());
      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(false);
      new_user.devices.push(new_client_b);

      conversation_ab.participating_user_ids.push(new_user.id);
      conversation_ab.participating_user_ets.push(new_user);

      state_handler.onMemberJoined(conversation_ab, [new_user.id]);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_ab.is_verified()).toBeFalsy();
      expect(z.conversation.EventBuilder.buildDegraded.calls.count()).toEqual(1);
      expect(TestFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);
    });

    it('should not change state if new user with verified client was added to conversation', () => {
      spyOn(z.conversation.EventBuilder, 'buildDegraded');

      const new_user = new User(z.util.createRandomUuid());
      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(true);
      new_user.devices.push(new_client_b);

      conversation_ab.participating_user_ids.push(new_user.id);
      conversation_ab.participating_user_ets.push(new_user);

      state_handler.onMemberJoined(conversation_ab, [new_user.id]);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_ab.is_verified()).toBeTruthy();
      expect(z.conversation.EventBuilder.buildDegraded).not.toHaveBeenCalled();
      expect(TestFactory.event_repository.injectEvent).not.toHaveBeenCalled();
    });
  });

  describe('onClientVerificationChanged', () => {
    it('should change state to DEGRADED if user unverified client', () => {
      client_a.meta.isVerified(false);

      state_handler.onClientVerificationChanged(user_a.id, client_a.id);

      expect(conversation_ab.verification_state()).toBe(z.conversation.ConversationVerificationState.DEGRADED);
      expect(conversation_b.verification_state()).toBe(z.conversation.ConversationVerificationState.VERIFIED);
      expect(conversation_ab.is_verified()).toBeFalsy();
    });
  });
});
