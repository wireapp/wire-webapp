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

import {BackendEvent, ConversationMLSMessageAddEvent, CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {Decoder} from 'bazinga64';
import logdown from 'logdown';

import {GenericMessage} from '@wireapp/protocol-messaging';

import {EventHandlerResult} from '../../../../../common.types';
import {optionalToUint8Array} from '../../../../MLSService/MLSService';
import {EventHandlerParams} from '../../../EventHandler.types';

const isMLSMessageAddEvent = (event: BackendEvent): event is ConversationMLSMessageAddEvent =>
  event.type === CONVERSATION_EVENT.MLS_MESSAGE_ADD;

interface HandleMLSMessageAddParams extends EventHandlerParams {
  event: ConversationMLSMessageAddEvent;
  logger: logdown.Logger;
}
const handleMLSMessageAdd = async ({mlsService, event, logger}: HandleMLSMessageAddParams): EventHandlerResult => {
  const encryptedData = Decoder.fromBase64(event.data).asBytes;

  const groupId = await mlsService.getGroupIdFromConversationId(
    event.qualified_conversation ?? {id: event.conversation, domain: ''},
    event.subconv,
  );
  const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

  const {
    proposals,
    commitDelay,
    message,
    senderClientId: encodedSenderClientId,
  } = await mlsService.decryptMessage(groupIdBytes, encryptedData);

  if (encodedSenderClientId) {
    const decoder = new TextDecoder();
    const senderClientId = decoder.decode(optionalToUint8Array(encodedSenderClientId));
    event.senderClientId = senderClientId;
  }

  // Check if the message includes proposals
  if (typeof commitDelay === 'number' || proposals.length > 0) {
    // we are dealing with a proposal, add a task to process this proposal later on
    // Those proposals are stored inside of coreCrypto and will be handled after a timeout
    await mlsService.handlePendingProposals({
      groupId,
      delayInMs: commitDelay ?? 0,
      eventTime: event.time,
    });
    // This is not a text message, there is nothing more to do
    return;
  }

  if (!message) {
    const newEpoch = await mlsService.getEpoch(groupIdBytes);
    logger.log(`Received commit message for group "${groupId}". New epoch is "${newEpoch}"`);
    return;
  }
  const decryptedData = GenericMessage.decode(message);
  return {
    event,
    decryptedData,
  };
};

export {isMLSMessageAddEvent, handleMLSMessageAdd};
