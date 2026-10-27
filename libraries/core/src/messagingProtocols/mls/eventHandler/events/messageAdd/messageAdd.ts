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
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {Decoder} from 'bazinga64';

import {LogFactory, TimeUtil} from '@wireapp/commons';
import {BufferedDecryptedMessage, ClientId, ConversationId, DecryptedMessage} from '@wireapp/core-crypto';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {queueProposal} from './incomingProposalsQueue';

import {HandledEventPayload} from '../../../../../notification';
import {MLSService} from '../../../mlsService/mlsService';

const logger = LogFactory.getLogger('@wireapp/core/mls/messageAdd');

interface HandleMLSMessageAddParams {
  event: ConversationMLSMessageAddEvent;
  groupId: string;
  mlsService: MLSService;
  qualifiedConversationId: QualifiedId;
}

type PlaintextMessage = {
  plaintext: Uint8Array;
  senderClientId: ClientId;
};

const createHandledPayload = (
  event: ConversationMLSMessageAddEvent,
  {plaintext, senderClientId}: PlaintextMessage,
): HandledEventPayload => {
  const decodedSenderClientId = new TextDecoder().decode(senderClientId.copyBytes());

  return {
    event: {...event, senderClientId: decodedSenderClientId},
    decryptedData: GenericMessage.decode(plaintext),
  };
};

const scheduleProposal = ({
  delay,
  event,
  groupId,
  mlsService,
}: {
  delay?: bigint;
  event: ConversationMLSMessageAddEvent;
  groupId: string;
  mlsService: MLSService;
}): void => {
  if (delay === undefined) {
    return;
  }

  queueProposal(() => {
    return mlsService.handlePendingProposals({
      groupId,
      delayInMs: Number(delay) * TimeUtil.TimeInMillis.SECOND,
      eventTime: event.time,
    });
  }).catch((error: unknown) => {
    logger.error('Failed to process proposal:', error);
  });
};

const handleBufferedMessage = (
  bufferedMessage: BufferedDecryptedMessage,
  params: Pick<HandleMLSMessageAddParams, 'event' | 'groupId' | 'mlsService'>,
): HandledEventPayload | null => {
  if (BufferedDecryptedMessage.Proposal.instanceOf(bufferedMessage)) {
    scheduleProposal({...params, delay: bufferedMessage.inner.delay});
    return null;
  }

  if (
    BufferedDecryptedMessage.ApplicationMessage.instanceOf(bufferedMessage) ||
    BufferedDecryptedMessage.Transient.instanceOf(bufferedMessage) ||
    BufferedDecryptedMessage.TransientTargeted.instanceOf(bufferedMessage) ||
    BufferedDecryptedMessage.PersistedTargeted.instanceOf(bufferedMessage)
  ) {
    return createHandledPayload(params.event, bufferedMessage.inner);
  }

  return null;
};

const handleDecryptedMessage = (
  decryptedMessage: DecryptedMessage,
  params: Pick<HandleMLSMessageAddParams, 'event' | 'groupId' | 'mlsService'>,
): HandledEventPayload[] => {
  if (DecryptedMessage.Commit.instanceOf(decryptedMessage)) {
    return (decryptedMessage.inner.bufferedMessages ?? []).flatMap(bufferedMessage => {
      const payload = handleBufferedMessage(bufferedMessage, params);
      return payload === null ? [] : [payload];
    });
  }
  if (DecryptedMessage.Proposal.instanceOf(decryptedMessage)) {
    scheduleProposal({...params, delay: decryptedMessage.inner.delay});
    return [];
  }

  if (
    DecryptedMessage.ApplicationMessage.instanceOf(decryptedMessage) ||
    DecryptedMessage.Transient.instanceOf(decryptedMessage) ||
    DecryptedMessage.TransientTargeted.instanceOf(decryptedMessage) ||
    DecryptedMessage.PersistedTargeted.instanceOf(decryptedMessage)
  ) {
    return [createHandledPayload(params.event, decryptedMessage.inner)];
  }

  return [];
};

export const handleMLSMessageAdd = async ({
  event,
  groupId,
  mlsService,
  qualifiedConversationId,
}: HandleMLSMessageAddParams): Promise<HandledEventPayload[]> => {
  const encryptedData = Decoder.fromBase64(event.data).asBytes;

  const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

  // Helpful for correlating decrypt failures with rejoin/epoch transitions.
  const coreCryptoEpochNumber = await mlsService.getSafeEpoch(groupId);
  logger.info('Decrypting MLS message-add payload', {
    qualifiedConversationId,
    groupId,
    coreCryptoEpochNumber: coreCryptoEpochNumber.match({
      Ok: epoch => {
        return epoch;
      },
      Err: error => {
        return error;
      },
    }),
    eventTime: event.time,
  });

  const decryptedMessage = await mlsService.decryptMessage(
    new ConversationId(groupIdBytes),
    encryptedData,
    qualifiedConversationId,
  );

  if (decryptedMessage === undefined) {
    return [];
  }

  return handleDecryptedMessage(decryptedMessage, {event, groupId, mlsService});
};
