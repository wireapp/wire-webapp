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

import {User} from 'src/script/entity/User';
import {createUuid} from 'Util/uuid';

import {EventStorageMiddleware} from './EventStorageMiddleware';

import {EventService} from '../EventService';
import {ClientEvent} from '../Client';
import exp from 'constants';
import {EventError} from 'src/script/error/EventError';

function buildEventStorageMiddleware() {
  const eventService = {
    saveEvent: jest.fn(),
    loadEvent: jest.fn(),
    replaceEvent: jest.fn(),
  } as unknown as jest.Mocked<EventService>;

  const selfUser = new User(createUuid());
  return [new EventStorageMiddleware(eventService, selfUser), {eventService, selfUser}] as const;
}

describe('EventStorageMiddleware', () => {
  describe('processEvent', () => {
    let event: any;
    let previously_stored_event: any;

    beforeEach(() => {
      event = {
        conversation: createUuid(),
        data: {
          content: 'Lorem Ipsum',
          previews: [],
        },
        from: createUuid(),
        id: createUuid(),
        time: new Date().toISOString(),
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
      };
    });

    it('saves an event with a new ID', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();

      await eventStorageMiddleware.processEvent(event);
      expect(eventService.saveEvent).toHaveBeenCalledWith(event);
    });

    it('ignores an event with an ID previously used by another user', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const eventWithSameId = {...event, from: createUuid()};
      eventService.loadEvent.mockResolvedValue(eventWithSameId);

      await expect(eventStorageMiddleware.processEvent(event)).rejects.toEqual(
        new EventError(EventError.TYPE.VALIDATION_FAILED, 'Event validation failed: ID reused by other user'),
      );
    });

    it('ignores a non-"text message" with an ID previously used by the same user', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      eventService.loadEvent.mockResolvedValue({...event, type: ClientEvent.CALL.E_CALL});

      await expect(eventStorageMiddleware.processEvent(event)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: Message duplication event invalid: original message did not fail to send and does not contain link preview',
        ),
      );
    });

    it('ignores a plain text message with an ID previously used by the same user for a non-"text message"', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const newEvent = {...event};
      eventService.loadEvent.mockResolvedValue({...event, type: ClientEvent.CALL.E_CALL});

      await expect(eventStorageMiddleware.processEvent(newEvent)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: Message duplication event invalid: original message did not fail to send and does not contain link preview',
        ),
      );
    });

    it('ignores a plain text message with an ID previously used by the same user', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      eventService.loadEvent.mockResolvedValue({...event});

      await expect(eventStorageMiddleware.processEvent(event)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: Message duplication event invalid: original message did not fail to send and does not contain link preview',
        ),
      );
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message with link preview', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const storedEvent = {...event, data: {...event.data, previews: [1]}};
      eventService.loadEvent.mockResolvedValue(storedEvent);

      await expect(eventStorageMiddleware.processEvent(event)).rejects.toEqual(
        new EventError(
          EventError.TYPE.VALIDATION_FAILED,
          'Event validation failed: Message duplication event invalid: original message did not fail to send and does not contain link preview',
        ),
      );
    });

    it('ignores a text message with link preview with an ID previously used by the same user for a text message different content', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const storedEvent = {...event, data: {...event.data, previews: [1]}};
      eventService.loadEvent.mockResolvedValue(storedEvent);

      const newEvent = {...event, data: {...event.data, content: 'different content', previews: [1]}};

      await expect(eventStorageMiddleware.processEvent(newEvent)).rejects.toEqual(
        new EventError(EventError.TYPE.VALIDATION_FAILED, 'Event validation failed: ID of link preview reused'),
      );
    });

    fit('saves a text message with link preview with an ID previously used by the same user for a plain text message', async () => {
      const [eventStorageMiddleware, {eventService}] = buildEventStorageMiddleware();
      const storedEvent = {...event};
      eventService.loadEvent.mockResolvedValue(storedEvent);
      eventService.replaceEvent.mockResolvedValue(storedEvent);

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      event.data.previews.push(1);
      event.time = changed_time;

      const savedEvent = await eventStorageMiddleware.processEvent(event);
      expect(savedEvent.time).toEqual(initial_time);
      expect(savedEvent.time).not.toEqual(changed_time);
      expect(savedEvent.primary_key).toEqual(previously_stored_event.primary_key);
      expect(eventService.replaceEvent).toHaveBeenCalled();
    });

    it('ignores edit message with missing associated original message', () => {
      const linkPreviewEvent = JSON.parse(JSON.stringify(event));
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue({} as any);
      jest.spyOn(eventService, 'replaceEvent').mockImplementation(() => Promise.resolve({} as EventRecord));

      linkPreviewEvent.data.replacing_message_id = 'initial_message_id';

      return testFactory
        .event_repository!['handleEventSaving'](linkPreviewEvent)
        .then(() => fail('Should have thrown an error'))
        .catch(() => {
          expect(eventService.replaceEvent).not.toHaveBeenCalled();
          expect(eventService.saveEvent).not.toHaveBeenCalled();
        });
    });

    it('updates edited messages when link preview arrives', () => {
      const replacingId = 'old-replaced-message-id';
      const storedEvent = {
        ...event,
        data: {...event.data, replacing_message_id: replacingId},
      } as EventRecord;
      const linkPreviewEvent = {...event};
      jest.spyOn(eventService, 'loadEvent').mockImplementation((conversationId: string, messageId: string) => {
        return messageId === replacingId ? Promise.resolve(undefined) : Promise.resolve(storedEvent as any);
      });
      jest.spyOn(eventService, 'replaceEvent').mockImplementation((ev: EventRecord) => Promise.resolve(ev));

      linkPreviewEvent.data.replacing_message_id = replacingId;
      linkPreviewEvent.data.previews = ['preview'];

      return testFactory.event_repository!['handleEventSaving'](linkPreviewEvent).then((updatedEvent: EventRecord) => {
        expect(eventService.replaceEvent).toHaveBeenCalled();
        expect(eventService.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews[0]).toEqual('preview');
      });
    });

    it('updates edited messages', () => {
      const originalMessage = JSON.parse(JSON.stringify(event));
      originalMessage.reactions = ['user-id'];
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(originalMessage as any);
      jest.spyOn(eventService, 'replaceEvent').mockImplementation((updates: EventRecord) => Promise.resolve(updates));

      const initial_time = event.time;
      const changed_time = new Date(new Date(event.time).getTime() + 60 * 1000).toISOString();
      originalMessage.primary_key = 12;
      event.id = createUuid();
      event.data.content = 'new content';
      event.data.replacing_message_id = originalMessage.id;
      event.time = changed_time;

      return testFactory.event_repository!['handleEventSaving'](event).then((updatedEvent: any) => {
        expect(updatedEvent.time).toEqual(initial_time);
        expect(updatedEvent.time).not.toEqual(changed_time);
        expect(updatedEvent.data.content).toEqual('new content');
        expect(updatedEvent.primary_key).toEqual(originalMessage.primary_key);
        expect(Object.keys(updatedEvent.reactions).length).toEqual(0);
        expect(eventService.replaceEvent).toHaveBeenCalled();
      });
    });

    it('updates link preview when edited', () => {
      const replacingId = 'replaced-message-id';
      const storedEvent = {
        ...event,
        data: {...event.data, previews: ['preview']},
      } as any;
      const editEvent = {...event} as any;
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(storedEvent as any);
      jest.spyOn(eventService, 'replaceEvent').mockImplementation((ev: EventRecord) => Promise.resolve(ev));

      editEvent.data.replacing_message_id = replacingId;

      return testFactory.event_repository!['handleEventSaving'](editEvent).then((updatedEvent: EventRecord) => {
        expect(eventService.replaceEvent).toHaveBeenCalled();
        expect(eventService.saveEvent).not.toHaveBeenCalled();
        expect(updatedEvent.data.previews.length).toEqual(0);
      });
    });

    it('saves a conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      jest.spyOn(eventService, 'loadEvent').mockClear();

      return testFactory
        .event_repository!['processEvent'](assetAddEvent, EventSource.NOTIFICATION_STREAM)
        .then(updatedEvent => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(eventService.saveEvent).toHaveBeenCalled();
        });
    });

    it('deletes cancelled conversation.asset-add event', async () => {
      const fromIds = [
        // cancel from an other user
        createUuid(),
        // cancel from the self user
        testFactory.user_repository['userState'].self().id,
      ];

      const loadEventSpy = jest.spyOn(eventService, 'loadEvent');
      const deleteEventSpy = jest.spyOn(eventService, 'deleteEvent');
      for (const fromId of fromIds) {
        const assetAddEvent = {...event, from: fromId, type: ClientEvent.CONVERSATION.ASSET_ADD};
        const assetCancelEvent = {
          ...assetAddEvent,
          data: {reason: ProtobufAsset.NotUploaded.CANCELLED, status: AssetTransferState.UPLOAD_FAILED},
          time: '2017-09-06T09:43:36.528Z',
        };

        loadEventSpy.mockResolvedValue(assetAddEvent as any);
        deleteEventSpy.mockImplementation(() => Promise.resolve(1));

        const savedEvent = await testFactory.event_repository!['processEvent'](
          assetCancelEvent,
          EventSource.NOTIFICATION_STREAM,
        );
        expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
        expect(eventService.deleteEvent).toHaveBeenCalled();
      }
    });

    it('deletes other user failed upload for conversation.asset-add event', () => {
      const assetAddEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(assetAddEvent as any);
      jest.spyOn(eventService, 'deleteEvent').mockImplementation(() => Promise.resolve(1));

      return testFactory
        .event_repository!['processEvent'](assetUploadFailedEvent, EventSource.NOTIFICATION_STREAM)
        .then(savedEvent => {
          expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(eventService.deleteEvent).toHaveBeenCalled();
        });
    });

    it('updates self failed upload for conversation.asset-add event', async () => {
      const assetAddEvent: EventRecord = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};
      const assetUploadFailedEvent = {
        ...assetAddEvent,
        data: {reason: ProtobufAsset.NotUploaded.FAILED, status: AssetTransferState.UPLOAD_FAILED},
        time: '2017-09-06T09:43:36.528Z',
      } as any;

      jest
        .spyOn(testFactory.event_repository!['userState'], 'self')
        .mockReturnValue(new User(assetAddEvent.from) as any);
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(assetAddEvent as any);
      jest
        .spyOn(eventService, 'updateEventAsUploadFailed')
        .mockImplementation(() => Promise.resolve(assetUploadFailedEvent));

      const savedEvent = await testFactory.event_repository!['processEvent'](
        assetUploadFailedEvent,
        EventSource.NOTIFICATION_STREAM,
      );
      expect(savedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
      expect(eventService.updateEventAsUploadFailed).toHaveBeenCalled();
    });

    it('handles conversation.asset-add state update event', () => {
      const initialAssetEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      const updateStatusEvent = {
        ...initialAssetEvent,
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest.spyOn(eventService, 'replaceEvent').mockImplementation(eventToUpdate => Promise.resolve(eventToUpdate));
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(initialAssetEvent as any);

      return testFactory
        .event_repository!['processEvent'](updateStatusEvent, EventSource.NOTIFICATION_STREAM)
        .then((updatedEvent: any) => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(updatedEvent.data.status).toEqual(updateStatusEvent.data.status);
          expect(eventService.replaceEvent).toHaveBeenCalled();
        });
    });

    it('updates video when preview is received', () => {
      const initialAssetEvent = {...event, type: ClientEvent.CONVERSATION.ASSET_ADD};

      const AssetPreviewEvent = {
        ...initialAssetEvent,
        data: {status: AssetTransferState.UPLOADED},
        time: '2017-09-06T09:43:36.528Z',
      };

      jest.spyOn(eventService, 'replaceEvent').mockImplementation(eventToUpdate => Promise.resolve(eventToUpdate));
      jest.spyOn(eventService, 'loadEvent').mockResolvedValue(initialAssetEvent as any);

      return testFactory
        .event_repository!['processEvent'](AssetPreviewEvent, EventSource.NOTIFICATION_STREAM)
        .then((updatedEvent: EventRecord) => {
          expect(updatedEvent.type).toEqual(ClientEvent.CONVERSATION.ASSET_ADD);
          expect(eventService.replaceEvent).toHaveBeenCalled();
        });
    });
  });
});
