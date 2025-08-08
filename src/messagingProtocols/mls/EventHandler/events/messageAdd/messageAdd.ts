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

import {ConversationMLSMessageAddEvent} from '@wireapp/api-client/lib/event';
import {Decoder} from 'bazinga64';

import {LogFactory} from '@wireapp/commons';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {queueProposal} from './IncomingProposalsQueue';

import {HandledEventPayload} from '../../../../../notification';
import {MLSService, optionalToUint8Array} from '../../../MLSService/MLSService';

const logger = LogFactory.getLogger('@wireapp/core/mls/messageAdd');

interface HandleMLSMessageAddParams {
  event: ConversationMLSMessageAddEvent;
  groupId: string;
  mlsService: MLSService;
}

export const handleMLSMessageAdd = async ({
  event,
  groupId,
  mlsService,
}: HandleMLSMessageAddParams): Promise<HandledEventPayload | null> => {
  const encryptedData = Decoder.fromBase64(event.data).asBytes;

  const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

  const decryptedMessage = await mlsService.decryptMessage(groupIdBytes, encryptedData);

  if (!decryptedMessage) {
    // If the message is not decrypted, we return null
    return null;
  }

  const {message, commitDelay, senderClientId: encodedSenderClientId} = decryptedMessage;

  if (encodedSenderClientId) {
    const decoder = new TextDecoder();
    const senderClientId = decoder.decode(optionalToUint8Array(encodedSenderClientId));
    event.senderClientId = senderClientId;
  }

  // Check if the message includes proposals
  if (typeof commitDelay === 'number') {
    queueProposal(async () => {
      // we are dealing with a proposal, add a task to process this proposal later on
      // Those proposals are stored inside of coreCrypto and will be handled after a timeout
      await mlsService.handlePendingProposals({
        groupId,
        delayInMs: commitDelay ?? 0,
        eventTime: event.time,
      });
    }).catch(error => {
      logger.error('Failed to process proposal:', error);
    });
  }

  return message ? {event, decryptedData: GenericMessage.decode(message)} : null;
};
