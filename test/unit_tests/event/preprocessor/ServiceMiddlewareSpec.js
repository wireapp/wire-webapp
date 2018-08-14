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
    return testFactory.exposeUserActors().then(() => {
      serviceMiddleware = new z.event.preprocessor.ServiceMiddleware(TestFactory.user_repository);
    });
  });

  describe('processEvent', () => {
    describe('conversation.member-join events', () => {
      it('adds meta when bots are present in the event', () => {
        const event = {
          data: {
            user_ids: ['not-a-bot', 'a-bot'],
          },
          type: z.event.Backend.CONVERSATION.MEMBER_JOIN,
        };

        spyOn(TestFactory.user_repository, 'get_user_by_id').and.callFake(id => {
          if (id === 'a-bot') {
            return Promise.resolve({isBot: true});
          }
          return Promise.resolve({});
        });

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.hasBots).toBe(true);
        });
      });

      it('does not modify events not containing any bot', () => {
        const event = {
          data: {
            user_ids: ['not-a-bot', 'another-not-a-bot'],
          },
          type: z.event.Backend.CONVERSATION.MEMBER_JOIN,
        };

        spyOn(TestFactory.user_repository, 'get_user_by_id').and.returnValue(Promise.resolve({}));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.hasBots).not.toBeDefined();
        });
      });
    });

    describe('conversation.group-creation events', () => {
      it('adds meta when bots are present in the event', () => {
        const event = {
          data: {
            userIds: ['not-a-bot', 'a-bot'],
          },
          type: z.event.Client.CONVERSATION.GROUP_CREATION,
        };

        spyOn(TestFactory.user_repository, 'get_user_by_id').and.callFake(id => {
          if (id === 'a-bot') {
            return Promise.resolve({isBot: true});
          }
          return Promise.resolve({});
        });

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.hasBots).toBe(true);
        });
      });

      it('does not modify events not containing any bot', () => {
        const event = {
          data: {
            userIds: ['not-a-bot', 'another-not-a-bot'],
          },
          type: z.event.Client.GROUP_CREATION,
        };

        spyOn(TestFactory.user_repository, 'get_user_by_id').and.returnValue(Promise.resolve({}));

        return serviceMiddleware.processEvent(event).then(decoratedEvent => {
          expect(decoratedEvent.hasBots).not.toBeDefined();
        });
      });
    });
  });
});
