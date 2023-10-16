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

import {ConversationEvent} from '@wireapp/api-client/lib/event';

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import {User} from 'src/script/entity/User';
import {EventError} from 'src/script/error/EventError';

import {AssetTransferState} from '../../assets/AssetTransferState';
import {AssetAddEvent, MessageAddEvent, ClientConversationEvent} from '../../conversation/EventBuilder';
import {categoryFromEvent} from '../../message/MessageCategorization';
import {isEventRecordFailed, isEventRecordWithFederationError} from '../../message/StatusType';
import type {EventRecord, StoredEvent} from '../../storage';
import {CONVERSATION, ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';
import {EventService} from '../EventService';
import {eventShouldBeStored} from '../EventTypeHandling';

type HandledEvents = ClientConversationEvent | ConversationEvent;

export function getCommonMessageUpdates(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
  return {
    ...newEvent,
    data: {...newEvent.data, expects_read_confirmation: originalEvent.data.expects_read_confirmation},
    edited_time: newEvent.time,
    read_receipts: !newEvent.read_receipts ? originalEvent.read_receipts : newEvent.read_receipts,
    status: !newEvent.status || newEvent.status < originalEvent.status ? originalEvent.status : newEvent.status,
    time: originalEvent.time,
    version: 1,
  };
}

function getUpdatesForEditMessage(originalEvent: EventRecord, newEvent: MessageAddEvent): MessageAddEvent {
  // Remove reactions, so that likes (hearts) don't stay when a message's text gets edited
  return {...newEvent, reactions: {}};
}

export class EventStorageMiddleware implements EventMiddleware {
  constructor(
    private readonly eventService: EventService,
    private readonly selfUser: User,
  ) {}

  async processEvent(event: IncomingEvent) {
    const shouldSaveEvent = eventShouldBeStored(event);
    if (!shouldSaveEvent) {
      return event;
    }
    const savedEvent = await this.handleEventSaving(event);
    return savedEvent ?? event;
  }

  /**
   * Handle a mapped event, check for malicious ID use and save it.
   *
   * @param event Backend event extracted from notification stream
   * @returns Resolves with the saved event
   */
  private async handleEventSaving(event: HandledEvents) {
    const conversationId = event.conversation;
    if (event.type === ClientEvent.CONVERSATION.MESSAGE_ADD) {
      const conversationId = event.conversation;
      const mappedData = event.data ?? {};

      // first check if a message that should be replaced exists in DB
      const eventToReplace = mappedData.replacing_message_id
        ? await this.eventService.loadEvent(conversationId, mappedData.replacing_message_id)
        : undefined;

      const hasLinkPreview = mappedData.previews && mappedData.previews.length;
      const isReplacementWithoutOriginal = !eventToReplace && mappedData.replacing_message_id;
      if (isReplacementWithoutOriginal && !hasLinkPreview) {
        // the only valid case of a replacement with no original message is when an edited message gets a link preview
        this.throwValidationError('Edit event without original event');
      }
      if (eventToReplace?.type === CONVERSATION.MESSAGE_ADD) {
        return this.handleEventReplacement(eventToReplace, event);
      }
    }

    // check for duplicates (same id)
    const storedEvent =
      'id' in event && event.id ? await this.eventService.loadEvent(conversationId, event.id) : undefined;

    return storedEvent
      ? this.handleDuplicatedEvent(storedEvent, event)
      : this.eventService.saveEvent(event as EventRecord);
  }

  private handleEventReplacement(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
    if (originalEvent.from !== newEvent.from) {
      const errorMessage = 'ID reused by other user';
      this.throwValidationError(errorMessage);
    }
    const newData = newEvent.data;
    const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
    const isLinkPreviewEdit = newData?.previews && !!newData?.previews.length;

    const commonUpdates = getCommonMessageUpdates(originalEvent, newEvent);

    const specificUpdates = isLinkPreviewEdit
      ? this.getUpdatesForMessage(originalEvent, newEvent)
      : getUpdatesForEditMessage(originalEvent, newEvent);

    const updates = {...specificUpdates, ...commonUpdates};

    const identifiedUpdates = {...primaryKeyUpdate, ...updates};
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  private handleDuplicatedEvent(originalEvent: EventRecord, newEvent: HandledEvents) {
    switch (newEvent.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
        return this.handleAssetUpdate(originalEvent, newEvent);

      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        return this.handleMessageUpdate(originalEvent, newEvent);

      default:
        this.throwValidationError(`Forbidden type '${newEvent.type}' for duplicate events`);
    }
  }

  private async handleAssetUpdate(originalEvent: EventRecord, newEvent: AssetAddEvent) {
    if (originalEvent.type !== ClientEvent.CONVERSATION.ASSET_ADD) {
      this.throwValidationError('Trying to update a non-asset message as an asset message');
    }
    const newEventData = newEvent.data;
    // the preview status is not sent by the client so we fake a 'preview' status in order to cleanly handle it in the switch statement
    const ASSET_PREVIEW = 'preview';
    // similarly, no status is sent by the client when we retry sending a failed message
    const RETRY_EVENT = 'retry';
    const isPreviewEvent = !newEventData.status && !!newEventData.preview_key;
    const isRetryEvent = !!newEventData.content_length;
    const handledEvent = isRetryEvent ? RETRY_EVENT : newEventData.status;
    const previewStatus = isPreviewEvent ? ASSET_PREVIEW : handledEvent;

    const updateEvent = () => {
      const updatedData = {...originalEvent.data, ...newEventData};
      const updatedEvent = {...originalEvent, data: updatedData};
      return this.eventService.replaceEvent(updatedEvent);
    };

    switch (previewStatus) {
      case ASSET_PREVIEW:
      case RETRY_EVENT:
      case AssetTransferState.UPLOADED: {
        return updateEvent();
      }

      case AssetTransferState.UPLOAD_FAILED: {
        // case of both failed or canceled upload
        const fromOther = newEvent.from !== this.selfUser.id;
        const sameSender = newEvent.from === originalEvent.from;
        const selfCancel = !fromOther && newEvent.data.reason === ProtobufAsset.NotUploaded.CANCELLED;
        // we want to delete the event in the case of an error from the remote client or a cancel on the user's own client
        const shouldDeleteEvent = (fromOther || selfCancel) && sameSender;
        if (shouldDeleteEvent) {
          await this.eventService.deleteEvent(newEvent.conversation, newEvent.id);
          return newEvent;
        }
        return this.eventService.updateEventAsUploadFailed(
          originalEvent.primary_key,
          newEvent.data.reason ?? ProtobufAsset.NotUploaded.FAILED,
        );
      }

      default: {
        this.throwValidationError(`Unhandled asset status update '${newEvent.data.status}'`);
      }
    }
  }

  private handleMessageUpdate(originalEvent: StoredEvent<any>, newEvent: MessageAddEvent) {
    const newEventData = newEvent.data;
    const originalData = originalEvent.data;

    if (originalEvent.from !== newEvent.from) {
      const errorMessage = 'ID previously used by another user';
      return this.throwValidationError(errorMessage);
    }

    const containsLinkPreview = newEventData.previews && !!newEventData.previews.length;
    const isRetryAttempt = isEventRecordFailed(originalEvent) || isEventRecordWithFederationError(originalEvent);

    if (!containsLinkPreview && !isRetryAttempt) {
      const errorMessage =
        'Message duplication event invalid: original message did not fail to send and does not contain link preview';
      return this.throwValidationError(errorMessage);
    }

    const textContentMatches = newEventData.content === originalData.content;
    if (!textContentMatches) {
      const errorMessage = 'ID of link preview reused: Text content for message duplication not matching';
      return this.throwValidationError(errorMessage);
    }

    const bothAreMessageAddType = newEvent.type === originalEvent.type;
    if (!bothAreMessageAddType) {
      return this.throwValidationError('ID reused by same user');
    }

    const updates = this.getUpdatesForMessage(originalEvent, newEvent);
    const identifiedUpdates = {primary_key: originalEvent.primary_key, ...updates};
    return this.eventService.replaceEvent(identifiedUpdates);
  }

  private getUpdatesForMessage(originalEvent: StoredEvent<any>, newEvent: MessageAddEvent) {
    const newData = newEvent.data;
    const originalData = originalEvent.data;
    const updatingLinkPreview = !!originalData.previews.length;
    if (updatingLinkPreview) {
      this.throwValidationError('ID of link preview reused');
    }

    const textContentMatches = !newData.previews?.length || newData.content === originalData.content;
    if (!textContentMatches) {
      const errorMessage = 'ID of duplicated message reused: Text content for message duplication not matching';
      this.throwValidationError(errorMessage);
    }

    return {
      ...newEvent,
      category: categoryFromEvent(newEvent),
      ephemeral_expires: originalEvent.ephemeral_expires,
      ephemeral_started: originalEvent.ephemeral_started,
      ephemeral_time: originalEvent.ephemeral_time,
      server_time: newEvent.time,
      time: originalEvent.time,
      version: originalEvent.version,
    };
  }

  private throwValidationError(errorMessage: string): never {
    throw new EventError(EventError.TYPE.VALIDATION_FAILED, `Event validation failed: ${errorMessage}`);
  }
}
