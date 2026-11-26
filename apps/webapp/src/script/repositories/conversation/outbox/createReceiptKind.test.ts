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

import {asyncNoop} from 'noop-esm';

import {Confirmation} from '@wireapp/protocol-messaging';

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import {MessageTargetMode} from '../../../core/conversation';
import type {Kind, Outbox, PerformOutcome} from '../../../outbox';

import {createReceiptKind} from './createReceiptKind';
import type {ReceiptPayload} from './payloads';
import {createSendingPermission} from './sendingPermission';
import {
  createFakeMessageOutboxPort,
  declinedResult,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
import {confirmationPayload, lastReadPayload, viewOf} from './testing/payloadFactories';

const MISSING_CONVERSATION = {id: 'gone', domain: 'wire.test'};

type Context = FakeMessageOutbox & {
  kind: Kind<ReceiptPayload>;
  perform: (payload: ReceiptPayload) => Promise<PerformOutcome>;
};

function setup(): Context {
  const fake: FakeMessageOutbox = createFakeMessageOutboxPort(asyncNoop);
  const kind = createReceiptKind(fake.port, createSendingPermission({} as Outbox, fake.port));
  return {
    ...fake,
    kind,
    perform: (payload: ReceiptPayload) => {
      return kind.perform(viewOf('receipt', payload), new AbortController().signal);
    },
  };
}

const sentToSelf: [string, ReceiptPayload][] = [
  ['last read', lastReadPayload(10)],
  ['cleared', {type: 'cleared', conversationId: {id: 'conversation-1', domain: 'wire.test'}, timestamp: 10}],
  ['data transfer', {type: 'data-transfer', countlyId: 'countly'}],
];

describe('the receipt kind', () => {
  it('is configured for receipts that are forgotten when they cannot go out', () => {
    const {kind} = setup();

    expect(kind).toMatchObject({
      name: 'receipt',
      maxAttempts: 100,
      whenGivenUp: 'drop',
      laneWhenGivenUp: 'continues',
      expiresAfterMilliseconds: 7 * 24 * 60 * 60 * 1000,
      performTimeoutMilliseconds: 60 * 1000,
    });
  });

  describe('perform of a confirmation', () => {
    it('sends it to the sender only, silently and without showing it', async () => {
      const {perform, port, conversation} = setup();

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'attempt-succeeded'});

      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        nativePush: false,
        recipients: [{id: 'sender', domain: 'wire.test'}],
        silentDegradationWarning: true,
        skipInjection: true,
        targetMode: MessageTargetMode.USERS,
      });
    });

    it('sends the first message id and the others of a batch', async () => {
      const {perform, port} = setup();

      await perform(confirmationPayload({messageIds: ['first', 'second', 'third']}));

      const [message] = port.sendToBackend.mock.calls[0];
      expect(message.confirmation?.firstMessageId).toBe('first');
      expect(message.confirmation?.moreMessageIds).toEqual(['second', 'third']);
    });

    it('sends it once more to the known devices when the first send was declined', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockResolvedValueOnce(declinedResult());

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'attempt-succeeded'});

      expect(port.sendToBackend).toHaveBeenCalledTimes(2);
      expect(port.sendToBackend.mock.calls[1][2]).toMatchObject({targetMode: MessageTargetMode.USERS_CLIENTS});
    });

    it('answers dropped when both sends were declined', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockResolvedValue(declinedResult());

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'operation-dropped'});

      expect(port.sendToBackend).toHaveBeenCalledTimes(2);
    });

    it('drops a read receipt when read receipts are off now', async () => {
      const {perform, port} = setup();
      port.supportsReadReceipts.mockReturnValue(false);

      await expect(
        perform(confirmationPayload({confirmationType: Confirmation.Type.READ})),
      ).resolves.toEqual({type: 'operation-dropped'});

      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('sends a delivery receipt whatever read receipts say', async () => {
      const {perform, port} = setup();
      port.supportsReadReceipts.mockReturnValue(false);

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'attempt-succeeded'});
    });

    it('answers dropped for a conversation that is unknown', async () => {
      const {perform, port} = setup();

      await expect(perform(confirmationPayload({conversationId: MISSING_CONVERSATION}))).resolves.toEqual({
        type: 'operation-dropped',
      });

      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('answers attempt-failed when it needs a retry', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'attempt-failed'});
    });

    it.each([
      ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400)],
      ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404)],
      ['a removal', new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403)],
    ])('answers dropped for %s', async (_case, error) => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(error);

      await expect(perform(confirmationPayload())).resolves.toEqual({type: 'operation-dropped'});
    });
  });

  describe.each(sentToSelf)('perform of %s', (_name, payload) => {
    it('sends it to every self conversation without showing it', async () => {
      const {perform, port, selfConversation} = setup();

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-succeeded'});

      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), selfConversation, {
        failFast: true,
        skipInjection: true,
      });
    });

    it('does not need the conversation it is about', async () => {
      const {perform, port} = setup();
      port.findConversation.mockReturnValue(undefined);

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-succeeded'});
    });

    it('asks for a retry when there is no self conversation yet', async () => {
      const {perform, port} = setup();
      port.selfConversations.mockReturnValue([]);

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-failed'});
    });

    it('answers attempt-failed when it needs a retry', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-failed'});
    });

    it('answers dropped when it is rejected', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400));

      await expect(perform(payload)).resolves.toEqual({type: 'operation-dropped'});
    });
  });

  it('sends the last read timestamp it was queued with', async () => {
    const {perform, port} = setup();

    await perform(lastReadPayload(42));

    const [message] = port.sendToBackend.mock.calls[0];
    expect(message.lastRead?.lastReadTimestamp?.toString()).toBe('42');
  });

  it('refuses payloads of another kind', () => {
    const {kind} = setup();

    expect(() => {return kind.parsePayload({type: 'hide'})}).toThrow();
    expect(() => {return kind.parsePayload({type: 'confirmation', messageIds: []})}).toThrow();
    expect(kind.parsePayload(lastReadPayload(1))).toEqual(lastReadPayload(1));
  });
});
