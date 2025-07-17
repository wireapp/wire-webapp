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

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {createUuid} from 'Util/uuid';

import {ProteusConversationVerificationStateHandler} from './ProteusStateHandler';

import {TestFactory} from '../../../../../../test/helper/TestFactory';
import {ConversationRepository} from '../../ConversationRepository';
import {ConversationVerificationState} from '../../ConversationVerificationState';
import {EventBuilder} from '../../EventBuilder';

describe('ProteusConversationVerificationStateHandler', () => {
  const testFactory = new TestFactory();
  let stateHandler: ProteusConversationVerificationStateHandler;
  let conversationRepository: ConversationRepository;

  let conversationAB: Conversation;
  let conversationB: Conversation;
  let conversationC: Conversation;

  let selfUserEntity: User;
  let userA: User;
  let userB: User;

  let clientA: ClientEntity;
  let clientB: ClientEntity;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(_conversation_repository => {
      spyOn(testFactory.event_repository, 'injectEvent').and.returnValue(undefined);
      conversationRepository = _conversation_repository;
      stateHandler = conversationRepository.proteusVerificationStateHandler;

      conversationAB = new Conversation(createUuid());
      conversationB = new Conversation(createUuid());
      conversationC = new Conversation(createUuid());

      selfUserEntity = new User(createUuid(), null);
      selfUserEntity.isMe = true;
      selfUserEntity.devices().forEach(clientEntity => clientEntity.meta.isVerified(true));

      spyOn(conversationRepository['userState'], 'self').and.returnValue(selfUserEntity);

      userA = new User(createUuid(), null);
      userB = new User(createUuid(), null);

      clientA = new ClientEntity(false, null);
      clientA.meta.isVerified(true);
      userA.devices.push(clientA);

      clientB = new ClientEntity(false, null);
      clientB.meta.isVerified(true);
      userB.devices.push(clientB);

      conversationAB.selfUser(selfUserEntity);
      conversationAB.participating_user_ids.push(userA.qualifiedId, userB.qualifiedId);
      conversationAB.participating_user_ets.push(userA, userB);
      conversationAB.verification_state(ConversationVerificationState.VERIFIED);

      conversationB.selfUser(selfUserEntity);
      conversationB.participating_user_ids.push(userB.qualifiedId);
      conversationB.verification_state(ConversationVerificationState.VERIFIED);
      conversationB.participating_user_ets.push(userB);

      conversationC.selfUser(selfUserEntity);
      conversationC.verification_state(ConversationVerificationState.VERIFIED);

      conversationRepository['conversationState'].conversations.removeAll();
      return Promise.all([
        conversationRepository['saveConversation'](conversationAB),
        conversationRepository['saveConversation'](conversationB),
        conversationRepository['saveConversation'](conversationC),
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

      const new_client_b = new ClientEntity(false, null);
      new_client_b.meta.isVerified(false);
      userB.devices.push(new_client_b);

      stateHandler.onClientAdded(userB.qualifiedId);

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

      const new_client_b = new ClientEntity(false, null);
      new_client_b.meta.isVerified(true);
      userB.devices.push(new_client_b);

      stateHandler.onClientAdded(userB.qualifiedId);

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

      const new_client = new ClientEntity(false, null);
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      stateHandler.onClientAdded(selfUserEntity.qualifiedId);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      stateHandler.onClientRemoved(selfUserEntity.qualifiedId);

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

      const new_client = new ClientEntity(false, null);
      new_client.meta.isVerified(false);
      selfUserEntity.devices.push(new_client);

      stateHandler.onClientAdded(selfUserEntity.qualifiedId);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationC.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(3);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);

      selfUserEntity.devices.remove(new_client);
      stateHandler.onClientsUpdated(selfUserEntity.qualifiedId);

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

      const new_user = new User(createUuid(), null);
      const new_client_b = new ClientEntity(false, null);
      new_client_b.meta.isVerified(false);
      new_user.devices.push(new_client_b);

      conversationAB.participating_user_ids.push({
        domain: new_user.domain,
        id: new_user.id,
      });
      conversationAB.participating_user_ets.push(new_user);

      stateHandler.onMemberJoined(conversationAB, [{domain: new_user.domain, id: new_user.id}]);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationAB.is_verified()).toBeFalsy();
      expect(EventBuilder.buildDegraded).toHaveBeenCalledTimes(1);
      expect(testFactory.event_repository.injectEvent).toHaveBeenCalledWith(degradedEvent);
    });

    it('should not change state if new user with verified client was added to conversation', () => {
      spyOn(EventBuilder, 'buildDegraded');

      const new_user = new User(createUuid(), null);
      const new_client_b = new ClientEntity(false, null);
      new_client_b.meta.isVerified(true);
      new_user.devices.push(new_client_b);

      conversationAB.participating_user_ids.push({
        domain: new_user.domain,
        id: new_user.id,
      });
      conversationAB.participating_user_ets.push(new_user);

      stateHandler.onMemberJoined(conversationAB, [{domain: new_user.domain, id: new_user.id}]);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeTruthy();
      expect(EventBuilder.buildDegraded).not.toHaveBeenCalled();
      expect(testFactory.event_repository.injectEvent).not.toHaveBeenCalled();
    });
  });

  describe('onClientVerificationChanged', () => {
    it('should change state to DEGRADED if user unverified client', () => {
      clientA.meta.isVerified(false);

      stateHandler.onClientVerificationChanged(userA.qualifiedId);

      expect(conversationAB.verification_state()).toBe(ConversationVerificationState.DEGRADED);
      expect(conversationB.verification_state()).toBe(ConversationVerificationState.VERIFIED);
      expect(conversationAB.is_verified()).toBeFalsy();
    });
  });
});
