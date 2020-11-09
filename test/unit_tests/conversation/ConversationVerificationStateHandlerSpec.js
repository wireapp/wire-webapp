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

import {ClientEntity} from 'src/script/client/ClientEntity';
import {Conversation} from 'src/script/entity/Conversation';
import {ConversationVerificationState} from 'src/script/conversation/ConversationVerificationState';
import {User} from 'src/script/entity/User';
import {TestFactory} from '../../helper/TestFactory';
import {EventBuilder} from 'src/script/conversation/EventBuilder';

describe('ConversationVerificationStateHandler', () => {
  const testFactory = new TestFactory();
  let stateHandler = undefined;
  let conversationRepository = undefined;

  let conversationAB = undefined;
  let conversationB = undefined;
  let conversationC = undefined;

  let selfUserEntity = undefined;
  let userA = undefined;
  let userB = undefined;

  let clientA = undefined;
  let clientB = undefined;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(_conversation_repository => {
      spyOn(testFactory.event_repository, 'injectEvent').and.returnValue(undefined);
      conversationRepository = _conversation_repository;
      stateHandler = conversationRepository.verificationStateHandler;

      conversationAB = new Conversation(createRandomUuid());
      conversationB = new Conversation(createRandomUuid());
      conversationC = new Conversation(createRandomUuid());

      selfUserEntity = new User(createRandomUuid());
      selfUserEntity.isMe = true;
      selfUserEntity.devices().forEach(clientEntity => clientEntity.meta.isVerified(true));

      spyOn(conversationRepository.userState, 'self').and.returnValue(selfUserEntity);

      userA = new User(createRandomUuid());
      userB = new User(createRandomUuid());

      clientA = new ClientEntity();
      clientA.meta.isVerified(true);
      userA.devices.push(clientA);

      clientB = new ClientEntity();
      clientB.meta.isVerified(true);
      userB.devices.push(clientB);

      conversationAB.selfUser(selfUserEntity);
      conversationAB.participating_user_ids.push(userA.id, userB.id);
      conversationAB.participating_user_ets.push(userA, userB);
      conversationAB.verification_state(ConversationVerificationState.VERIFIED);

      conversationB.selfUser(selfUserEntity);
      conversationB.participating_user_ids.push(userB.id);
      conversationB.verification_state(ConversationVerificationState.VERIFIED);
      conversationB.participating_user_ets.push(userB);

      conversationC.selfUser(selfUserEntity);
      conversationC.verification_state(ConversationVerificationState.VERIFIED);

      conversationRepository.conversationState.conversations.removeAll();
      return Promise.all([
        conversationRepository.saveConversation(conversationAB),
        conversationRepository.saveConversation(conversationB),
        conversationRepository.saveConversation(conversationC),
      ]);
    });
  });

  describe('onClientAdd', () => {
    it('should change state to DEGRADED if new unverified client was added', () => {
      const degradedEvent = {type: 'degraded'};
      spyOn(EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeTruthy();

      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(false);
      userB.devices.push(new_client_b);

      stateHandler.onClientAdded(userB.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationAB.is_verified()).toBeDefined();
      expect(conversationAB.is_verified()).toBeFalsy();
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(2);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);
    });

    it('should not change VERIFIED state if new verified client was added', () => {
      spyOn(EventBuilder, 'buildAllVerified');

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeDefined();
      expect(conversationAB.is_verified()).toBeTruthy();

      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(true);
      userB.devices.push(new_client_b);

      stateHandler.onClientAdded(userB.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeDefined();
      expect(conversationAB.is_verified()).toBeTruthy();
      expect(EventBuilder.buildAllVerified).not.toHaveBeenCalled();
      expect(testFactory.event_repository.injectEvent).not.toHaveBeenCalled();
    });
  });

  describe('onClientRemoved', () => {
    it('should change state from DEGRADED to VERIFIED if last unverified client was removed', () => {
      const degradedEvent = {type: 'degraded'};
      const verifiedEvent = {type: 'verified'};
      spyOn(EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);
      spyOn(EventBuilder, 'buildAllVerified').and.returnValue(verifiedEvent);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.VERIFIED);

      const new_client = new ClientEntity();
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      stateHandler.onClientAdded(selfUserEntity.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      stateHandler.onClientRemoved(selfUserEntity.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(EventBuilder.buildAllVerified).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(verifiedEvent);
    });
  });

  describe('onClientsUpdated', () => {
    it('should change state from DEGRADED to VERIFIED if last unverified client was removed by other user', () => {
      const degradedEvent = {type: 'degraded'};
      const verifiedEvent = {type: 'verified'};
      spyOn(EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);
      spyOn(EventBuilder, 'buildAllVerified').and.returnValue(verifiedEvent);

      const new_client = new ClientEntity();
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      stateHandler.onClientAdded(selfUserEntity.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      stateHandler.onClientsUpdated(selfUserEntity.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(EventBuilder.buildAllVerified).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(verifiedEvent);
    });
  });

  describe('onMemberJoined', () => {
    it('should change state to DEGRADED if new user with unverified client was added to conversation', () => {
      const degradedEvent = {type: 'degraded'};
      spyOn(EventBuilder, 'buildDegraded').and.returnValue(degradedEvent);

      const new_user = new User(createRandomUuid());
      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(false);
      new_user.devices.push(new_client_b);

      conversationAB.participating_user_ids.push(new_user.id);
      conversationAB.participating_user_ets.push(new_user);

      stateHandler.onMemberJoined(conversationAB, [new_user.id]);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationAB.is_verified()).toBeFalsy();
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(1);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);
    });

    it('should not change state if new user with verified client was added to conversation', () => {
      spyOn(EventBuilder, 'buildDegraded');

      const new_user = new User(createRandomUuid());
      const new_client_b = new ClientEntity();
      new_client_b.meta.isVerified(true);
      new_user.devices.push(new_client_b);

      conversationAB.participating_user_ids.push(new_user.id);
      conversationAB.participating_user_ets.push(new_user);

      stateHandler.onMemberJoined(conversationAB, [new_user.id]);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeTruthy();
      expect(EventBuilder.buildDegraded).not.toHaveBeenCalled();
      expect(testFactory.event_repository.injectEvent).not.toHaveBeenCalled();
    });
  });

  describe('onClientVerificationChanged', () => {
    it('should change state to UNVERIFIED if user unverified client', () => {
      clientA.meta.isVerified(false);

      stateHandler.onClientVerificationChanged(userA.id, clientA.id);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.UNVERIFIED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeFalsy();
    });
  });
});
