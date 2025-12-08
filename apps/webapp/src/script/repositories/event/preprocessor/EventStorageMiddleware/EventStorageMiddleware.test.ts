/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {EventError} from 'src/script/error/EventError';
import {
  createAssetAddEvent,
  createMemberLeaveEvent,
  createMessageAddEvent,
  toSavedEvent,
} from 'test/helper/EventGenerator';
import {createUuid} from 'Util/uuid';

import {EventStorageMiddleware} from './EventStorageMiddleware';

import {ClientEvent} from '../../Client';
import {EventService} from '../../EventService';
import {EventSource} from '../../EventSource';

function buildEventStorageMiddleware() {
  const eventService = {
    saveEvent: jest.fn(event => event),
    loadEvent: jest.fn(),
    replaceEvent: jest.fn(event => event),
    deleteEvent: jest.fn(),
  } as unknown as jest.Mocked<EventService>;
  const conversationState = {
    findConversation: jest.fn(),
  } as unknown as jest.Mocked<ConversationState>;
  const selfUser = new User(createUuid());

  return [
    new EventStorageMiddleware(eventService, selfUser, conversationState),
    {eventService, conversationState, selfUser},
  ] as const;
}

describe('EventStorageMiddleware', () => {
  describe('processEvent', () => {
    it('ignores unhandled event', async () => {
      const event = {type: 'other'} as any;
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();

      await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET);
      expect(eventService.saveEvent).not.toHaveBeenCalledWith(event);
    });

    it('saves an event with a new ID', async () => {
      const event = createMessageAddEvent();
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();

      await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET);
      expect(eventService.saveEvent).toHaveBeenCalledWith(event);
    });

    it('fails for an event with an ID previously used by another user', async () => {
      const event = createMessageAddEvent();
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const eventWithSameId = {...event, from: createUuid()};
      eventService.loadEvent.mockResolvedValue({primary_key: '', category: 1, ...eventWithSameId});

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: ID previously used by another user',
        ),
      );
    });

    it('fails for a member leave event when users are not part of the conversation', async () => {
      const [eventStorageMiddleware, {conversationState}] = buildEventStorageMiddleware();
      const conversationId = createUuid();
      const userIds = [createUuid(), createUuid(), createUuid(), createUuid()];
      const conversation = new Conversation(conversationId, '');

      conversationState.findConversation.mockImplementation(() => conversation);

      const event = createMemberLeaveEvent(conversationId, userIds);

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: User is not part of the conversation',
        ),
      );
    });

    it('fails for a member leave event when users are part of the conversation but are deleted already', async () => {
      const [eventStorageMiddleware, {conversationState}] = buildEventStorageMiddleware();
      const conversationId = createUuid();
      const userIds = [createUuid(), createUuid(), createUuid()];
      const user1 = new User(userIds[0]);
      const user2 = new User(userIds[1]);
      const user3 = new User(userIds[2]);
      user1.isDeleted = true;
      user2.isDeleted = true;
      user3.isDeleted = true;
      const conversation = new Conversation(conversationId, '');
      conversation.participating_user_ets([user1, user2, user3]);

      conversationState.findConversation.mockImplementation(() => conversation);

      const event = createMemberLeaveEvent(conversationId, userIds);

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: User is not part of the conversation',
        ),
      );
    });

    it('does not return an error for a member leave event when users are part of the conversation', async () => {
      const [eventStorageMiddleware, {conversationState}] = buildEventStorageMiddleware();
      const conversationId = createUuid();
      const userIds = [createUuid(), createUuid(), createUuid()];
      const user1 = new User(userIds[0]);
      const user2 = new User(userIds[1]);
      const user3 = new User(userIds[2]);
      const conversation = new Conversation(conversationId, '');
      conversation.participating_user_ets([user1, user2, user3]);

      conversationState.findConversation.mockImplementation(() => conversation);

      const event = createMemberLeaveEvent(conversationId, userIds);

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).resolves.toEqual(event);
    });

    it('fails for a non-"text message" with an ID previously used by the same user', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      eventService.loadEvent.mockResolvedValue(toSavedEvent({...event, type: ClientEvent.CALL.E_CALL} as any));

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: ID already used for a different type of message',
        ),
      );
    });

    it('fails for a plain text message with an ID previously used by the same user', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      eventService.loadEvent.mockResolvedValue(toSavedEvent(event));

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: ID already used for a successfully sent message',
        ),
      );
    });

    it('fails for a text message with link preview with an ID previously used by the same user for a text message with link preview', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      const storedEvent = {...event, data: {...event.data, previews: ['1']}};
      eventService.loadEvent.mockResolvedValue(toSavedEvent(storedEvent));

      await expect(eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: ID already used for a successfully sent message',
        ),
      );
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      const storedEvent = {...event, data: {...event.data, previews: [] as any[]}};
      eventService.loadEvent.mockResolvedValue(toSavedEvent(storedEvent));

      const newEvent = {...event, data: {...event.data, content: 'different content', previews: ['1']}};

      await expect(eventStorageMiddleware.processEvent(newEvent, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: Link preview with different text content',
        ),
      );
    });

    it('saves a text message with link preview with an ID previously used by the same user for a plain text message', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      const storedEvent = JSON.parse(JSON.stringify(event));
      eventService.loadEvent.mockResolvedValue(storedEvent);
      eventService.replaceEvent.mockResolvedValue(storedEvent);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews?.push('1');
      event.time = changed_time;

      const savedEvent = (await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)) as any;
      expect(savedEvent.time).toEqual(initial_time);
      expect(savedEvent.time).not.toEqual(changed_time);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });

    it('saves a link preview even if the original message is not found', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent({dataOverrides: {previews: ['1']}});

      await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET);
      expect(eventService.replaceEvent).not.toHaveBeenCalled();
      expect(eventService.saveEvent).toHaveBeenCalled();
    });

    it('ignores edit message with missing associated original message', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const linkPreviewEvent = createMessageAddEvent();
      eventService.loadEvent.mockResolvedValue(undefined);

      linkPreviewEvent.data.replacing_message_id = 'missing';

      await expect(eventStorageMiddleware.processEvent(linkPreviewEvent, EventSource.WEBSOCKET)).rejects.toEqual(
        new EventError(EventError.TYPE.VALIDATION_FAILED, 'Event validation failed: Edit event without original event'),
      );
    });

    it('updates edited messages when link preview arrives', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const replacingId = 'old-replaced-message-id';
      const linkPreviewEvent = createMessageAddEvent();
      const storedEvent = JSON.parse(
        JSON.stringify({
          ...linkPreviewEvent,
          data: {...linkPreviewEvent.data, replacing_message_id: replacingId},
          edited_time: new Date().toISOString(),
        }),
      );
      eventService.loadEvent.mockResolvedValue(storedEvent);

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      const updatedEvent = (await eventStorageMiddleware.processEvent(linkPreviewEvent, EventSource.WEBSOCKET)) as any;
      expect(updatedEvent.edited_time).not.toBeUndefined();
      expect(eventService.replaceEvent).toHaveBeenCalled();
      expect(eventService.saveEvent).not.toHaveBeenCalled();
      expect(updatedEvent.data.previews[0]).toEqual('preview');
    });

    it('updates edited messages', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();
      const originalEvent = JSON.parse(JSON.stringify(event));
      originalEvent.reactions = ['user-id'];
      eventService.loadEvent.mockResolvedValue(originalEvent);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalEvent.primary_key = 12;
      event.id = createUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalEvent.id;
      event.time = changed_time;

      const updatedEvent = (await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET)) as any;
      expect(updatedEvent.time).toEqual(initial_time);
      expect(updatedEvent.time).not.toEqual(changed_time);
      expect(updatedEvent.edited_time).toEqual(changed_time);
      expect(updatedEvent.data.content).toEqual('new content');
      expect(updatedEvent.primary_key).toEqual(originalEvent.primary_key);
      expect(Object.keys(updatedEvent.reactions).length).toEqual(0);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });

    it('updates link preview when edited', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createMessageAddEvent();

      const replacingId = 'replaced-message-id';
      const storedEvent = {
        ...event,
        data: {...event.data, previews: ['preview']},
      };
      const editEvent = {...event};
      eventService.loadEvent.mockResolvedValue(toSavedEvent(storedEvent));

      editEvent.data.replacing_message_id = replacingId;

      const updatedEvent = (await eventStorageMiddleware.processEvent(editEvent, EventSource.WEBSOCKET)) as any;
      expect(eventService.replaceEvent).toHaveBeenCalled();
      expect(eventService.saveEvent).not.toHaveBeenCalled();
      expect(updatedEvent.data.previews.length).toEqual(0);
    });

    it('saves a conversation.asset-add event', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const event = createAssetAddEvent();

      const updatedEvent = await eventStorageMiddleware.processEvent(event, EventSource.WEBSOCKET);
      expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(eventService.saveEvent).toHaveBeenCalled();
    });

    it('deletes cancelled conversation.asset-add event', async () => {
      const [eventStorageMiddleware, {eventService, selfUser}] = buildEventStorageMiddleware();
      const fromIds = [
        // cancel from an other user
        createUuid(),
        // cancel from the self user
        selfUser.id,
      ];

      for (const fromId of fromIds) {
        const assetAddEvent = createAssetAddEvent({from: fromId});
        const assetCancelEvent = {
          ...assetAddEvent,
          data: {
            ...assetAddEvent.data,
            reason: ProtobufAsset.NotUploaded.CANCELLED,
            status: AssetTransferState.UPLOAD_FAILED,
          },
          time: '2017-09-06T09:43:36.528Z',
        };

        eventService.loadEvent.mockResolvedValue(toSavedEvent(assetAddEvent));
        eventService.deleteEvent.mockResolvedValue(1);

        const savedEvent = await eventStorageMiddleware.processEvent(assetCancelEvent, EventSource.WEBSOCKET);
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(eventService.deleteEvent).toHaveBeenCalled();
      }
    });

    it('deletes other user failed upload for conversation.asset-add event', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const assetAddEvent = createAssetAddEvent();
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {
          ...assetAddEvent.data,
          reason: ProtobufAsset.NotUploaded.FAILED,
          status: AssetTransferState.UPLOAD_FAILED,
        },
        time: '2017-09-06T09:43:36.528Z',
      };

      eventService.loadEvent.mockResolvedValue(toSavedEvent(assetAddEvent));
      eventService.deleteEvent.mockResolvedValue(1);

      const savedEvent = await eventStorageMiddleware.processEvent(assetUploadFailedEvent, EventSource.WEBSOCKET);
      expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(eventService.deleteEvent).toHaveBeenCalled();
    });

    it('updates self failed upload for conversation.asset-add event', async () => {
      const [eventStorageMiddleware, {eventService, selfUser}] = buildEventStorageMiddleware();

      const assetAddEvent = createAssetAddEvent({from: selfUser.id});
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {
          ...assetAddEvent.data,
          reason: ProtobufAsset.NotUploaded.FAILED,
          status: AssetTransferState.UPLOAD_FAILED,
        },
        time: '2017-09-06T09:43:36.528Z',
      } as any;

      eventService.loadEvent.mockResolvedValue(toSavedEvent(assetAddEvent));

      const savedEvent = await eventStorageMiddleware.processEvent(assetUploadFailedEvent, EventSource.WEBSOCKET);
      expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });

    it('handles conversation.asset-add state update event', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const initialAssetEvent = createAssetAddEvent({type: ClientEvent.CONVERSATION.ASSET_ADD});

      const updateStatusEvent = {
        ...initialAssetEvent,
        data: {...initialAssetEvent.data, status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      eventService.loadEvent.mockResolvedValue(toSavedEvent(initialAssetEvent));

      const updatedEvent = (await eventStorageMiddleware.processEvent(updateStatusEvent, EventSource.WEBSOCKET)) as any;
      expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });

    it('updates video when preview is received', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const initialAssetEvent = createAssetAddEvent();

      const AssetPreviewEvent = {
        ...initialAssetEvent,
        data: {...initialAssetEvent.data, status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      eventService.loadEvent.mockResolvedValue(toSavedEvent(initialAssetEvent));

      const updatedEvent = await eventStorageMiddleware.processEvent(AssetPreviewEvent, EventSource.WEBSOCKET);
      expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });
  });
});
