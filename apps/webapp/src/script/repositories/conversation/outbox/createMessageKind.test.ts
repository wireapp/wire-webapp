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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {noop} from 'noop-esm';

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../../apiClient/http/networkError';
import {RequestCancellationError} from '../../../apiClient/user/userError';
import type {Kind, OperationState, Outbox, PerformOutcome} from '../../../outbox';

import {createMessageKind} from './createMessageKind';
import type {MessagePayload} from './payloads';
import {createSendingPermission} from './sendingPermission';
import {
  CONVERSATION_ID,
  createFakeMessageOutboxPort,
  declinedResult,
  sendingRecord,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
import {
  assetPayload,
  deletePayload,
  editPayload,
  reactionPayload,
  textPayload,
  viewOf,
} from './testing/payloadFactories';

const MISSING_CONVERSATION = {id: 'gone', domain: 'wire.test'};

function flush(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

type Context = FakeMessageOutbox & {
  release: jest.Mock;
  kind: Kind<MessagePayload>;
  perform: (payload: MessagePayload, signal?: AbortSignal) => Promise<PerformOutcome>;
  changed: (payload: MessagePayload, state: OperationState, queuedAt?: number) => Promise<void>;
};

function setup(): Context {
  const fake: FakeMessageOutbox = createFakeMessageOutboxPort(flush);
  const release = jest.fn(async () => {
    return {type: 'operation-released'};
  });
  const outbox = {release, isStarted: () => {return true}} as unknown as Outbox;
  const kind = createMessageKind(fake.port, createSendingPermission(outbox, fake.port));

  return {
    ...fake,
    release,
    kind,
    perform: (payload: MessagePayload, signal = new AbortController().signal): Promise<PerformOutcome> => {
      return kind.perform(viewOf('message', payload), signal);
    },
    changed: async (payload: MessagePayload, state: OperationState, queuedAt = 0): Promise<void> => {
      kind.onChanged?.(viewOf('message', payload, {state, queuedAt}));
      await flush();
    },
  };
}

const succeeded = {type: 'attempt-succeeded'};
const failed = {type: 'attempt-failed'};
const dropped = {type: 'operation-dropped'};
const deadLettered = {type: 'operation-dead-lettered'};
const held = {type: 'operation-held'};

describe('the message kind', () => {
  it('is configured for messages that only an expiry or a rejection ends, and that take their lane with them', () => {
    const {kind} = setup();

    expect(kind).toMatchObject({
      name: 'message',
      maxAttempts: 1_000,
      whenGivenUp: 'dead-letter',
      laneWhenGivenUp: 'follows',
      expiresAfterMilliseconds: 7 * 24 * 60 * 60 * 1000,
      performTimeoutMilliseconds: 2 * 60 * 1000,
    });
  });

  describe('perform of a text', () => {
    it('sends the built message with the server time and answers succeeded', async () => {
      const {perform, port, conversation} = setup();

      await expect(perform(textPayload())).resolves.toEqual(succeeded);

      expect(port.buildText).toHaveBeenCalledWith(conversation, textPayload());
      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        syncTimestamp: true,
      });
      expect(port.injectOptimistic).not.toHaveBeenCalled();
    });

    it('sends only after the message is shown', async () => {
      const {perform, port} = setup();
      let shown: () => void = noop;
      port.whenShown.mockReturnValue(
        new Promise<void>(resolve => {
          shown = resolve;
        }),
      );

      const performing = perform(textPayload());
      await flush();
      expect(port.whenShown).toHaveBeenCalledWith('message-1');
      expect(port.sendToBackend).not.toHaveBeenCalled();

      shown();
      await expect(performing).resolves.toEqual(succeeded);
      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
    });

    it('starts the link preview after the send, without waiting for it', async () => {
      const {perform, port, conversation} = setup();
      port.sendLinkPreview.mockReturnValue(new Promise(noop));

      await expect(perform(textPayload())).resolves.toEqual(succeeded);

      expect(port.sendLinkPreview).toHaveBeenCalledWith(conversation, expect.objectContaining({messageId: 'message-1'}));
    });

    it('answers succeeded when the link preview fails', async () => {
      const {perform, port} = setup();
      port.sendLinkPreview.mockRejectedValue(new Error('preview'));

      await expect(perform(textPayload())).resolves.toEqual(succeeded);
      await flush();
    });

    it('sends no link preview for a message that was not sent', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockResolvedValue(declinedResult());

      await perform(textPayload());

      expect(port.sendLinkPreview).not.toHaveBeenCalled();
    });

    it('answers dead-lettered and records the decline when the client mismatch handler declines', async () => {
      const {perform, port, records, conversation} = setup();
      records.set('message-1', sendingRecord());
      port.sendToBackend.mockResolvedValue(declinedResult());

      await expect(perform(textPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'declined',
        federation: false,
      });
    });

    it.each([
      ['a network error', new NetworkError('offline')],
      ['a 503', new BackendError('busy', BackendErrorLabel.SERVER_ERROR, 503)],
      ['a 429', new BackendError('slow down', BackendErrorLabel.SERVER_ERROR, 429)],
    ])('answers attempt-failed for %s, leaving the message as it is', async (_name, error) => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(error);

      await expect(perform(textPayload())).resolves.toEqual(failed);

      expect(port.markFailed).not.toHaveBeenCalled();
    });

    it('answers dead-lettered as removed when the backend does not know the conversation of a known one', async () => {
      const {perform, port, conversation} = setup();
      port.sendToBackend.mockRejectedValue(new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404));

      await expect(perform(textPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'removed',
        federation: false,
      });
    });

    it('answers dead-lettered as removed when the self user is not in the conversation any more', async () => {
      const {perform, port, conversation} = setup();
      port.sendToBackend.mockRejectedValue(new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403));

      await expect(perform(textPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'removed',
        federation: false,
      });
    });

    it('answers dead-lettered as rejected for any other error', async () => {
      const {perform, port, conversation} = setup();
      port.sendToBackend.mockRejectedValue(new BackendError('invalid', BackendErrorLabel.CLIENT_ERROR, 400));

      await expect(perform(textPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'rejected',
        federation: false,
      });
    });

    it('marks a federation error with the federation status', async () => {
      const {perform, port, conversation} = setup();
      port.sendToBackend.mockRejectedValue(new BackendError('remote', BackendErrorLabel.FEDERATION_REMOTE_ERROR, HTTP_STATUS.BAD_GATEWAY));

      await expect(perform(textPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'rejected',
        federation: true,
      });
    });

    it('answers dropped for a conversation that is unknown', async () => {
      const {perform, port} = setup();

      await expect(perform(textPayload({conversationId: MISSING_CONVERSATION}))).resolves.toEqual(dropped);

      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('lets an error of building the message reject, so that the outbox retries it', async () => {
      const {perform, port} = setup();
      port.buildText.mockRejectedValue(new Error('quote'));

      await expect(perform(textPayload())).rejects.toThrow('quote');
    });
  });

  describe('perform of an asset', () => {
    it('uploads, shows the uploaded asset, sends it and answers succeeded', async () => {
      const {perform, port, records, conversation} = setup();
      const file = new Blob(['bytes']);
      records.set('asset-1', sendingRecord({file}));
      const signal = new AbortController().signal;

      await expect(perform(assetPayload(), signal)).resolves.toEqual(succeeded);

      expect(port.uploadAsset).toHaveBeenCalledWith(conversation, assetPayload(), file, signal);
      expect(port.injectOptimistic).toHaveBeenCalledTimes(1);
      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        syncTimestamp: true,
      });
      const [uploadOrder] = port.uploadAsset.mock.invocationCallOrder;
      const [injectOrder] = port.injectOptimistic.mock.invocationCallOrder;
      const [sendOrder] = port.sendToBackend.mock.invocationCallOrder;
      expect(uploadOrder).toBeLessThan(injectOrder);
      expect(injectOrder).toBeLessThan(sendOrder);
    });

    it('skips the upload when an earlier attempt left its result on the record', async () => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes']), hasUploadResult: true}));

      await expect(perform(assetPayload())).resolves.toEqual(succeeded);

      expect(port.uploadAsset).not.toHaveBeenCalled();
      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
    });

    it('does not need the bytes once the upload result is on the record', async () => {
      const {perform, records} = setup();
      records.set('asset-1', sendingRecord({hasUploadResult: true}));

      await expect(perform(assetPayload())).resolves.toEqual(succeeded);
    });

    it('answers dead-lettered as rejected when there are no bytes and no upload', async () => {
      const {perform, port, records, conversation} = setup();
      records.set('asset-1', sendingRecord());

      await expect(perform(assetPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'asset-1', {
        reason: 'rejected',
        federation: false,
      });
    });

    it('answers dropped when the record is gone', async () => {
      const {perform, port} = setup();

      await expect(perform(assetPayload())).resolves.toEqual(dropped);

      expect(port.uploadAsset).not.toHaveBeenCalled();
    });

    it('answers dropped when the user cancelled the upload', async () => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes'])}));
      port.uploadAsset.mockRejectedValue(new RequestCancellationError('cancelled'));

      await expect(perform(assetPayload())).resolves.toEqual(dropped);

      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('answers attempt-failed when the upload fails for the network', async () => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes'])}));
      port.uploadAsset.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(assetPayload())).resolves.toEqual(failed);
    });

    it('answers attempt-failed, not dropped, when the attempt itself was aborted during the upload', async () => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes'])}));
      port.uploadAsset.mockRejectedValue(new RequestCancellationError('cancelled'));
      const controller = new AbortController();
      controller.abort();

      await expect(perform(assetPayload(), controller.signal)).resolves.toEqual(failed);
    });

    it('answers dead-lettered as rejected when the upload is refused', async () => {
      const {perform, port, records, conversation} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes'])}));
      port.uploadAsset.mockRejectedValue(new BackendError('too large', BackendErrorLabel.CLIENT_ERROR, 413));

      await expect(perform(assetPayload())).resolves.toEqual(deadLettered);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'asset-1', {
        reason: 'rejected',
        federation: false,
      });
    });

    it('answers dead-lettered when the upload result on the record can not be read', async () => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes'])}));
      port.buildAsset.mockResolvedValue(undefined);

      await expect(perform(assetPayload())).resolves.toEqual(deadLettered);
    });

    it.each([
      ['an error that needs a retry', new NetworkError('offline'), failed],
      ['a decline', declinedResult(), deadLettered],
      ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400), deadLettered],
      ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404), deadLettered],
    ])('answers for %s when sending', async (_name, sendResult, expected) => {
      const {perform, port, records} = setup();
      records.set('asset-1', sendingRecord({file: new Blob(['bytes']), hasUploadResult: true}));
      if (sendResult instanceof Error) {
        port.sendToBackend.mockRejectedValue(sendResult);
      } else {
        port.sendToBackend.mockResolvedValue(sendResult);
      }

      await expect(perform(assetPayload())).resolves.toEqual(expected);
    });

    it('answers dropped for a conversation that is unknown', async () => {
      const {perform} = setup();

      await expect(perform(assetPayload({conversationId: MISSING_CONVERSATION}))).resolves.toEqual(dropped);
    });
  });

  describe.each([
    ['reaction', reactionPayload()],
    ['edit', editPayload()],
    ['delete', deletePayload()],
  ] as const)('perform of a %s of a message that is still queued', (_name, payload) => {
    it('answers succeeded when it is sent', async () => {
      const {perform, port, conversation} = setup();

      await expect(perform(payload)).resolves.toEqual(succeeded);

      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, expect.any(Object));
    });

    it('answers attempt-failed when it needs a retry', async () => {
      const {perform, port} = setup();
      port.sendToBackend.mockRejectedValue(new NetworkError('offline'));

      await expect(perform(payload)).resolves.toEqual(failed);
    });

    it.each([
      ['a decline', declinedResult()],
      ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400)],
      ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404)],
      ['a removal', new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403)],
    ])('answers dropped and shows nothing for %s', async (_case, sendResult) => {
      const {perform, port} = setup();
      if (sendResult instanceof Error) {
        port.sendToBackend.mockRejectedValue(sendResult);
      } else {
        port.sendToBackend.mockResolvedValue(sendResult);
      }

      await expect(perform(payload)).resolves.toEqual(dropped);

      expect(port.markFailed).not.toHaveBeenCalled();
    });

    it('answers dropped for a conversation that is unknown', async () => {
      const {perform} = setup();

      await expect(perform({...payload, conversationId: MISSING_CONVERSATION})).resolves.toEqual(dropped);
    });

    it('does nothing when it changes', async () => {
      const {changed, port} = setup();

      await changed(payload, 'queued');
      await changed(payload, 'dead-lettered');
      await changed(payload, 'dropped');

      expect(port.findMessage).not.toHaveBeenCalled();
      expect(port.deleteMessage).not.toHaveBeenCalled();
      expect(port.markFailed).not.toHaveBeenCalled();
    });
  });

  describe('perform of an edit', () => {
    it('sends it without moving the message in time, and then sends the link preview', async () => {
      const {perform, port, conversation} = setup();

      await perform(editPayload());

      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        syncTimestamp: false,
      });
      expect(port.sendLinkPreview).toHaveBeenCalledWith(
        conversation,
        expect.objectContaining({messageId: 'edit-1', text: 'edited'}),
      );
    });
  });

  describe('perform of a delete', () => {
    it('sends it to the members of the conversation without showing anything', async () => {
      const {perform, port, conversation} = setup();

      await perform(deletePayload());

      expect(port.sendToBackend).toHaveBeenCalledWith(expect.anything(), conversation, {
        failFast: true,
        recipients: [{id: 'member', domain: 'wire.test'}],
        skipInjection: true,
        targetMode: expect.anything(),
      });
    });
  });

  describe.each([
    ['a text', textPayload()],
    ['an asset', assetPayload()],
  ])('perform of %s to a degraded conversation', (_name, payload) => {
    function degradedSetup(): Context {
      const context = setup();
      context.records.set(
        payload.type === 'text' ? 'message-1' : 'asset-1',
        sendingRecord({file: new Blob(['bytes']), hasUploadResult: true}),
      );
      context.degraded.add(context.conversation);
      return context;
    }
    const key = payload.type === 'text' ? 'message-1' : 'asset-1';

    it('holds the operation and asks the user once, without sending', async () => {
      const {perform, port, prompts} = degradedSetup();

      await expect(perform(payload)).resolves.toEqual(held);
      await expect(perform(payload)).resolves.toEqual(held);

      expect(prompts).toHaveLength(1);
      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('releases the operation when the user accepts, and the next attempt sends', async () => {
      const {perform, port, prompts, release} = degradedSetup();
      await perform(payload);

      await prompts[0].answer(true);

      expect(release).toHaveBeenCalledWith(key);
      expect(port.markFailed).not.toHaveBeenCalled();
      await expect(perform(payload)).resolves.toEqual(succeeded);
      expect(port.sendToBackend).toHaveBeenCalledTimes(1);
    });

    it('records the decline and releases the operation when the user declines, and the next attempt dead-letters', async () => {
      const {perform, port, prompts, release, records, conversation} = degradedSetup();
      await perform(payload);

      await prompts[0].answer(false);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, key, {reason: 'declined', federation: false});
      expect(release).toHaveBeenCalledWith(key);
      expect(records.get(key)).toMatchObject({isFailed: true, failedReason: 'declined'});
      await expect(perform(payload)).resolves.toEqual(deadLettered);
      expect(port.sendToBackend).not.toHaveBeenCalled();
    });

    it('treats a prompt that fails as a decline', async () => {
      const {perform, port, release} = degradedSetup();
      port.requestSendingPermission.mockRejectedValue(new Error('modal'));

      await perform(payload);
      await flush();

      expect(port.markFailed).toHaveBeenCalledWith(
        expect.anything(),
        key,
        expect.objectContaining({reason: 'declined'}),
      );
      expect(release).toHaveBeenCalledWith(key);
    });

    it('asks again for a conversation that is degraded again', async () => {
      const {perform, prompts, degraded, conversation} = degradedSetup();
      await perform(payload);
      await prompts[0].answer(true);

      degraded.add(conversation);

      await expect(perform(payload)).resolves.toEqual(held);
      expect(prompts).toHaveLength(2);
    });
  });

  describe('onChanged of a text', () => {
    it.each(['queued', 'on-hold', 'in-progress'] as const)(
      'shows a message that is missing when it is %s, once even when called again',
      async state => {
        const {changed, port, conversation, records} = setup();
        port.injectOptimistic.mockImplementation(async () => {
          records.set('message-1', sendingRecord());
          return true;
        });

        await changed(textPayload(), state);
        await changed(textPayload(), state);

        expect(port.injectOptimistic).toHaveBeenCalledTimes(1);
        expect(port.injectOptimistic).toHaveBeenCalledWith(expect.anything(), conversation);
      },
    );

    it('does not show a message that its enqueue is still showing', async () => {
      const {changed, port, records} = setup();
      let shown: () => void = noop;
      port.whenShown.mockReturnValue(
        new Promise<void>(resolve => {
          shown = resolve;
        }),
      );

      await changed(textPayload(), 'queued');
      expect(port.whenShown).toHaveBeenCalledWith('message-1');
      expect(port.injectOptimistic).not.toHaveBeenCalled();

      records.set('message-1', sendingRecord());
      shown();
      await flush();

      expect(port.injectOptimistic).not.toHaveBeenCalled();
    });

    it('leaves a message that is shown as sending alone', async () => {
      const {changed, port, records} = setup();
      records.set('message-1', sendingRecord());

      await changed(textPayload(), 'queued');

      expect(port.injectOptimistic).not.toHaveBeenCalled();
      expect(port.markSending).not.toHaveBeenCalled();
    });

    it('shows a message that failed as sending again when it is queued', async () => {
      const {changed, port, records} = setup();
      records.set('message-1', sendingRecord({isFailed: true, failedReason: 'expired'}));

      await changed(textPayload(), 'queued');

      expect(port.markSending).toHaveBeenCalledTimes(1);
      expect(records.get('message-1')).toMatchObject({isFailed: false, failedReason: undefined});
    });

    it('keeps a decline until its owner takes it back', async () => {
      const {changed, port, records} = setup();
      records.set('message-1', sendingRecord({isFailed: true, failedReason: 'declined'}));

      await changed(textPayload(), 'queued');

      expect(port.markSending).not.toHaveBeenCalled();
    });

    it('writes expired on a message that was given up without a reason', async () => {
      const {changed, port, records, conversation} = setup();
      records.set('message-1', sendingRecord());

      await changed(textPayload(), 'dead-lettered');
      await changed(textPayload(), 'dead-lettered');

      expect(port.markFailed).toHaveBeenCalledTimes(1);
      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {
        reason: 'expired',
        federation: false,
      });
    });

    it('keeps the reason of a message that already failed', async () => {
      const {changed, port, records} = setup();
      records.set('message-1', sendingRecord({isFailed: true, failedReason: 'removed'}));

      await changed(textPayload(), 'dead-lettered');

      expect(port.markFailed).not.toHaveBeenCalled();
    });

    it('writes the generic reason on a message that was given up before it could expire', async () => {
      const {changed, port, records, conversation} = setup();
      records.set('message-1', sendingRecord());
      const weekMilliseconds = 7 * 24 * 60 * 60 * 1000;
      port.serverTime.mockReturnValue(weekMilliseconds + 1000);

      await changed(textPayload(), 'dead-lettered', 2000);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {reason: 'generic', federation: false});
    });

    it('writes expired on a message that is as old as the expiry', async () => {
      const {changed, port, records, conversation} = setup();
      records.set('message-1', sendingRecord());
      const weekMilliseconds = 7 * 24 * 60 * 60 * 1000;
      port.serverTime.mockReturnValue(weekMilliseconds + 1000);

      await changed(textPayload(), 'dead-lettered', 1000);

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {reason: 'expired', federation: false});
    });

    it('removes a message that was dropped, and tolerates it being gone already', async () => {
      const {changed, port, conversation} = setup();

      await changed(textPayload(), 'dropped');
      await changed(textPayload(), 'dropped');

      expect(port.deleteMessage).toHaveBeenCalledTimes(2);
      expect(port.deleteMessage).toHaveBeenCalledWith(conversation, 'message-1');
    });

    it('does nothing when it succeeded', async () => {
      const {changed, port} = setup();

      await changed(textPayload(), 'succeeded');

      expect(port.findMessage).not.toHaveBeenCalled();
      expect(port.deleteMessage).not.toHaveBeenCalled();
    });

    it('does nothing for a conversation that is unknown', async () => {
      const {changed, port} = setup();

      await changed(textPayload({conversationId: MISSING_CONVERSATION}), 'dropped');

      expect(port.deleteMessage).not.toHaveBeenCalled();
    });

    it('logs and swallows what the port throws', async () => {
      const {changed, port} = setup();
      port.findMessage.mockRejectedValue(new Error('storage'));

      await expect(changed(textPayload(), 'queued')).resolves.toBeUndefined();
    });
  });

  describe('onChanged of an asset', () => {
    it('does not show an asset whose record is gone: nothing can be rebuilt without its bytes', async () => {
      const {changed, port} = setup();

      await changed(assetPayload(), 'queued');

      expect(port.injectOptimistic).not.toHaveBeenCalled();
      expect(port.buildText).not.toHaveBeenCalled();
    });

    it('writes expired when it is given up, and removes it when it is dropped', async () => {
      const {changed, port, records, conversation} = setup();
      records.set('asset-1', sendingRecord());

      await changed(assetPayload(), 'dead-lettered');
      await changed(assetPayload(), 'dropped');

      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'asset-1', {
        reason: 'expired',
        federation: false,
      });
      expect(port.deleteMessage).toHaveBeenCalledWith(conversation, 'asset-1');
    });
  });

  it('refuses payloads of another kind', () => {
    const {kind} = setup();

    expect(() => {return kind.parsePayload({type: 'hide', conversationId: CONVERSATION_ID, targetMessageId: 'a'})}).toThrow();
    expect(() => {return kind.parsePayload({type: 'text'})}).toThrow();
    expect(kind.parsePayload(textPayload())).toEqual(textPayload());
  });
});
