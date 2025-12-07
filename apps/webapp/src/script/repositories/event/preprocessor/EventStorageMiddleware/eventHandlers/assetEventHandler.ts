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

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {AssetAddEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage';

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import {EventValidationError} from './EventValidationError';

import {CONVERSATION, ClientEvent} from '../../../Client';
import {DBOperation, EventHandler, HandledEvents} from '../types';

function validateAssetEvent(originalEvent: HandledEvents | undefined): originalEvent is StoredEvent<AssetAddEvent> {
  if (!originalEvent) {
    return false;
  }

  if (originalEvent.type !== ClientEvent.CONVERSATION.ASSET_ADD) {
    throw new EventValidationError('Trying to update a non-asset message as an asset message');
  }

  return true;
}

function computeEventUpdates(
  originalEvent: StoredEvent<AssetAddEvent>,
  newEvent: AssetAddEvent,
  selfUserId: string,
): DBOperation {
  const newEventData = newEvent.data;
  // the preview status is not sent by the client so we fake a 'preview' status in order to cleanly handle it in the switch statement
  const ASSET_PREVIEW = 'preview';
  // similarly, no status is sent by the client when we retry sending a failed message
  const RETRY_EVENT = 'retry';
  const isPreviewEvent = !newEventData.status && !!newEventData.preview_key;
  const isRetryEvent = !!newEventData.content_length;
  const handledEvent = isRetryEvent ? RETRY_EVENT : newEventData.status;
  const previewStatus = isPreviewEvent ? ASSET_PREVIEW : handledEvent;

  const updateEventData = (newData: Partial<AssetAddEvent['data']>) => {
    return {
      ...originalEvent,
      data: {...originalEvent.data, ...newData},
    };
  };

  switch (previewStatus) {
    case ASSET_PREVIEW:
    case RETRY_EVENT:
    case AssetTransferState.UPLOADED: {
      const updatedEvent = updateEventData(newEventData);
      return {type: 'update', event: updatedEvent, updates: updatedEvent};
    }

    case AssetTransferState.UPLOAD_FAILED: {
      // case of both failed or canceled upload
      const fromOther = newEvent.from !== selfUserId;
      const sameSender = newEvent.from === originalEvent.from;
      const selfCancel = !fromOther && newEvent.data.reason === ProtobufAsset.NotUploaded.CANCELLED;
      // we want to delete the event in the case of an error from the remote client or a cancel on the user's own client
      const shouldDeleteEvent = (fromOther || selfCancel) && sameSender;
      if (shouldDeleteEvent) {
        return {type: 'delete', event: newEvent, id: newEvent.id};
      }

      const updatedEvent = updateEventData({
        status: AssetTransferState.UPLOAD_FAILED,
        reason: newEvent.data.reason ?? ProtobufAsset.NotUploaded.FAILED,
      });
      return {
        type: 'update',
        event: updatedEvent,
        updates: updatedEvent,
      };
    }

    default: {
      throw new EventValidationError(`Unhandled asset status update '${newEvent.data.status}'`);
    }
  }
}

export const handleAssetEvent: EventHandler = async (event, {duplicateEvent, selfUserId}) => {
  if (event.type !== CONVERSATION.ASSET_ADD) {
    return undefined;
  }
  if (validateAssetEvent(duplicateEvent)) {
    return computeEventUpdates(duplicateEvent, event, selfUserId);
  }
  return undefined;
};
