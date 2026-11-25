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

import {amplify} from 'amplify';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {noop} from 'noop-esm';

import {Confirmation} from '@wireapp/protocol-messaging';

import {BackendError} from '../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../apiClient/http/networkError';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {RequestCancellationError} from '../../apiClient/user/userError';
import {MessageTargetMode} from '../../core/conversation';
import {StatusType} from '../../message/statusType';
import {TIME_IN_MILLIS} from '../../util/timeUtil';
import {WebAppEvents} from '../../webAppEvents';

import {
  createOutboxRepository,
  declinedResult,
  MEMBER_ID,
  MISSING_CONVERSATION_ID,
  sendingRecord,
  uploadedRecord,
  type OutboxRepository,
} from './outbox/testing/createOutboxRepository';
import {
  assetPayload,
  confirmationPayload,
  deletePayload,
  editPayload,
  hidePayload,
  lastReadPayload,
  pingPayload,
  reactionPayload,
  textPayload,
} from './outbox/testing/payloadFactories';

const succeeded = {type: 'attempt-succeeded'};
const failed = {type: 'attempt-failed'};
const dropped = {type: 'operation-dropped'};
const deadLettered = {type: 'operation-dead-lettered'};
const held = {type: 'operation-held'};

const notDelivered: [string, unknown][] = [
  ['a decline', declinedResult()],
  ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400)],
  ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404)],
  ['a removal', new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403)],
];

