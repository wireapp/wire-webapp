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

// grunt test_init && grunt test_run:event/preprocessor/ServiceMiddleware

describe('z.event.preprocessor.ServiceMiddleware', () => {
  const testFactory = new TestFactory();
  let serviceMiddleware;

  beforeEach(() => {
    return testFactory.exposeConversationActors().then(() => {
      serviceMiddleware = new z.event.preprocessor.ServiceMiddleware(
        TestFactory.conversation_repository,
        TestFactory.user_repository
      );
    });
  });

  describe('processEvent', () => {
    describe('conversation.member-join events', () => {
      it('adds meta when services are present in the event', () => {
        const event = {
          data: {
            user_ids: ['not-a-service', 'a-service'],
          },
          type: z.event.Backend.CONVERSATION.MEMBER_JOIN,
        };

        const userEntities = [{}, {isBot: true}];
        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve(userEntities));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.data.has_service).toBe(true);
        });
      });

      it('adds meta if I was added to a conversation including a service', () => {
        const event = {
          data: {
            user_ids: ['self-id'],
          },
          type: z.event.Backend.CONVERSATION.MEMBER_JOIN,
        };

        spyOn(TestFactory.user_repository, 'self').and.returnValue({id: 'self-id'});
        const conversation = new z.entity.Conversation();
        spyOn(TestFactory.conversation_repository, 'get_conversation_by_id').and.returnValue(
          Promise.resolve(conversation)
        );
        const userEntities = [{}, {isBot: true}];
        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve(userEntities));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.data.has_service).toBe(true);
        });
      });

      it('does not modify events not containing any service', () => {
        const event = {
          data: {
            user_ids: ['not-a-service', 'another-not-a-service'],
          },
          type: z.event.Backend.CONVERSATION.MEMBER_JOIN,
        };

        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve([{}, {}]));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.data.has_service).not.toBeDefined();
        });
      });
    });

    describe('conversation.one2one-creation events', () => {
      it('adds meta when services are present in the event', () => {
        const event = {
          data: {
            userIds: ['not-a-service', 'a-service'],
          },
          type: z.event.Client.CONVERSATION.ONE2ONE_CREATION,
        };

        const userEntities = [{}, {isBot: true}];
        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve(userEntities));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.data.has_service).toBe(true);
        });
      });

      it('does not modify events not containing any service', () => {
        const event = {
          data: {
            userIds: ['not-a-service', 'another-not-a-service'],
          },
          type: z.event.Client.CONVERSATION.ONE2ONE_CREATION,
        };

        const userEntities = [{}, {}];
        spyOn(TestFactory.user_repository, 'get_users_by_id').and.returnValue(Promise.resolve(userEntities));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.data.has_service).not.toBeDefined();
        });
      });
    });
  });
});
