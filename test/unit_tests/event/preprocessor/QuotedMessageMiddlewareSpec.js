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

// grunt test_run:event/preprocessor/QuotedMessageMiddleware

describe('z.event.preprocessor.QuotedMessageMiddleware', () => {
  const testFactory = new TestFactory();
  let quotedMessageMiddleware;

  beforeEach(() => {
    return z.util.protobuf
      .loadProtos('ext/proto/@wireapp/protocol-messaging/messages.proto')
      .then(() => testFactory.exposeEventActors())
      .then(() => {
        quotedMessageMiddleware = new z.event.preprocessor.QuotedMessageMiddleware(
          TestFactory.event_service,
          z.message.MessageHasher
        );
      });
  });

  describe('processEvent', () => {
    it('ignores messages that do not have quotes', () => {
      const event = {
        data: {
          content: 'salut',
          quote: undefined,
        },
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      return quotedMessageMiddleware.processEvent(event).then(decoratedEvent => {
        expect(decoratedEvent).toBe(event);
      });
    });

    it('adds an error if quoted message is not found', () => {
      spyOn(quotedMessageMiddleware.eventService, 'loadEvent').and.returnValue(Promise.resolve(undefined));

      const expectedError = {
        type: z.message.QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
      };

      const event = {
        conversation: 'c3dfbc39-4e61-42e3-ab31-62800a0faeeb',
        data: {
          content: 'salut',
          quote: new z.proto.Quote({
            quoted_message_id: 'invalid-message-uuid',
            quoted_message_sha256: '',
          }).encode64(),
        },
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      return quotedMessageMiddleware.processEvent(event).then(parsedEvent => {
        expect(parsedEvent.data.quote.quoted_message_id).toBeUndefined();
        expect(parsedEvent.data.quote.error).toEqual(expectedError);
      });
    });

    it('adds an error if hashes do not match', () => {
      const expectedError = {
        type: z.message.QuoteEntity.ERROR.INVALID_HASH,
      };

      const quotedMessage = {
        data: {
          content: 'pas salut',
        },
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      spyOn(quotedMessageMiddleware.eventService, 'loadEvent').and.returnValue(Promise.resolve(quotedMessage));

      const event = {
        conversation: 'conversation-uuid',
        data: {
          content: 'salut',
          quote: new z.proto.Quote({
            quoted_message_id: 'message-uuid',
            quoted_message_sha256: '7fec6710751f67587b6f6109782257cd7c56b5d29570824132e8543e18242f1b',
          }).encode64(),
        },
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      return quotedMessageMiddleware.processEvent(event).then(parsedEvent => {
        expect(parsedEvent.data.quote.message_id).toBeUndefined();
        expect(parsedEvent.data.quote.error).toEqual(expectedError);
      });
    });

    it('decorates event with the quote metadata if validation is successful', () => {
      const quotedMessage = {
        data: {
          content: 'salut',
        },
        from: 'user-id',
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };
      spyOn(z.message.MessageHasher, 'validateHash').and.returnValue(Promise.resolve(true));
      spyOn(quotedMessageMiddleware.eventService, 'loadEvent').and.returnValue(Promise.resolve(quotedMessage));

      const event = {
        conversation: 'conversation-uuid',
        data: {
          content: 'salut',
          quote: new z.proto.Quote({
            quoted_message_id: 'message-uuid',
            quoted_message_sha256: '7fec6710751f67587b6f6109782257cd7c56b5d29570824132e8543e18242f1b',
          }).encode64(),
        },
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      return quotedMessageMiddleware.processEvent(event).then(parsedEvent => {
        expect(parsedEvent.data.quote.message_id).toEqual('message-uuid');
        expect(parsedEvent.data.quote.user_id).toEqual('user-id');
      });
    });

    it('updates quotes in DB when a message is edited', () => {
      const originalMessage = {
        data: {
          content: 'hello',
        },
      };
      const replies = [
        {
          data: {
            content: 'bonjour',
            quote: {
              message_id: 'original-id',
            },
          },
        },
        {
          data: {
            content: 'hey',
            quote: {
              message_id: 'original-id',
            },
          },
        },
      ];
      spyOn(quotedMessageMiddleware.eventService, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(quotedMessageMiddleware.eventService, 'loadEventsReplyingToMessage').and.returnValue(
        Promise.resolve(replies)
      );
      spyOn(quotedMessageMiddleware.eventService, 'replaceEvent').and.returnValue(Promise.resolve());

      const event = {
        conversation: 'conversation-uuid',
        data: {
          replacing_message_id: 'original-id',
        },
        id: 'new-id',
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_ADD,
      };

      return quotedMessageMiddleware.processEvent(event).then(parsedEvent => {
        expect(quotedMessageMiddleware.eventService.replaceEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({data: jasmine.objectContaining({quote: {message_id: 'new-id'}})})
        );
      });
    });

    it('invalidates quotes in DB when a message is deleted', () => {
      const originalMessage = {
        data: {
          content: 'hello',
        },
      };
      const replies = [
        {
          data: {
            content: 'bonjour',
            quote: {
              message_id: 'original-id',
            },
          },
        },
        {
          data: {
            content: 'hey',
            quote: {
              message_id: 'original-id',
            },
          },
        },
      ];
      spyOn(quotedMessageMiddleware.eventService, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(quotedMessageMiddleware.eventService, 'loadEventsReplyingToMessage').and.returnValue(
        Promise.resolve(replies)
      );
      spyOn(quotedMessageMiddleware.eventService, 'replaceEvent').and.returnValue(Promise.resolve());

      const event = {
        conversation: 'conversation-uuid',
        data: {
          replacing_message_id: 'original-id',
        },
        id: 'new-id',
        time: 100,
        type: z.event.Client.CONVERSATION.MESSAGE_DELETE,
      };

      return quotedMessageMiddleware.processEvent(event).then(parsedEvent => {
        expect(quotedMessageMiddleware.eventService.replaceEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({
            data: jasmine.objectContaining({quote: {error: {type: z.message.QuoteEntity.ERROR.MESSAGE_NOT_FOUND}}}),
          })
        );
      });
    });
  });
});
