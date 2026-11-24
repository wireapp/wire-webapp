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

import {asyncNoop, noop} from 'noop-esm';

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import type {Kind, Outbox, PerformOutcome} from '../../../outbox';

import {createMessageChangeKind} from './createMessageChangeKind';
import type {MessageChangePayload} from './payloads';
import {createSendingPermission} from './sendingPermission';
import {
  createFakeMessageOutboxPort,
  declinedResult,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
import {deletePayload, editPayload, hidePayload, reactionPayload, viewOf} from './testing/payloadFactories';

const MISSING_CONVERSATION = {id: 'gone', domain: 'wire.test'};

type Context = FakeMessageOutbox & {
  kind: Kind<MessageChangePayload>;
  perform: (payload: MessageChangePayload) => Promise<PerformOutcome>;
};

function setup(): Context {
  const fake: FakeMessageOutbox = createFakeMessageOutboxPort(asyncNoop);
  const kind = createMessageChangeKind(fake.port, createSendingPermission({} as Outbox, fake.port));
  return {
    ...fake,
    kind,
    perform: (payload: MessageChangePayload) => {
      return kind.perform(viewOf('message-change', payload), new AbortController().signal);
    },
  };
}

const variants: [string, MessageChangePayload][] = [
  ['reaction', reactionPayload()],
  ['edit', editPayload()],
  ['delete', deletePayload({recipients: [{id: 'someone', domain: 'wire.test'}]})],
  ['hide', hidePayload()],
];

describe('the message-change kind', () => {
  it('is configured for changes that are forgotten when they cannot go out, in a lane of their own', () => {
    const {kind} = setup();

    expect(kind).toMatchObject({
      name: 'message-change',
      maxAttempts: 1_000,
      whenGivenUp: 'drop',
      laneWhenGivenUp: 'continues',
      expiresAfterMilliseconds: 7 * 24 * 60 * 60 * 1000,
      performTimeoutMilliseconds: 2 * 60 * 1000,
    });
  });

  describe.each(variants)('perform of a %s', (_name, payload) => {
    it('answers succeeded when it is sent', async () => {
      const {perform, port} = setup();

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-succeeded'});

      expect(port.sendToBackend).toHaveBeenCalled();
    });

    it('answers attempt-failed when it needs a retry', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(payload)).resolves.toEqual({type: 'attempt-failed'});
    });

    it.each([
      ['a decline', declinedResult()],
      ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400)],
      ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404)],
      ['a removal', new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403)],
    ])('answers dropped for %s, and marks nothing as failed', async (_case, sendResult) => {
      const {perform, port} = setup();
      if (sendResult instanceof Error) {
        port.sendToBackend.mockRejectedValue(sendResult);
      } else {
        port.sendToBackend.mockResolvedValue(sendResult);
      }

      await expect(perform(payload)).resolves.toEqual({type: 'operation-dropped'});

      expect(port.markFailed).not.toHaveBeenCalled();
    });
  });

  it.each(variants.filter(([name]) => {return name !== 'hide'}))(
    'answers dropped for a %s of an unknown conversation',
    async (_name, payload) => {
      const {perform, port} = setup();

      await expect(perform({...payload, conversationId: MISSING_CONVERSATION})).resolves.toEqual({
        type: 'operation-dropped',
      });

      expect(port.sendToBackend).not.toHaveBeenCalled();
    },
  );

  it('sends a change only after the message it targets is shown', async () => {
    const {perform, port} = setup();
    let shown: () => void = noop;
    port.whenShown.mockReturnValue(
      new Promise<void>(resolve => {
        shown = resolve;
      }),
    );
    const payload = reactionPayload();

    const performing = perform(payload);
    await asyncNoop();
    expect(port.whenShown).toHaveBeenCalledWith(payload.targetMessageId);
    expect(port.sendToBackend).not.toHaveBeenCalled();

    shown();
    await performing;
    expect(port.sendToBackend).toHaveBeenCalledTimes(1);
  });

  it('sends a delete to the recipients it was queued with', async () => {
    const {perform, port, conversation} = setup();

    await perform(deletePayload({recipients: [{id: 'someone', domain: 'wire.test'}]}));

    expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
      recipients: [{id: 'someone', domain: 'wire.test'}],
      skipInjection: true,
      targetMode: expect.anything(),
    });
    expect(port.recipientsOf).not.toHaveBeenCalled();
  });

  it('sends a hide to every self conversation, whatever the target conversation is', async () => {
    const {perform, port, selfConversation} = setup();

    await perform({...hidePayload(), conversationId: MISSING_CONVERSATION});

    expect(port.sendToBackend).toHaveBeenCalledTimes(1);
    expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), selfConversation, {skipInjection: true});
  });

  it('asks for a retry when there is no self conversation to hide in yet', async () => {
    const {perform, port} = setup();
    port.selfConversations.mockReturnValue([]);

    await expect(perform(hidePayload())).resolves.toEqual({type: 'attempt-failed'});
  });

  it('sends a reaction as the final state, without showing anything', async () => {
    const {perform, port, conversation} = setup();

    await perform(reactionPayload());

    expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {skipInjection: true});
  });

  it('sends an edit with its link preview', async () => {
    const {perform, port, conversation} = setup();

    await perform(editPayload());

    expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {syncTimestamp: false});
    expect(port.sendLinkPreview).toHaveBeenCalled();
  });

  it('refuses payloads of another kind', () => {
    const {kind} = setup();

    expect(() => {return kind.parsePayload({type: 'text'})}).toThrow();
    expect(kind.parsePayload(hidePayload())).toEqual(hidePayload());
  });
});
