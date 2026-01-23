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

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {EventBuilder} from 'Repositories/conversation/EventBuilder';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {UserRepository} from 'Repositories/user/UserRepository';
import {createUuid} from 'Util/uuid';

import {ServiceMiddleware} from './ServiceMiddleware';

function buildServiceMiddleware() {
  const selfUser = new User(createUuid());
  const conversationRepository = {getConversationById: jest.fn()} as unknown as jest.Mocked<ConversationRepository>;
  const userRepository = {getUsersById: jest.fn()} as unknown as jest.Mocked<UserRepository>;

  return [
    new ServiceMiddleware(conversationRepository, userRepository, selfUser),
    {conversationRepository, userRepository, selfUser},
  ] as const;
}

describe('ServiceMiddleware', () => {
  const conversation = new Conversation(createUuid());

  describe('processEvent', () => {
    describe('conversation.member-join events', () => {
      it('adds meta when services are present in the event', async () => {
        const [serviceMiddleware, {userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, []);

        const service = new User();
        service.isService = true;
        const userEntities = [new User(), service];
        userRepository.getUsersById.mockResolvedValue(userEntities);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).toBe(true);
      });

      it('adds meta if I was added to a conversation including a service', async () => {
        const [serviceMiddleware, {conversationRepository, userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, [selfUser.qualifiedId]);

        conversationRepository.getConversationById.mockResolvedValue(conversation);
        const service = new User();
        service.isService = true;
        const userEntities = [new User(), service];

        userRepository.getUsersById.mockResolvedValue(userEntities);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).toBe(true);
      });

      it('does not modify events not containing any service', async () => {
        const [serviceMiddleware, {userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, []);
        userRepository.getUsersById.mockResolvedValue([new User(), new User()]);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).not.toBeDefined();
      });

      it('adds meta when services are present in the event with qualified user ids', async () => {
        const [serviceMiddleware, {userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, []);

        const service = new User();
        service.isService = true;
        const userEntities = [new User(), service];
        userRepository.getUsersById.mockResolvedValue(userEntities);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).toBe(true);
      });
    });

    describe('conversation.one2one-creation events', () => {
      it('adds meta when services are present in the event', async () => {
        const [serviceMiddleware, {userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, []);

        const service = new User();
        service.isService = true;
        const userEntities = [new User(), service];
        userRepository.getUsersById.mockResolvedValue(userEntities);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).toBe(true);
      });

      it('does not modify events not containing any service', async () => {
        const [serviceMiddleware, {userRepository, selfUser}] = buildServiceMiddleware();
        const event = EventBuilder.buildMemberJoin(conversation, selfUser.qualifiedId, []);

        userRepository.getUsersById.mockResolvedValue([]);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).not.toBeDefined();
      });

      it('adds meta when services are present in the event with qualified user ids', async () => {
        const [serviceMiddleware, {userRepository}] = buildServiceMiddleware();
        const event = EventBuilder.build1to1Creation(conversation);

        const service = new User();
        service.isService = true;
        const userEntities = [new User(), service];
        userRepository.getUsersById.mockResolvedValue(userEntities);

        const decoratedEvent: any = await serviceMiddleware.processEvent(event);
        expect(decoratedEvent.data.has_service).toBe(true);
      });
    });
  });
});
