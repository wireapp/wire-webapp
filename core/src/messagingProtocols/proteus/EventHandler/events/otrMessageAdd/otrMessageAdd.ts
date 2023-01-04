/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {BackendEvent, ConversationOtrMessageAddEvent, CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {Decoder} from 'bazinga64';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {DecryptionError} from '../../../../../errors/DecryptionError';
import {EventHandlerResult} from '../../../../common.types';
import {EventHandlerParams} from '../../EventHandler.types';

const isOtrMessageAddEvent = (event: BackendEvent): event is ConversationOtrMessageAddEvent =>
  event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD;

type HandleOtrMessageAddParams = Omit<EventHandlerParams, 'event'> & {
  event: ConversationOtrMessageAddEvent;
};

const handleOtrMessageAdd = async ({
  decryptMessage,
  event,
  dryRun = false,
}: HandleOtrMessageAddParams): EventHandlerResult => {
  if (dryRun) {
    // In case of a dry run, we do not want to decrypt messages
    // We just return the raw event to the caller
    return {event};
  }
  try {
    const {
      from,
      qualified_from,
      data: {sender: clientId, text: encodedCiphertext},
    } = event;
    const userId = qualified_from || {id: from, domain: ''};
    const messageBytes = Decoder.fromBase64(encodedCiphertext).asBytes;
    const decryptedData = await decryptMessage(messageBytes, userId, clientId);
    return {
      event,
      decryptedData: GenericMessage.decode(decryptedData),
    };
  } catch (error) {
    if (error instanceof DecryptionError) {
      return {event, decryptionError: error};
    }
    throw error;
  }
};

export {isOtrMessageAddEvent, handleOtrMessageAdd};
