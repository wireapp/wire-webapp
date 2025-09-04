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

import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import {Decoder} from 'bazinga64';

import {LogFactory} from '@wireapp/commons';
import {ClientAction, GenericMessage} from '@wireapp/protocol-messaging';

import {GenericMessageType} from '../../../../../conversation';
import {DecryptionError} from '../../../../../errors/DecryptionError';
import {HandledEventPayload} from '../../../../../notification';
import {ProteusService} from '../../../ProteusService';

interface HandleOtrMessageAddParams {
  event: ConversationOtrMessageAddEvent;
  proteusService: ProteusService;
}

const logger = LogFactory.getLogger('@wireapp/core/otrMessageAdd');

export const handleOtrMessageAdd = async ({
  event,
  proteusService,
}: HandleOtrMessageAddParams): Promise<HandledEventPayload> => {
  try {
    const {
      from,
      qualified_from,
      data: {sender: clientId, text: encodedCiphertext},
    } = event;
    const userId = qualified_from || {id: from, domain: ''};
    const messageBytes = Decoder.fromBase64(encodedCiphertext).asBytes;
    const now = Date.now();
    logger.info('Decrypting OTR message', {userId, clientId, event});
    const decryptedData = await proteusService.decrypt(messageBytes, userId, clientId);
    logger.info('OTR message decrypted successfully', {userId, clientId, event, duration: Date.now() - now});
    const decodedData = GenericMessage.decode(decryptedData);

    const isSessionReset = decodedData[GenericMessageType.CLIENT_ACTION] === ClientAction.RESET_SESSION;
    if (isSessionReset) {
      // If a session reset message was received, we need to count a consumed prekey (because the sender has created a new session from a new prekey)
      await proteusService.consumePrekey();
    }

    return {
      event,
      decryptedData: decodedData,
    };
  } catch (error) {
    logger.warn('Failed to decrypt OTR message', {event, error});
    if (error instanceof DecryptionError) {
      return {event, decryptionError: error};
    }
    throw error;
  }
};