describe('the message kinds of MessageRepository', () => {
  let parts: OutboxRepository;

  beforeEach(() => {
    parts = createOutboxRepository();
  });

  afterEach(() => {
    parts.kit.dispose();
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  function answerSend(result: unknown): void {
    if (result instanceof Error) {
      parts.sendToBackend.mockRejectedValue(result);
    } else {
      parts.sendToBackend.mockResolvedValue(result);
    }
  }

  describe('the message kind', () => {
    it('is configured for messages that only an expiry or a rejection ends, and that take their lane with them', () => {
      expect(parts.kinds.message).toMatchObject({
        name: 'message',
        maxAttempts: 1_000,
        whenGivenUp: 'dead-letter',
        laneWhenGivenUp: 'follows',
        expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
        performTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
      });
    });

    describe('perform of a text', () => {
      beforeEach(() => {
        parts.records.set('message-1', sendingRecord());
      });

      it('sends the built message with the server time and answers succeeded', async () => {
        await expect(parts.perform('message', textPayload())).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
          failFast: true,
          syncTimestamp: true,
        });
        expect(parts.sendToBackend.mock.calls[0][0].messageId).toBe('message-1');
        expect(parts.injectOptimistic).not.toHaveBeenCalled();
      });

      it('shows a message that is missing before it sends it', async () => {
        parts.records.clear();

        await expect(parts.perform('message', textPayload())).resolves.toEqual(succeeded);

        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
        expect(parts.injectOptimistic.mock.invocationCallOrder[0]).toBeLessThan(
          parts.sendToBackend.mock.invocationCallOrder[0],
        );
      });

      it('starts the link preview after the send, without waiting for it', async () => {
        parts.sendLinkPreview.mockReturnValue(new Promise(noop));

        await expect(parts.perform('message', textPayload())).resolves.toEqual(succeeded);

        expect(parts.sendLinkPreview).toHaveBeenCalledWith(
          parts.conversation,
          expect.objectContaining({messageId: 'message-1'}),
        );
      });

      it('answers succeeded when the link preview fails', async () => {
        parts.sendLinkPreview.mockRejectedValue(new Error('preview'));

        await expect(parts.perform('message', textPayload())).resolves.toEqual(succeeded);
        await parts.invoker.waitUntilAllSettled();
      });

      it('sends no link preview for a message that was not sent', async () => {
        answerSend(declinedResult());

        await parts.perform('message', textPayload());

        expect(parts.sendLinkPreview).not.toHaveBeenCalled();
      });

      it('answers dead-lettered and records the decline when the client mismatch handler declines', async () => {
        answerSend(declinedResult());

        await expect(parts.perform('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'message-1', StatusType.FAILED, 'declined');
      });

      it.each([
        ['a network error', new NetworkError('offline')],
        ['a 503', new BackendError('busy', BackendErrorLabel.SERVER_ERROR, 503)],
        ['a 429', new BackendError('slow down', BackendErrorLabel.SERVER_ERROR, 429)],
      ])('answers attempt-failed for %s, leaving the message as it is', async (_name, error) => {
        answerSend(error);

        await expect(parts.perform('message', textPayload())).resolves.toEqual(failed);

        expect(parts.markMessage).not.toHaveBeenCalled();
      });

      it.each([
        ['the backend does not know the conversation of a known one', 404, 'removed'],
        ['the self user is not in the conversation any more', 403, 'removed'],
        ['any other error', 400, 'rejected'],
      ])('answers dead-lettered when %s', async (_name, code, reason) => {
        answerSend(new BackendError('no', BackendErrorLabel.CLIENT_ERROR, code));

        await expect(parts.perform('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'message-1', StatusType.FAILED, reason);
      });

      it('marks a federation error with the federation status', async () => {
        answerSend(new BackendError('remote', BackendErrorLabel.FEDERATION_REMOTE_ERROR, HTTP_STATUS.BAD_GATEWAY));

        await expect(parts.perform('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.markMessage).toHaveBeenCalledWith(
          parts.conversation,
          'message-1',
          StatusType.FEDERATION_ERROR,
          'rejected',
        );
      });

      it('answers dropped for a conversation that is unknown', async () => {
        await expect(parts.perform('message', textPayload({conversationId: MISSING_CONVERSATION_ID}))).resolves.toEqual(
          dropped,
        );

        expect(parts.sendToBackend).not.toHaveBeenCalled();
      });

      it('lets an error of building the message reject, so that the outbox retries it', async () => {
        jest.spyOn(parts.repository as any, 'buildOutboxText').mockRejectedValue(new Error('quote'));

        await expect(parts.perform('message', textPayload())).rejects.toThrow('quote');
      });
    });

    describe('perform of an asset', () => {
      it('uploads, shows the uploaded asset, sends it and answers succeeded', async () => {
        const file = new Blob(['bytes']);
        parts.records.set('asset-1', sendingRecord({fileData: file}));
        const signal = new AbortController().signal;

        await expect(parts.perform('message', assetPayload(), signal)).resolves.toEqual(succeeded);

        expect(parts.uploadAsset).toHaveBeenCalledWith(parts.conversation, assetPayload(), file, signal);
        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
          failFast: true,
          syncTimestamp: true,
        });
        const [uploadOrder] = parts.uploadAsset.mock.invocationCallOrder;
        const [injectOrder] = parts.injectOptimistic.mock.invocationCallOrder;
        const [sendOrder] = parts.sendToBackend.mock.invocationCallOrder;
        expect(uploadOrder).toBeLessThan(injectOrder);
        expect(injectOrder).toBeLessThan(sendOrder);
      });

      it('skips the upload when an earlier attempt left its result on the record, and needs no bytes then', async () => {
        parts.records.set('asset-1', uploadedRecord());

        await expect(parts.perform('message', assetPayload())).resolves.toEqual(succeeded);

        expect(parts.uploadAsset).not.toHaveBeenCalled();
        expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
      });

      it('answers dead-lettered as rejected when there are no bytes and no upload', async () => {
        parts.records.set('asset-1', sendingRecord());

        await expect(parts.perform('message', assetPayload())).resolves.toEqual(deadLettered);

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'asset-1', StatusType.FAILED, 'rejected');
      });

      it('answers dropped when the record is gone, and shows nothing', async () => {
        await expect(parts.perform('message', assetPayload())).resolves.toEqual(dropped);

        expect(parts.uploadAsset).not.toHaveBeenCalled();
        expect(parts.injectOptimistic).not.toHaveBeenCalled();
      });

      it.each([
        ['dropped when the user cancelled the upload', new RequestCancellationError('cancelled'), dropped],
        ['attempt-failed when the upload fails for the network', new NetworkError('offline'), failed],
        [
          'dead-lettered when the upload is refused',
          new BackendError('too large', BackendErrorLabel.CLIENT_ERROR, 413),
          deadLettered,
        ],
      ])('answers %s', async (_name, error, expected) => {
        parts.records.set('asset-1', sendingRecord({fileData: new Blob(['bytes'])}));
        parts.uploadAsset.mockRejectedValue(error);

        await expect(parts.perform('message', assetPayload())).resolves.toEqual(expected);

        expect(parts.sendToBackend).not.toHaveBeenCalled();
      });

      it('answers attempt-failed, not dropped, when the attempt itself was aborted during the upload', async () => {
        parts.records.set('asset-1', sendingRecord({fileData: new Blob(['bytes'])}));
        parts.uploadAsset.mockRejectedValue(new RequestCancellationError('cancelled'));
        const controller = new AbortController();
        controller.abort();

        await expect(parts.perform('message', assetPayload(), controller.signal)).resolves.toEqual(failed);
      });

      it('answers dead-lettered when the upload result on the record can not be read', async () => {
        parts.records.set('asset-1', uploadedRecord());
        parts.buildAsset.mockResolvedValue(undefined);

        await expect(parts.perform('message', assetPayload())).resolves.toEqual(deadLettered);
      });

      it.each([
        ['an error that needs a retry', new NetworkError('offline'), failed],
        ['a decline', declinedResult(), deadLettered],
        ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400), deadLettered],
        ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404), deadLettered],
      ])('answers for %s when sending', async (_name, sendResult, expected) => {
        parts.records.set('asset-1', uploadedRecord());
        answerSend(sendResult);

        await expect(parts.perform('message', assetPayload())).resolves.toEqual(expected);
      });

      it('answers dropped for a conversation that is unknown', async () => {
        await expect(
          parts.perform('message', assetPayload({conversationId: MISSING_CONVERSATION_ID})),
        ).resolves.toEqual(dropped);
      });
    });

    describe.each([
      ['reaction', reactionPayload()],
      ['edit', editPayload()],
      ['delete', deletePayload()],
    ] as const)('perform of a %s of a message that is still queued', (_name, payload) => {
      it('answers succeeded when it is sent', async () => {
        await expect(parts.perform('message', payload)).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, expect.any(Object));
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.perform('message', payload)).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers dropped and shows nothing for %s', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.perform('message', payload)).resolves.toEqual(dropped);

        expect(parts.markMessage).not.toHaveBeenCalled();
      });

      it('answers dropped for a conversation that is unknown', async () => {
        await expect(parts.perform('message', {...payload, conversationId: MISSING_CONVERSATION_ID})).resolves.toEqual(
          dropped,
        );
      });
    });

    it.each([
      ['reaction', reactionPayload()],
      ['delete', deletePayload()],
    ] as const)('does nothing when a %s changes', async (_name, payload) => {
      parts.records.set('message-1', sendingRecord());

      await parts.changed('message', payload, 'queued');
      await parts.changed('message', payload, 'dead-lettered');
      await parts.changed('message', payload, 'dropped');

      expect(parts.injectOptimistic).not.toHaveBeenCalled();
      expect(parts.deleteMessage).not.toHaveBeenCalled();
      expect(parts.markMessage).not.toHaveBeenCalled();
    });

    it('shows an edit once when it is queued, and leaves its message alone otherwise', async () => {
      parts.records.set('message-1', sendingRecord());

      await parts.changed('message', editPayload(), 'queued');
      await parts.changed('message', editPayload(), 'queued');
      await parts.changed('message', editPayload(), 'dropped');

      expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
      expect(parts.records.has('edit-1')).toBe(true);
      expect(parts.deleteMessage).not.toHaveBeenCalled();
    });

    it('sends an edit without moving the message in time, and then sends the link preview', async () => {
      await parts.perform('message', editPayload());

      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
        failFast: true,
        syncTimestamp: false,
      });
      expect(parts.sendLinkPreview).toHaveBeenCalledWith(
        parts.conversation,
        expect.objectContaining({messageId: 'edit-1', text: 'edited'}),
      );
    });

    it('sends a delete to the members of the conversation without showing anything', async () => {
      await parts.perform('message', deletePayload());

      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
        failFast: true,
        recipients: [MEMBER_ID],
        skipInjection: true,
        targetMode: MessageTargetMode.USERS,
      });
    });

    describe('onChanged of a text', () => {
      it.each(['queued', 'on-hold', 'in-progress'] as const)(
        'shows a message that is missing when it is %s, once even when called again',
        async state => {
          await parts.changed('message', textPayload(), state);
          await parts.changed('message', textPayload(), state);

          expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
          expect(parts.injectOptimistic).toHaveBeenCalledWith(expect.anything(), parts.conversation);
        },
      );

      it('shows a message once while it is being shown', async () => {
        parts.kinds.message.onChanged?.({
          id: 'operation-1',
          kind: 'message',
          payload: textPayload(),
          queuedAt: 0,
          state: 'queued',
          attempts: 0,
        });
        await parts.perform('message', textPayload());

        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
      });

      it('leaves a message that is shown as sending alone', async () => {
        parts.records.set('message-1', sendingRecord());

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.injectOptimistic).not.toHaveBeenCalled();
        expect(parts.markMessage).not.toHaveBeenCalled();
      });

      it('shows a message that failed as sending again when it is queued', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'expired'}));

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.markMessage).toHaveBeenCalledTimes(1);
        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.SENDING, failed_reason: undefined});
      });

      it('keeps a decline until its owner takes it back', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'declined'}));

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.markMessage).not.toHaveBeenCalled();
      });

      it('writes expired on a message that was given up without a reason', async () => {
        parts.records.set('message-1', sendingRecord());
        const queuedAt = parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK;

        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);
        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);

        expect(parts.markMessage).toHaveBeenCalledTimes(1);
        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'message-1', StatusType.FAILED, 'expired');
      });

      it('keeps the reason of a message that already failed', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'removed'}));

        await parts.changed('message', textPayload(), 'dead-lettered');

        expect(parts.markMessage).not.toHaveBeenCalled();
      });

      it.each([
        ['the generic reason on a message that was given up before it could expire', 1, 'generic'],
        ['expired on a message that is as old as the expiry', 0, 'expired'],
      ])('writes %s', async (_name, ageShortOfExpiry, reason) => {
        parts.records.set('message-1', sendingRecord());
        const queuedAt = parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK + ageShortOfExpiry;

        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'message-1', StatusType.FAILED, reason);
      });

      it('removes a message that was dropped, and tolerates it being gone already', async () => {
        await parts.changed('message', textPayload(), 'dropped');
        await parts.changed('message', textPayload(), 'dropped');

        expect(parts.deleteMessage).toHaveBeenCalledTimes(2);
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'message-1');
      });

      it('does nothing when it succeeded', async () => {
        await parts.changed('message', textPayload(), 'succeeded');

        expect(parts.injectOptimistic).not.toHaveBeenCalled();
        expect(parts.deleteMessage).not.toHaveBeenCalled();
      });

      it('does nothing for a conversation that is unknown', async () => {
        await parts.changed('message', textPayload({conversationId: MISSING_CONVERSATION_ID}), 'dropped');

        expect(parts.deleteMessage).not.toHaveBeenCalled();
      });

      it('logs and swallows what the storage throws', async () => {
        parts.markMessage.mockRejectedValue(new Error('storage'));
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED}));

        await expect(parts.changed('message', textPayload(), 'queued')).resolves.toBeUndefined();
      });
    });

    describe('onChanged of an asset', () => {
      it('does not show an asset whose record is gone, because nothing can be rebuilt without its bytes', async () => {
        await parts.changed('message', assetPayload(), 'queued');

        expect(parts.injectOptimistic).not.toHaveBeenCalled();
      });

      it('writes expired when it is given up, and removes it when it is dropped', async () => {
        parts.records.set('asset-1', sendingRecord());

        await parts.changed(
          'message',
          assetPayload(),
          'dead-lettered',
          parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK,
        );
        await parts.changed('message', assetPayload(), 'dropped');

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'asset-1', StatusType.FAILED, 'expired');
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'asset-1');
      });
    });

    it('refuses payloads of another kind', () => {
      const {message} = parts.kinds;

      expect(() => {
        return message.parsePayload(hidePayload());
      }).toThrow();
      expect(() => {
        return message.parsePayload({type: 'text'});
      }).toThrow();
      expect(message.parsePayload(textPayload())).toEqual(textPayload());
    });
  });

  describe('the message-change kind', () => {
    const variants = [
      ['reaction', reactionPayload()],
      ['edit', editPayload()],
      ['delete', deletePayload()],
      ['hide', hidePayload()],
    ] as const;

    it('is configured for changes that are forgotten when they cannot go out, in a lane of their own', () => {
      expect(parts.kinds['message-change']).toMatchObject({
        name: 'message-change',
        maxAttempts: 1_000,
        whenGivenUp: 'drop',
        laneWhenGivenUp: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
        performTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
      });
    });

    describe.each(variants)('perform of a %s', (_name, payload) => {
      it('answers succeeded when it is sent', async () => {
        await expect(parts.perform('message-change', payload)).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalled();
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.perform('message-change', payload)).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers dropped for %s, and marks nothing as failed', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.perform('message-change', payload)).resolves.toEqual(dropped);

        expect(parts.markMessage).not.toHaveBeenCalled();
      });
    });

    it.each(
      variants.filter(([name]) => {
        return name !== 'hide';
      }),
    )('answers dropped for a %s of an unknown conversation', async (_name, payload) => {
      await expect(
        parts.perform('message-change', {...payload, conversationId: MISSING_CONVERSATION_ID}),
      ).resolves.toEqual(dropped);

      expect(parts.sendToBackend).not.toHaveBeenCalled();
    });

    it('sends a delete to the recipients it was queued with', async () => {
      await parts.perform('message-change', deletePayload({recipients: [{id: 'someone', domain: 'wire.test'}]}));

      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
        failFast: true,
        recipients: [{id: 'someone', domain: 'wire.test'}],
        skipInjection: true,
        targetMode: MessageTargetMode.USERS,
      });
    });

    it('sends a hide to every self conversation, whatever the target conversation is', async () => {
      await parts.perform('message-change', {...hidePayload(), conversationId: MISSING_CONVERSATION_ID});

      expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.selfConversation, {
        failFast: true,
        skipInjection: true,
      });
    });

    it('asks for a retry when there is no self conversation to hide in yet', async () => {
      parts.selfConversations.length = 0;

      await expect(parts.perform('message-change', hidePayload())).resolves.toEqual(failed);
    });

    it('sends a reaction as the final state, without showing anything', async () => {
      await parts.perform('message-change', reactionPayload());

      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
        failFast: true,
        skipInjection: true,
      });
      expect(parts.injectOptimistic).not.toHaveBeenCalled();
    });

    it('shows an edit before it sends it, and then sends its link preview', async () => {
      parts.records.set('message-1', sendingRecord());

      await parts.perform('message-change', editPayload());

      expect(parts.injectOptimistic.mock.invocationCallOrder[0]).toBeLessThan(
        parts.sendToBackend.mock.invocationCallOrder[0],
      );
      expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
        failFast: true,
        syncTimestamp: false,
      });
      expect(parts.sendLinkPreview).toHaveBeenCalled();
    });

    it('refuses payloads of another kind', () => {
      const kind = parts.kinds['message-change'];

      expect(() => {
        return kind.parsePayload({type: 'text'});
      }).toThrow();
      expect(kind.parsePayload(hidePayload())).toEqual(hidePayload());
    });
  });

  describe('the ping kind', () => {
    it('is configured for a ping that is pointless when late, and that carries on past a given up ping', () => {
      expect(parts.kinds.ping).toMatchObject({
        name: 'ping',
        maxAttempts: 3,
        whenGivenUp: 'drop',
        laneWhenGivenUp: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
        performTimeoutMilliseconds: 10 * TIME_IN_MILLIS.SECOND,
      });
    });

    describe('perform', () => {
      it('sends a ping with the id it was shown with, and answers succeeded', async () => {
        parts.records.set('ping-1', sendingRecord());

        await expect(parts.perform('ping', pingPayload())).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
          failFast: true,
          syncTimestamp: true,
        });
        expect(parts.sendToBackend.mock.calls[0][0].messageId).toBe('ping-1');
        expect(parts.injectOptimistic).not.toHaveBeenCalled();
      });

      it('shows a ping that is missing before it sends it', async () => {
        await parts.perform('ping', pingPayload());

        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
        expect(parts.injectOptimistic.mock.calls[0][0].messageId).toBe('ping-1');
        expect(parts.injectOptimistic.mock.invocationCallOrder[0]).toBeLessThan(
          parts.sendToBackend.mock.invocationCallOrder[0],
        );
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.perform('ping', pingPayload())).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers dropped for %s', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.perform('ping', pingPayload())).resolves.toEqual(dropped);
      });

      it('answers dropped for a conversation that is unknown', async () => {
        await expect(parts.perform('ping', pingPayload({conversationId: MISSING_CONVERSATION_ID}))).resolves.toEqual(
          dropped,
        );

        expect(parts.sendToBackend).not.toHaveBeenCalled();
      });
    });

    describe('onChanged', () => {
      it('removes the ping from the conversation when it is dropped, and tolerates repeats', async () => {
        await parts.changed('ping', pingPayload(), 'dropped');
        await parts.changed('ping', pingPayload(), 'dropped');

        expect(parts.deleteMessage).toHaveBeenCalledTimes(2);
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'ping-1');
      });

      it('shows a ping that is missing when it is queued', async () => {
        await parts.changed('ping', pingPayload(), 'queued');

        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
      });

      it.each(['succeeded', 'dead-lettered'] as const)('does nothing when it is %s', async state => {
        await parts.changed('ping', pingPayload(), state);

        expect(parts.deleteMessage).not.toHaveBeenCalled();
        expect(parts.injectOptimistic).not.toHaveBeenCalled();
      });

      it('does nothing for a conversation that is unknown', async () => {
        await parts.changed('ping', pingPayload({conversationId: MISSING_CONVERSATION_ID}), 'dropped');

        expect(parts.deleteMessage).not.toHaveBeenCalled();
      });
    });

    it('refuses payloads of another kind', () => {
      expect(() => {
        return parts.kinds.ping.parsePayload({type: 'text'});
      }).toThrow();
      expect(parts.kinds.ping.parsePayload(pingPayload())).toEqual(pingPayload());
    });
  });

  describe('the receipt kind', () => {
    const sentToSelf = [
      ['a last read', lastReadPayload(1)],
      [
        'a cleared timestamp',
        {type: 'cleared' as const, conversationId: {id: 'conversation-1', domain: 'wire.test'}, timestamp: 1},
      ],
      ['a tracking id sync', {type: 'data-transfer' as const, countlyId: 'countly'}],
    ] as const;

    it('is configured for receipts that are forgotten when they cannot go out', () => {
      expect(parts.kinds.receipt).toMatchObject({
        name: 'receipt',
        maxAttempts: 100,
        whenGivenUp: 'drop',
        laneWhenGivenUp: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
        performTimeoutMilliseconds: TIME_IN_MILLIS.MINUTE,
      });
    });

    describe('perform of a confirmation', () => {
      it('sends it to the sender only, silently and without showing it', async () => {
        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.conversation, {
          failFast: true,
          nativePush: false,
          recipients: [{id: 'sender', domain: 'wire.test'}],
          silentDegradationWarning: true,
          skipInjection: true,
          targetMode: MessageTargetMode.USERS,
        });
      });

      it('sends the first message id and the others of a batch', async () => {
        await parts.perform('receipt', confirmationPayload({messageIds: ['first', 'second', 'third']}));

        const [message] = parts.sendToBackend.mock.calls[0];
        expect(message.confirmation?.firstMessageId).toBe('first');
        expect(message.confirmation?.moreMessageIds).toEqual(['second', 'third']);
      });

      it('sends it once more to the known devices when the first send was declined', async () => {
        parts.sendToBackend.mockResolvedValueOnce(declinedResult());

        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
        expect(parts.sendToBackend.mock.calls[1][2]).toMatchObject({targetMode: MessageTargetMode.USERS_CLIENTS});
      });

      it('answers dropped when both sends were declined', async () => {
        answerSend(declinedResult());

        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(dropped);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(2);
      });

      it('drops a read receipt when read receipts are off now, and still sends a delivery receipt', async () => {
        jest.spyOn(parts.conversation, 'isGroupOrChannel').mockReturnValue(true);
        (parts.conversation as {protocol: CONVERSATION_PROTOCOL}).protocol = CONVERSATION_PROTOCOL.MIXED;

        await expect(
          parts.perform('receipt', confirmationPayload({confirmationType: Confirmation.Type.READ})),
        ).resolves.toEqual(dropped);
        expect(parts.sendToBackend).not.toHaveBeenCalled();

        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(succeeded);
      });

      it('answers dropped for a conversation that is unknown', async () => {
        await expect(
          parts.perform('receipt', confirmationPayload({conversationId: MISSING_CONVERSATION_ID})),
        ).resolves.toEqual(dropped);

        expect(parts.sendToBackend).not.toHaveBeenCalled();
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(failed);
      });

      it.each(notDelivered.slice(1))('answers dropped for %s', async (_case, error) => {
        answerSend(error);

        await expect(parts.perform('receipt', confirmationPayload())).resolves.toEqual(dropped);
      });
    });

    describe.each(sentToSelf)('perform of %s', (_name, payload) => {
      it('sends it to every self conversation without showing it', async () => {
        await expect(parts.perform('receipt', payload)).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
        expect(parts.sendToBackend).toHaveBeenCalledWith(expect.anything(), parts.selfConversation, {
          failFast: true,
          skipInjection: true,
        });
      });

      it('does not need the conversation it is about', async () => {
        const aboutNothing =
          payload.type === 'data-transfer' ? payload : {...payload, conversationId: MISSING_CONVERSATION_ID};

        await expect(parts.perform('receipt', aboutNothing)).resolves.toEqual(succeeded);
      });

      it('asks for a retry when there is no self conversation yet', async () => {
        parts.selfConversations.length = 0;

        await expect(parts.perform('receipt', payload)).resolves.toEqual(failed);
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.perform('receipt', payload)).resolves.toEqual(failed);
      });

      it('answers dropped when it is rejected', async () => {
        answerSend(new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400));

        await expect(parts.perform('receipt', payload)).resolves.toEqual(dropped);
      });
    });

    it('sends the last read timestamp it was queued with', async () => {
      await parts.perform('receipt', lastReadPayload(42));

      const [message] = parts.sendToBackend.mock.calls[0];
      expect(message.lastRead?.lastReadTimestamp?.toString()).toBe('42');
    });

    it('refuses payloads of another kind', () => {
      expect(() => {
        return parts.kinds.receipt.parsePayload({type: 'text'});
      }).toThrow();
      expect(parts.kinds.receipt.parsePayload(lastReadPayload(1))).toEqual(lastReadPayload(1));
    });
  });

  describe.each([
    ['a text', textPayload(), 'message-1'],
    ['an asset', assetPayload(), 'asset-1'],
  ] as const)('perform of %s to a degraded conversation', (_name, payload, key) => {
    beforeEach(() => {
      parts.records.set(key, uploadedRecord());
      parts.degrade(parts.conversation);
      jest.spyOn(parts.kit.outbox, 'release');
    });

    it('holds the operation and asks the user once, without sending', async () => {
      await expect(parts.perform('message', payload)).resolves.toEqual(held);
      await expect(parts.perform('message', payload)).resolves.toEqual(held);
      await parts.kit.clock.settle();

      expect(parts.prompts).toHaveLength(1);
      expect(parts.sendToBackend).not.toHaveBeenCalled();
    });

    it('releases the operation when the user accepts, and the next attempt sends', async () => {
      await parts.perform('message', payload);
      await parts.kit.clock.settle();

      await parts.prompts[0].answer(true);

      expect(parts.kit.outbox.release).toHaveBeenCalledWith(key);
      expect(parts.markMessage).not.toHaveBeenCalled();
      await expect(parts.perform('message', payload)).resolves.toEqual(succeeded);
      expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
    });

    it('records the decline and releases the operation when the user declines, and the next attempt dead-letters', async () => {
      await parts.perform('message', payload);
      await parts.kit.clock.settle();

      await parts.prompts[0].answer(false);

      expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, key, StatusType.FAILED, 'declined');
      expect(parts.kit.outbox.release).toHaveBeenCalledWith(key);
      await expect(parts.perform('message', payload)).resolves.toEqual(deadLettered);
      expect(parts.sendToBackend).not.toHaveBeenCalled();
    });

    it('treats a prompt that fails as a decline', async () => {
      jest.spyOn(parts.repository, 'requestUserSendingPermission').mockRejectedValue(new Error('modal'));

      await parts.perform('message', payload);
      await parts.kit.clock.settle();

      expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, key, StatusType.FAILED, 'declined');
      expect(parts.kit.outbox.release).toHaveBeenCalledWith(key);
    });

    it('asks again for a conversation that is degraded again', async () => {
      await parts.perform('message', payload);
      await parts.kit.clock.settle();
      await parts.prompts[0].answer(true);

      parts.degrade(parts.conversation);

      await expect(parts.perform('message', payload)).resolves.toEqual(held);
      await parts.kit.clock.settle();
      expect(parts.prompts).toHaveLength(2);
    });
  });
});
