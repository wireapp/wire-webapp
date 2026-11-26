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

import {noop} from 'noop-esm';

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import type {Kind, OperationState, Outbox, PerformOutcome} from '../../../outbox';

import {createPingKind} from './createPingKind';
import type {PingPayload} from './payloads';
import {createSendingPermission} from './sendingPermission';
import {
  createFakeMessageOutboxPort,
  declinedResult,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
import {pingPayload, viewOf} from './testing/payloadFactories';

const MISSING_CONVERSATION = {id: 'gone', domain: 'wire.test'};

function flush(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

type Context = FakeMessageOutbox & {
  kind: Kind<PingPayload>;
  perform: (payload: PingPayload) => Promise<PerformOutcome>;
  changed: (payload: PingPayload, state: OperationState) => Promise<void>;
};

function setup(): Context {
  const fake: FakeMessageOutbox = createFakeMessageOutboxPort(flush);
  const kind = createPingKind(fake.port, createSendingPermission({} as Outbox, fake.port));
  return {
    ...fake,
    kind,
    perform: (payload: PingPayload) => {
      return kind.perform(viewOf('ping', payload), new AbortController().signal);
    },
    changed: async (payload: PingPayload, state: OperationState) => {
      kind.onChanged?.(viewOf('ping', payload, {state}));
      await flush();
    },
  };
}

describe('the ping kind', () => {
  it('is configured for a ping that is pointless when late, and that carries on past a given up ping', () => {
    const {kind} = setup();

    expect(kind).toMatchObject({
      name: 'ping',
      maxAttempts: 3,
      whenGivenUp: 'drop',
      laneWhenGivenUp: 'continues',
      expiresAfterMilliseconds: 60_000,
      performTimeoutMilliseconds: 10_000,
    });
  });

  describe('perform', () => {
    it('sends a ping with the id it was shown with, and answers succeeded', async () => {
      const {perform, port, conversation} = setup();

      await expect(perform(pingPayload())).resolves.toEqual({type: 'attempt-succeeded'});

      expect(port.buildPing).toHaveBeenCalledWith(conversation, 'ping-1');
      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        syncTimestamp: true,
      });
      expect(port.sendToBackend.mock.calls[0][0].messageId).toBe('ping-1');
    });

    it('sends only after the ping is shown', async () => {
      const {perform, port} = setup();
      let shown: () => void = noop;
      port.whenShown.mockReturnValue(
        new Promise<void>(resolve => {
          shown = resolve;
        }),
      );

      const performing = perform(pingPayload());
      await flush();
      expect(port.whenShown).toHaveBeenCalledWith('ping-1');
      expect(port.sendToBackend).not.toHaveBeenCalled();

      shown();
      await performing;
      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
    });

    it('answers attempt-failed when it needs a retry', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(pingPayload())).resolves.toEqual({type: 'attempt-failed'});
    });

    it.each([
      ['a decline', declinedResult()],
      ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400)],
      ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404)],
      ['a removal', new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403)],
    ])('answers dropped for %s', async (_case, sendResult) => {
      const {perform, port} = setup();
      if (sendResult instanceof Error) {
        port.sendToBackend.mockRejectedValue(sendResult);
      } else {
        port.sendToBackend.mockResolvedValue(sendResult);
      }

      await expect(perform(pingPayload())).resolves.toEqual({type: 'operation-dropped'});
    });

    it('answers dropped for a conversation that is unknown', async () => {
      const {perform, port} = setup();

      await expect(perform(pingPayload({conversationId: MISSING_CONVERSATION}))).resolves.toEqual({
        type: 'operation-dropped',
      });

      expect(port.sendToBackend).not.toHaveBeenCalled();
    });
  });

  describe('onChanged', () => {
    it('removes the ping from the conversation when it is dropped, and tolerates repeats', async () => {
      const {changed, port, conversation} = setup();

      await changed(pingPayload(), 'dropped');
      await changed(pingPayload(), 'dropped');

      expect(port.deleteMessage).toHaveBeenCalledTimes(2);
      expect(port.deleteMessage).toHaveBeenCalledWith(conversation, 'ping-1');
    });

    it.each(['queued', 'in-progress', 'succeeded', 'dead-lettered'] as const)('does nothing when it is %s', async state => {
      const {changed, port} = setup();

      await changed(pingPayload(), state);

      expect(port.deleteMessage).not.toHaveBeenCalled();
    });

    it('does nothing for a conversation that is unknown', async () => {
      const {changed, port} = setup();

      await changed(pingPayload({conversationId: MISSING_CONVERSATION}), 'dropped');

      expect(port.deleteMessage).not.toHaveBeenCalled();
    });
  });

  it('refuses payloads of another kind', () => {
    const {kind} = setup();

    expect(() => {return kind.parsePayload({type: 'text'})}).toThrow();
    expect(kind.parsePayload(pingPayload())).toEqual(pingPayload());
  });
});
