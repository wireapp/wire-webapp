/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CONVERSATION_EVENT, ConversationMLSMessageAddEvent} from '@wireapp/api-client/lib/event';
import {task} from 'true-myth';

import {
  BufferedDecryptedMessage,
  CredentialType,
  DecryptedMessage,
  DeviceStatus,
  WireIdentity,
} from '@wireapp/core-crypto';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {handleMLSMessageAdd} from './messageAdd';
import {pauseProposalProcessing, resumeProposalProcessing} from './incomingProposalsQueue';

import {MLSService} from '../../../mlsService/mlsService';
import {createMLSClientId} from '../../../utils/mlsId';

const qualifiedConversationId = {id: 'conversation-id', domain: 'example.com'};
const senderUserId = 'b7f6d875-e792-4fca-9b82-700df90568f2';
const senderClientId = createMLSClientId({id: senderUserId, domain: 'example.com'}, '0000000000000001');
const encodedSenderClientId = `${senderUserId}:1@example.com`;
const secondarySenderUserId = 'bb676e96-c424-415b-a115-1e31f29d55a0';
const secondarySenderClientId = createMLSClientId(
  {id: secondarySenderUserId, domain: 'example.com'},
  '0000000000000002',
);
const encodedSecondarySenderClientId = `${secondarySenderUserId}:2@example.com`;
const identity: WireIdentity = {
  credentialType: CredentialType.Basic,
  status: DeviceStatus.Valid,
  thumbprint: 'thumbprint',
};

const createPlaintext = (messageId: string): Uint8Array => {
  return GenericMessage.encode(GenericMessage.create({messageId})).finish();
};

const createEvent = (): ConversationMLSMessageAddEvent => {
  return {
    conversation: qualifiedConversationId.id,
    data: '',
    from: senderUserId,
    qualified_conversation: qualifiedConversationId,
    senderClientId: '',
    time: '2026-01-01T00:00:00.000Z',
    type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
  };
};

const createMLSService = (decryptedMessage: DecryptedMessage): jest.Mocked<MLSService> => {
  return {
    decryptMessage: jest.fn().mockResolvedValue(decryptedMessage),
    getSafeEpoch: jest.fn(() => task.resolve(1)),
    handlePendingProposals: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<MLSService>;
};

describe('handleMLSMessageAdd', () => {
  afterEach(() => {
    pauseProposalProcessing();
  });

  it.each([
    ['ApplicationMessage', DecryptedMessage.ApplicationMessage.new],
    ['Transient', DecryptedMessage.Transient.new],
    ['TransientTargeted', DecryptedMessage.TransientTargeted.new],
    ['PersistedTargeted', DecryptedMessage.PersistedTargeted.new],
  ] as const)('handles the V11 %s variant as an application payload', async (_variant, createMessage) => {
    const plaintext = createPlaintext('message-id');
    const mlsService = createMLSService(createMessage({identity, plaintext, senderClientId}));

    const payloads = await handleMLSMessageAdd({
      event: createEvent(),
      groupId: 'Z3JvdXA=',
      mlsService,
      qualifiedConversationId,
    });

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.event).toEqual(expect.objectContaining({senderClientId: encodedSenderClientId}));
    expect(payloads[0]?.decryptedData?.messageId).toBe('message-id');
  });

  it('handles the V11 Proposal variant by scheduling its delay in milliseconds', async () => {
    resumeProposalProcessing();
    const proposalHandled = Promise.withResolvers<void>();
    const mlsService = createMLSService(DecryptedMessage.Proposal.new({delay: 2n, identity}));
    mlsService.handlePendingProposals.mockImplementation(params => {
      expect(params).toEqual({
        delayInMs: 2_000,
        eventTime: '2026-01-01T00:00:00.000Z',
        groupId: 'Z3JvdXA=',
      });
      proposalHandled.resolve();
      return Promise.resolve();
    });

    const payloads = await handleMLSMessageAdd({
      event: createEvent(),
      groupId: 'Z3JvdXA=',
      mlsService,
      qualifiedConversationId,
    });
    await proposalHandled.promise;

    expect(payloads).toEqual([]);
    expect(mlsService.handlePendingProposals).toHaveBeenCalledTimes(1);
  });

  it('returns buffered plaintext variants in order and schedules buffered proposals', async () => {
    resumeProposalProcessing();
    const proposalHandled = Promise.withResolvers<void>();
    const applicationPlaintext = createPlaintext('buffered-application');
    const transientPlaintext = createPlaintext('buffered-transient');
    const targetedPlaintext = createPlaintext('buffered-targeted');
    const persistedTargetedPlaintext = createPlaintext('buffered-persisted-targeted');
    const bufferedMessages = [
      BufferedDecryptedMessage.ApplicationMessage.new({
        identity,
        plaintext: applicationPlaintext,
        senderClientId,
      }),
      BufferedDecryptedMessage.Commit.new({identity, isActive: true}),
      BufferedDecryptedMessage.Transient.new({
        identity,
        plaintext: transientPlaintext,
        senderClientId: secondarySenderClientId,
      }),
      BufferedDecryptedMessage.Proposal.new({delay: 3n, identity}),
      BufferedDecryptedMessage.TransientTargeted.new({
        identity,
        plaintext: targetedPlaintext,
        senderClientId,
      }),
      BufferedDecryptedMessage.PersistedTargeted.new({
        identity,
        plaintext: persistedTargetedPlaintext,
        senderClientId: secondarySenderClientId,
      }),
    ];
    const mlsService = createMLSService(DecryptedMessage.Commit.new({bufferedMessages, identity, isActive: true}));
    mlsService.handlePendingProposals.mockImplementation(() => {
      proposalHandled.resolve();
      return Promise.resolve();
    });

    const payloads = await handleMLSMessageAdd({
      event: createEvent(),
      groupId: 'Z3JvdXA=',
      mlsService,
      qualifiedConversationId,
    });
    await proposalHandled.promise;

    expect(payloads.map(payload => payload.decryptedData?.messageId)).toEqual([
      'buffered-application',
      'buffered-transient',
      'buffered-targeted',
      'buffered-persisted-targeted',
    ]);
    expect(payloads.map(payload => payload.event)).toEqual([
      expect.objectContaining({senderClientId: encodedSenderClientId}),
      expect.objectContaining({senderClientId: encodedSecondarySenderClientId}),
      expect.objectContaining({senderClientId: encodedSenderClientId}),
      expect.objectContaining({senderClientId: encodedSecondarySenderClientId}),
    ]);
    expect(mlsService.handlePendingProposals).toHaveBeenCalledWith({
      delayInMs: 3_000,
      eventTime: '2026-01-01T00:00:00.000Z',
      groupId: 'Z3JvdXA=',
    });
  });

  it('handles a Commit without buffered application data as an empty payload list', async () => {
    const mlsService = createMLSService(DecryptedMessage.Commit.new({identity, isActive: false}));

    await expect(
      handleMLSMessageAdd({
        event: createEvent(),
        groupId: 'Z3JvdXA=',
        mlsService,
        qualifiedConversationId,
      }),
    ).resolves.toEqual([]);
  });
});
