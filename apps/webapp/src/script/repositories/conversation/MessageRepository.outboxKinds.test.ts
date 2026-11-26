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

import {Confirmation, type GenericMessage} from '@wireapp/protocol-messaging';

import {BackendError} from '../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import {NetworkError} from '../../apiClient/http/networkError';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {RequestCancellationError} from '../../apiClient/user/userError';
import {MessageTargetMode} from '../../core/conversation';
import {StatusType} from '../../message/statusType';
import type {OperationView} from '../../outbox';
import {TIME_IN_MILLIS} from '../../util/timeUtil';
import {WebAppEvents} from '../../webAppEvents';

import type {MessagePayload, StoredEvent} from './outbox/messageOutboxTypes';
import {
  assetBytes,
  createOutboxRepository,
  declinedResult,
  MISSING_CONVERSATION_ID,
  SENDER_ID,
  SENT_AT,
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

const succeeded = {outcome: 'attempt-succeeded'};
const failed = {outcome: 'attempt-failed'};
const deleted = {outcome: 'attempt-deleted'};
const deadLettered = {outcome: 'attempt-dead-lettered'};
const held = {outcome: 'attempt-held'};

const LINK = 'https://example.com';

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
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  /** The outbox has the message as dead-lettered */
  function failInOutbox(messageId: string): void {
    const find = parts.handles.message.find.bind(parts.handles.message);
    jest.spyOn(parts.handles.message, 'find').mockImplementation(key => {
      return key === messageId
        ? {type: 'operation-found', operation: {state: 'dead-lettered'} as OperationView<MessagePayload>}
        : find(key);
    });
  }

  function answerSend(result: unknown): void {
    if (result instanceof Error) {
      parts.send.mockRejectedValue(result);
    } else {
      parts.send.mockResolvedValue(result);
    }
  }

  /** The messages sent to the backend, in order */
  function sentMessages(): GenericMessage[] {
    return parts.send.mock.calls.map(([{payload}]) => {
      return payload;
    });
  }

  function sentTo(conversation = parts.conversation, options: object = {}): object {
    return expect.objectContaining({conversationId: conversation.qualifiedId, failFast: true, ...options});
  }

  describe('the message kind', () => {
    it('is configured for messages that only an expiry or a rejection ends, and that take their lane with them', () => {
      expect(parts.kinds.message).toMatchObject({
        name: 'message',
        maxAttempts: 1_000,
        whenExhausted: 'dead-letter',
        laneWhenDeadLettered: 'follows',
        laneWhenDeleted: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
        attemptTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
      });
    });

    describe('attempt of a text', () => {
      beforeEach(() => {
        parts.records.set('message-1', sendingRecord());
      });

      it('sends the built message, takes the server time and answers succeeded', async () => {
        await expect(parts.attempt('message', textPayload())).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledTimes(1);
        expect(parts.send).toHaveBeenCalledWith(sentTo());
        expect(sentMessages()[0].messageId).toBe('message-1');
        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.SENT, time: SENT_AT});
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('shows a message that is missing before it sends it', async () => {
        parts.records.clear();

        await expect(parts.attempt('message', textPayload())).resolves.toEqual(succeeded);

        expect(parts.injectEvent).toHaveBeenCalledTimes(1);
        expect(parts.injectEvent.mock.invocationCallOrder[0]).toBeLessThan(parts.send.mock.invocationCallOrder[0]);
      });

      it('starts the link preview after the send, without waiting for it', async () => {
        parts.openGraph.mockReturnValue(new Promise(noop));

        await expect(parts.attempt('message', textPayload({text: `see ${LINK}`}))).resolves.toEqual(succeeded);
        await parts.kit.clock.settle();

        expect(parts.openGraph).toHaveBeenCalledWith(LINK);
      });

      it('answers succeeded when the link preview fails', async () => {
        parts.openGraph.mockResolvedValue({title: 'Example', url: LINK, image: {data: 'data:image/png;base64,AA=='}});
        parts.uploadLinkPreviewImage.mockRejectedValue(new Error('preview'));

        await expect(parts.attempt('message', textPayload({text: `see ${LINK}`}))).resolves.toEqual(succeeded);
        await parts.invoker.waitUntilAllSettled();

        expect(parts.uploadLinkPreviewImage).toHaveBeenCalledTimes(1);
      });

      it('sends no link preview for a message that was not sent', async () => {
        answerSend(declinedResult());

        await parts.attempt('message', textPayload({text: `see ${LINK}`}));
        await parts.invoker.waitUntilAllSettled();

        expect(parts.openGraph).not.toHaveBeenCalled();
      });

      it('answers dead-lettered and records the decline when the client mismatch handler declines', async () => {
        answerSend(declinedResult());

        await expect(parts.attempt('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
      });

      it.each([
        ['a network error', new NetworkError('offline')],
        ['a 503', new BackendError('busy', BackendErrorLabel.SERVER_ERROR, 503)],
        ['a 429', new BackendError('slow down', BackendErrorLabel.SERVER_ERROR, 429)],
      ])('answers attempt-failed for %s, leaving the message as it is', async (_name, error) => {
        answerSend(error);

        await expect(parts.attempt('message', textPayload())).resolves.toEqual(failed);

        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it.each([
        ['the backend does not know the conversation of a known one', 404, 'removed'],
        ['the self user is not in the conversation any more', 403, 'removed'],
        ['any other error', 400, 'rejected'],
      ])('answers dead-lettered when %s', async (_name, code, reason) => {
        answerSend(new BackendError('no', BackendErrorLabel.CLIENT_ERROR, code));

        await expect(parts.attempt('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.FAILED, failed_reason: reason});
      });

      it('marks a federation error with the federation status', async () => {
        answerSend(new BackendError('remote', BackendErrorLabel.FEDERATION_REMOTE_ERROR, HTTP_STATUS.BAD_GATEWAY));

        await expect(parts.attempt('message', textPayload())).resolves.toEqual(deadLettered);

        expect(parts.records.get('message-1')).toMatchObject({
          status: StatusType.FEDERATION_ERROR,
          failed_reason: 'rejected',
        });
      });

      it('answers deleted for a conversation that is unknown', async () => {
        await expect(parts.attempt('message', textPayload({conversationId: MISSING_CONVERSATION_ID}))).resolves.toEqual(
          deleted,
        );

        expect(parts.send).not.toHaveBeenCalled();
      });

      it('lets an error of building the message reject, so that the outbox retries it', async () => {
        const loadRecord = parts.loadEvent.getMockImplementation();
        parts.loadEvent.mockImplementation(async (conversationId: string, messageId: string) => {
          if (messageId === 'quoted-1') {
            throw new Error('quote');
          }
          return loadRecord?.(conversationId, messageId);
        });

        await expect(
          parts.attempt('message', textPayload({quote: {messageId: 'quoted-1', userId: 'quoted-user'}})),
        ).rejects.toThrow('quote');
      });

      it('answers dead-lettered as generic, and sends nothing, for a reply to a message that failed', async () => {
        parts.records.set('message-1', sendingRecord());
        failInOutbox('quoted-1');

        await expect(
          parts.perform('message', textPayload({quote: {messageId: 'quoted-1', userId: 'sender'}})),
        ).resolves.toEqual(deadLettered);

        expect(parts.markMessage).toHaveBeenCalledWith(parts.conversation, 'message-1', StatusType.FAILED, 'generic');
        expect(parts.sendToBackend).not.toHaveBeenCalled();
      });

      it('sends a reply to a message that was sent or is pending', async () => {
        parts.records.set('message-1', sendingRecord());

        await expect(
          parts.perform('message', textPayload({quote: {messageId: 'quoted-1', userId: 'sender'}})),
        ).resolves.toEqual(succeeded);

        expect(parts.sendToBackend).toHaveBeenCalledTimes(1);
        expect(parts.markMessage).not.toHaveBeenCalled();
      });
    });

    it('answers dead-lettered for a reaction to a message that failed, without sending or showing a failure', async () => {
      failInOutbox('message-1');

      await expect(parts.perform('message', reactionPayload())).resolves.toEqual(deadLettered);

      expect(parts.sendToBackend).not.toHaveBeenCalled();
      expect(parts.markMessage).not.toHaveBeenCalled();
      expect(parts.deleteMessage).not.toHaveBeenCalled();
    });

    describe('attempt of an asset', () => {
      it('uploads, shows the uploaded asset, sends it and answers succeeded', async () => {
        const file = assetBytes();
        parts.records.set('asset-1', sendingRecord({fileData: file}));
        const signal = new AbortController().signal;

        await expect(parts.attempt('message', assetPayload(), signal)).resolves.toEqual(succeeded);

        expect(parts.uploadFile).toHaveBeenCalledWith(file, 'asset-1', expect.anything(), false, undefined, {
          failFast: true,
        });
        expect(parts.injectEvent).toHaveBeenCalledTimes(1);
        expect(parts.send).toHaveBeenCalledWith(sentTo());
        expect(parts.records.get('asset-1')).toMatchObject({status: StatusType.SENT, time: SENT_AT});
        const [uploadOrder] = parts.uploadFile.mock.invocationCallOrder;
        const [injectOrder] = parts.injectEvent.mock.invocationCallOrder;
        const [sendOrder] = parts.send.mock.invocationCallOrder;
        expect(uploadOrder).toBeLessThan(injectOrder);
        expect(injectOrder).toBeLessThan(sendOrder);
      });

      it('skips the upload when an earlier attempt left its result on the record', async () => {
        parts.records.set('asset-1', uploadedRecord());

        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(succeeded);

        expect(parts.uploadFile).not.toHaveBeenCalled();
        expect(parts.send).toHaveBeenCalledTimes(1);
      });

      it('answers dead-lettered as rejected when there are no bytes and no upload', async () => {
        parts.records.set('asset-1', sendingRecord());

        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(deadLettered);

        expect(parts.records.get('asset-1')).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
      });

      it('answers deleted when the record is gone, and shows nothing', async () => {
        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(deleted);

        expect(parts.uploadFile).not.toHaveBeenCalled();
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it.each([
        ['deleted when the user cancelled the upload', new RequestCancellationError('cancelled'), deleted],
        ['attempt-failed when the upload fails for the network', new NetworkError('offline'), failed],
        [
          'dead-lettered when the upload is refused',
          new BackendError('too large', BackendErrorLabel.CLIENT_ERROR, 413),
          deadLettered,
        ],
      ])('answers %s', async (_name, error, expected) => {
        parts.records.set('asset-1', sendingRecord({fileData: new Blob(['bytes'])}));
        parts.uploadFile.mockRejectedValue(error);

        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(expected);

        expect(parts.send).not.toHaveBeenCalled();
      });

      it('answers attempt-failed, not deleted, when the attempt itself was aborted during the upload', async () => {
        parts.records.set('asset-1', sendingRecord({fileData: new Blob(['bytes'])}));
        parts.uploadFile.mockRejectedValue(new RequestCancellationError('cancelled'));
        const controller = new AbortController();
        controller.abort();

        await expect(parts.attempt('message', assetPayload(), controller.signal)).resolves.toEqual(failed);
      });

      it('answers dead-lettered as rejected when the record keeps the upload but lost the bytes', async () => {
        parts.records.set('asset-1', uploadedRecord({fileData: undefined}));

        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(deadLettered);

        expect(parts.records.get('asset-1')).toMatchObject({status: StatusType.FAILED, failed_reason: 'rejected'});
        expect(parts.send).not.toHaveBeenCalled();
      });

      it.each([
        ['an error that needs a retry', new NetworkError('offline'), failed],
        ['a decline', declinedResult(), deadLettered],
        ['a rejection', new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400), deadLettered],
        ['a conversation that is gone', new BackendError('gone', BackendErrorLabel.NOT_FOUND, 404), deadLettered],
      ])('answers for %s when sending', async (_name, sendResult, expected) => {
        parts.records.set('asset-1', uploadedRecord());
        answerSend(sendResult);

        await expect(parts.attempt('message', assetPayload())).resolves.toEqual(expected);
      });

      it('answers deleted for a conversation that is unknown', async () => {
        await expect(
          parts.attempt('message', assetPayload({conversationId: MISSING_CONVERSATION_ID})),
        ).resolves.toEqual(deleted);
      });
    });

    describe.each([
      ['reaction', reactionPayload()],
      ['edit', editPayload()],
      ['delete', deletePayload()],
    ] as const)('attempt of a %s of a message that is still queued', (_name, payload) => {
      it('answers succeeded when it is sent', async () => {
        await expect(parts.attempt('message', payload)).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledWith(sentTo());
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.attempt('message', payload)).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers deleted and shows nothing for %s', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.attempt('message', payload)).resolves.toEqual(deleted);

        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it('answers deleted for a conversation that is unknown', async () => {
        await expect(parts.attempt('message', {...payload, conversationId: MISSING_CONVERSATION_ID})).resolves.toEqual(
          deleted,
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
      await parts.changed('message', payload, 'deleted');

      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.deleteMessage).not.toHaveBeenCalled();
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('shows an edit once when it is queued, and leaves its message alone otherwise', async () => {
      parts.records.set('message-1', sendingRecord());

      await parts.changed('message', editPayload(), 'queued');
      await parts.changed('message', editPayload(), 'queued');
      await parts.changed('message', editPayload(), 'deleted');

      expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      expect(parts.records.has('edit-1')).toBe(true);
      expect(parts.deleteMessage).not.toHaveBeenCalled();
    });

    it('sends an edit without moving the message in time, and then sends the link preview', async () => {
      await parts.attempt('message', editPayload({text: `edited ${LINK}`}));
      await parts.kit.clock.settle();

      expect(parts.send).toHaveBeenCalledWith(sentTo());
      expect(parts.records.get('edit-1')).toMatchObject({status: StatusType.SENT});
      expect(parts.records.get('edit-1')?.time).not.toBe(SENT_AT);
      expect(parts.openGraph).toHaveBeenCalledWith(LINK);
    });

    it('sends a delete to the members of the conversation without showing anything', async () => {
      await parts.attempt('message', deletePayload());

      expect(parts.send).toHaveBeenCalledWith(
        sentTo(parts.conversation, {
          targetMode: MessageTargetMode.USERS,
          userIds: {'wire.test': {member: ['member-client'], sender: ['sender-client']}},
        }),
      );
      expect(sentMessages()[0].deleted?.messageId).toBe('message-1');
      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    describe('onChanged of a text', () => {
      it.each(['queued', 'on-hold', 'in-progress'] as const)(
        'shows a message that is missing when it is %s, once even when called again',
        async state => {
          await parts.changed('message', textPayload(), state);
          await parts.changed('message', textPayload(), state);

          expect(parts.injectEvent).toHaveBeenCalledTimes(1);
          expect(parts.injectEvent).toHaveBeenCalledWith(
            expect.objectContaining({id: 'message-1', conversation: parts.conversation.id}),
          );
        },
      );

      it('shows a message once while it is being shown', async () => {
        parts.kinds.message.onChanged?.({
          id: 'operation-1',
          kind: 'message',
          payload: textPayload(),
          correlation: {state: 'uncorrelated'},
          lane: {state: 'no-lane'},
          queuedAt: 0,
          state: 'queued',
          attempts: 0,
        });
        await parts.attempt('message', textPayload());

        expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      });

      it('leaves a message that is shown as sending alone', async () => {
        parts.records.set('message-1', sendingRecord());

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.injectEvent).not.toHaveBeenCalled();
        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it('shows a message that failed as sending again when it is queued', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'expired'}));

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.updateEvent).toHaveBeenCalledTimes(1);
        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.SENDING, failed_reason: undefined});
      });

      it('shows a declined message as sending again when it is queued again', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'declined'}));

        await parts.changed('message', textPayload(), 'queued');

        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.SENDING, failed_reason: undefined});
      });

      it('writes expired on a message that was given up without a reason', async () => {
        parts.records.set('message-1', sendingRecord());
        const queuedAt = parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK;

        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);
        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);

        expect(parts.updateEvent).toHaveBeenCalledTimes(1);
        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.FAILED, failed_reason: 'expired'});
      });

      it('keeps the reason of a message that already failed', async () => {
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED, failed_reason: 'removed'}));

        await parts.changed('message', textPayload(), 'dead-lettered');

        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it.each([
        ['the generic reason on a message that was given up before it could expire', 1, 'generic'],
        ['expired on a message that is as old as the expiry', 0, 'expired'],
      ])('writes %s', async (_name, ageShortOfExpiry, reason) => {
        parts.records.set('message-1', sendingRecord());
        const queuedAt = parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK + ageShortOfExpiry;

        await parts.changed('message', textPayload(), 'dead-lettered', queuedAt);

        expect(parts.records.get('message-1')).toMatchObject({status: StatusType.FAILED, failed_reason: reason});
      });

      it('removes a message that was deleted, and tolerates it being gone already', async () => {
        parts.records.set('message-1', sendingRecord());

        await parts.changed('message', textPayload(), 'deleted');
        await parts.changed('message', textPayload(), 'deleted');

        expect(parts.deleteMessage).toHaveBeenCalledTimes(2);
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'message-1');
        expect(parts.records.has('message-1')).toBe(false);
      });

      it('does nothing when it succeeded', async () => {
        await parts.changed('message', textPayload(), 'succeeded');

        expect(parts.injectEvent).not.toHaveBeenCalled();
        expect(parts.deleteMessage).not.toHaveBeenCalled();
      });

      it('does nothing for a conversation that is unknown', async () => {
        await parts.changed('message', textPayload({conversationId: MISSING_CONVERSATION_ID}), 'deleted');

        expect(parts.deleteMessage).not.toHaveBeenCalled();
      });

      it('logs and swallows what the storage throws', async () => {
        parts.updateEvent.mockRejectedValue(new Error('storage'));
        parts.records.set('message-1', sendingRecord({status: StatusType.FAILED}));

        await expect(parts.changed('message', textPayload(), 'queued')).resolves.toBeUndefined();
      });
    });

    describe('onChanged of an asset', () => {
      it('does not show an asset whose record is gone, because nothing can be rebuilt without its bytes', async () => {
        await parts.changed('message', assetPayload(), 'queued');

        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('writes expired when it is given up, and removes it when it is deleted', async () => {
        parts.records.set('asset-1', sendingRecord());

        await parts.changed(
          'message',
          assetPayload(),
          'dead-lettered',
          parts.kit.clock.getServerTime() - TIME_IN_MILLIS.WEEK,
        );
        await parts.changed('message', assetPayload(), 'deleted');

        expect(parts.updateEvent).toHaveBeenCalledWith('asset-1', {
          status: StatusType.FAILED,
          failed_reason: 'expired',
        });
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'asset-1');
        expect(parts.records.has('asset-1')).toBe(false);
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
        whenExhausted: 'delete',
        laneWhenDeadLettered: 'continues',
        laneWhenDeleted: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
        attemptTimeoutMilliseconds: 2 * TIME_IN_MILLIS.MINUTE,
      });
    });

    describe.each(variants)('attempt of a %s', (_name, payload) => {
      it('answers succeeded when it is sent', async () => {
        await expect(parts.attempt('message-change', payload)).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalled();
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.attempt('message-change', payload)).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers deleted for %s, and marks nothing as failed', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.attempt('message-change', payload)).resolves.toEqual(deleted);

        expect(parts.updateEvent).not.toHaveBeenCalled();
      });
    });

    it.each(
      variants.filter(([name]) => {
        return name !== 'hide';
      }),
    )('answers deleted for a %s of an unknown conversation', async (_name, payload) => {
      await expect(
        parts.attempt('message-change', {...payload, conversationId: MISSING_CONVERSATION_ID}),
      ).resolves.toEqual(deleted);

      expect(parts.send).not.toHaveBeenCalled();
    });

    it('sends a delete to the recipients it was queued with', async () => {
      await parts.attempt('message-change', deletePayload({recipients: [SENDER_ID]}));

      expect(parts.send).toHaveBeenCalledWith(
        sentTo(parts.conversation, {
          targetMode: MessageTargetMode.USERS,
          userIds: {'wire.test': {sender: ['sender-client']}},
        }),
      );
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('sends a hide to every self conversation, whatever the target conversation is', async () => {
      await parts.attempt('message-change', {...hidePayload(), conversationId: MISSING_CONVERSATION_ID});

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(parts.send).toHaveBeenCalledWith(sentTo(parts.selfConversation));
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('asks for a retry when there is no self conversation to hide in yet', async () => {
      parts.selfConversations.length = 0;

      await expect(parts.attempt('message-change', hidePayload())).resolves.toEqual(failed);
    });

    it('sends a reaction as the final state, without showing anything', async () => {
      await parts.attempt('message-change', reactionPayload());

      expect(parts.send).toHaveBeenCalledWith(sentTo());
      expect(sentMessages()[0].reaction?.emoji).toBe('like');
      expect(parts.injectEvent).not.toHaveBeenCalled();
      expect(parts.updateEvent).not.toHaveBeenCalled();
    });

    it('shows an edit before it sends it, and then sends its link preview', async () => {
      parts.records.set('message-1', sendingRecord());

      await parts.attempt('message-change', editPayload({text: `edited ${LINK}`}));
      await parts.kit.clock.settle();

      expect(parts.injectEvent.mock.invocationCallOrder[0]).toBeLessThan(parts.send.mock.invocationCallOrder[0]);
      expect(parts.send).toHaveBeenCalledWith(sentTo());
      expect(parts.records.get('edit-1')?.time).not.toBe(SENT_AT);
      expect(parts.openGraph).toHaveBeenCalledWith(LINK);
    });

    describe('onChanged of a change that is given up unsent', () => {
      const previousEvent = {id: 'message-1', data: {content: 'old'}} as unknown as StoredEvent;
      const removedEvent = {id: 'message-1', data: {content: 'text'}} as unknown as StoredEvent;
      const removals = [
        ['delete', {...deletePayload(), removedEvent}],
        ['hide', {...hidePayload(), removedEvent}],
      ] as const;
      let replaceEvent: jest.SpyInstance;
      let injectEvent: jest.SpyInstance;
      let undone: jest.Mock;

      beforeEach(() => {
        replaceEvent = jest.spyOn((parts.repository as any).eventService, 'replaceEvent').mockResolvedValue({});
        injectEvent = jest.spyOn((parts.repository as any).eventRepository, 'injectEvent').mockResolvedValue(undefined);
        undone = jest.fn();
        parts.repository.onChangeUndone(undone);
      });

      it('puts the reactions from before a reaction back, without a notice', async () => {
        await parts.changed('message-change', reactionPayload({reactions: '', previousReactions: '👍'}), 'dropped');

        expect(parts.injectOptimistic).toHaveBeenCalledTimes(1);
        expect(parts.injectOptimistic).toHaveBeenCalledWith(
          expect.objectContaining({reaction: expect.objectContaining({emoji: '👍'})}),
          parts.conversation,
        );
        expect(undone).not.toHaveBeenCalled();
      });

      it('shows the version from before an edit again, and tells the sender', async () => {
        parts.records.set('edit-1', sendingRecord());

        await parts.changed('message-change', editPayload({previousEvent}), 'dropped');

        expect(replaceEvent).toHaveBeenCalledWith(expect.objectContaining({...previousEvent, primary_key: 'edit-1'}));
        expect(undone).toHaveBeenCalledWith('edit');
      });

      it('says nothing when the edit is not what is shown any more', async () => {
        await parts.changed('message-change', editPayload({previousEvent}), 'dropped');

        expect(replaceEvent).not.toHaveBeenCalled();
        expect(undone).not.toHaveBeenCalled();
      });

      it.each(removals)('shows the message of a %s again, and tells the sender', async (_name, payload) => {
        await parts.changed('message-change', payload, 'dropped');

        expect(injectEvent).toHaveBeenCalledWith(removedEvent);
        expect(undone).toHaveBeenCalledWith('delete');
      });

      it.each(removals)('says nothing when the message of a %s is shown already', async (_name, payload) => {
        parts.records.set('message-1', sendingRecord());

        await parts.changed('message-change', payload, 'dropped');

        expect(injectEvent).not.toHaveBeenCalled();
        expect(undone).not.toHaveBeenCalled();
      });

      it.each(['queued', 'on-hold', 'in-progress', 'succeeded'] as const)(
        'takes nothing back while it is %s',
        async state => {
          parts.records.set('message-1', sendingRecord());
          parts.records.set('edit-1', sendingRecord());

          await parts.changed('message-change', reactionPayload({previousReactions: '👍'}), state);
          await parts.changed('message-change', editPayload({previousEvent}), state);
          await parts.changed('message-change', {...deletePayload(), removedEvent}, state);

          expect(parts.injectOptimistic).not.toHaveBeenCalled();
          expect(replaceEvent).not.toHaveBeenCalled();
          expect(injectEvent).not.toHaveBeenCalled();
          expect(undone).not.toHaveBeenCalled();
        },
      );

      it('takes nothing back that was stored without what it was before', async () => {
        parts.records.set('edit-1', sendingRecord());

        await parts.changed('message-change', reactionPayload(), 'dropped');
        await parts.changed('message-change', editPayload(), 'dropped');
        await parts.changed('message-change', deletePayload(), 'dropped');
        await parts.changed('message-change', hidePayload(), 'dropped');

        expect(parts.injectOptimistic).not.toHaveBeenCalled();
        expect(replaceEvent).not.toHaveBeenCalled();
        expect(injectEvent).not.toHaveBeenCalled();
        expect(undone).not.toHaveBeenCalled();
      });
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
        whenExhausted: 'delete',
        laneWhenDeadLettered: 'continues',
        laneWhenDeleted: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.MINUTE,
        attemptTimeoutMilliseconds: 10 * TIME_IN_MILLIS.SECOND,
      });
    });

    describe('attempt', () => {
      it('sends a ping with the id it was shown with, and answers succeeded', async () => {
        parts.records.set('ping-1', sendingRecord());

        await expect(parts.attempt('ping', pingPayload())).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledWith(sentTo());
        expect(sentMessages()[0].messageId).toBe('ping-1');
        expect(parts.records.get('ping-1')).toMatchObject({status: StatusType.SENT, time: SENT_AT});
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('shows a ping that is missing before it sends it', async () => {
        await parts.attempt('ping', pingPayload());

        expect(parts.injectEvent).toHaveBeenCalledTimes(1);
        expect(parts.injectEvent).toHaveBeenCalledWith(expect.objectContaining({id: 'ping-1'}));
        expect(parts.injectEvent.mock.invocationCallOrder[0]).toBeLessThan(parts.send.mock.invocationCallOrder[0]);
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.attempt('ping', pingPayload())).resolves.toEqual(failed);
      });

      it.each(notDelivered)('answers deleted for %s', async (_case, sendResult) => {
        answerSend(sendResult);

        await expect(parts.attempt('ping', pingPayload())).resolves.toEqual(deleted);
      });

      it('answers deleted for a conversation that is unknown', async () => {
        await expect(parts.attempt('ping', pingPayload({conversationId: MISSING_CONVERSATION_ID}))).resolves.toEqual(
          deleted,
        );

        expect(parts.send).not.toHaveBeenCalled();
      });
    });

    describe('onChanged', () => {
      it('removes the ping from the conversation when it is deleted, and tolerates repeats', async () => {
        parts.records.set('ping-1', sendingRecord());

        await parts.changed('ping', pingPayload(), 'deleted');
        await parts.changed('ping', pingPayload(), 'deleted');

        expect(parts.deleteMessage).toHaveBeenCalledTimes(2);
        expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'ping-1');
        expect(parts.records.has('ping-1')).toBe(false);
      });

      it('shows a ping that is missing when it is queued', async () => {
        await parts.changed('ping', pingPayload(), 'queued');

        expect(parts.injectEvent).toHaveBeenCalledTimes(1);
      });

      it.each(['succeeded', 'dead-lettered'] as const)('does nothing when it is %s', async state => {
        await parts.changed('ping', pingPayload(), state);

        expect(parts.deleteMessage).not.toHaveBeenCalled();
        expect(parts.injectEvent).not.toHaveBeenCalled();
      });

      it('does nothing for a conversation that is unknown', async () => {
        await parts.changed('ping', pingPayload({conversationId: MISSING_CONVERSATION_ID}), 'deleted');

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
        whenExhausted: 'delete',
        laneWhenDeadLettered: 'continues',
        laneWhenDeleted: 'continues',
        expiresAfterMilliseconds: TIME_IN_MILLIS.WEEK,
        attemptTimeoutMilliseconds: TIME_IN_MILLIS.MINUTE,
      });
    });

    describe('attempt of a confirmation', () => {
      it('sends it to the sender only, silently and without showing it', async () => {
        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledTimes(1);
        expect(parts.send).toHaveBeenCalledWith(
          sentTo(parts.conversation, {
            nativePush: false,
            targetMode: MessageTargetMode.USERS,
            userIds: {'wire.test': {sender: ['sender-client']}},
          }),
        );
        expect(parts.clientMismatch).toHaveBeenCalledWith(expect.anything(), parts.conversation, true);
        expect(parts.injectEvent).not.toHaveBeenCalled();
        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it('sends the first message id and the others of a batch', async () => {
        await parts.attempt('receipt', confirmationPayload({messageIds: ['first', 'second', 'third']}));

        const [message] = sentMessages();
        expect(message.confirmation?.firstMessageId).toBe('first');
        expect(message.confirmation?.moreMessageIds).toEqual(['second', 'third']);
      });

      it('sends it once more to the known devices when the first send was declined', async () => {
        parts.send.mockResolvedValueOnce(declinedResult());

        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledTimes(2);
        expect(parts.send.mock.calls[1][0]).toMatchObject({targetMode: MessageTargetMode.USERS_CLIENTS});
      });

      it('answers deleted when both sends were declined', async () => {
        answerSend(declinedResult());

        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(deleted);

        expect(parts.send).toHaveBeenCalledTimes(2);
      });

      it('drops a read receipt when read receipts are off now, and still sends a delivery receipt', async () => {
        jest.spyOn(parts.conversation, 'isGroupOrChannel').mockReturnValue(true);
        (parts.conversation as {protocol: CONVERSATION_PROTOCOL}).protocol = CONVERSATION_PROTOCOL.MIXED;

        await expect(
          parts.attempt('receipt', confirmationPayload({confirmationType: Confirmation.Type.READ})),
        ).resolves.toEqual(deleted);
        expect(parts.send).not.toHaveBeenCalled();

        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(succeeded);
      });

      it('answers deleted for a conversation that is unknown', async () => {
        await expect(
          parts.attempt('receipt', confirmationPayload({conversationId: MISSING_CONVERSATION_ID})),
        ).resolves.toEqual(deleted);

        expect(parts.send).not.toHaveBeenCalled();
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(failed);
      });

      it.each(notDelivered.slice(1))('answers deleted for %s', async (_case, error) => {
        answerSend(error);

        await expect(parts.attempt('receipt', confirmationPayload())).resolves.toEqual(deleted);
      });
    });

    describe.each(sentToSelf)('attempt of %s', (_name, payload) => {
      it('sends it to every self conversation without showing it', async () => {
        await expect(parts.attempt('receipt', payload)).resolves.toEqual(succeeded);

        expect(parts.send).toHaveBeenCalledTimes(1);
        expect(parts.send).toHaveBeenCalledWith(sentTo(parts.selfConversation));
        expect(parts.updateEvent).not.toHaveBeenCalled();
      });

      it('does not need the conversation it is about', async () => {
        const aboutNothing =
          payload.type === 'data-transfer' ? payload : {...payload, conversationId: MISSING_CONVERSATION_ID};

        await expect(parts.attempt('receipt', aboutNothing)).resolves.toEqual(succeeded);
      });

      it('asks for a retry when there is no self conversation yet', async () => {
        parts.selfConversations.length = 0;

        await expect(parts.attempt('receipt', payload)).resolves.toEqual(failed);
      });

      it('answers attempt-failed when it needs a retry', async () => {
        answerSend(new NetworkError('offline'));

        await expect(parts.attempt('receipt', payload)).resolves.toEqual(failed);
      });

      it('answers deleted when it is rejected', async () => {
        answerSend(new BackendError('no', BackendErrorLabel.CLIENT_ERROR, 400));

        await expect(parts.attempt('receipt', payload)).resolves.toEqual(deleted);
      });
    });

    it('sends the last read timestamp it was queued with', async () => {
      await parts.attempt('receipt', lastReadPayload(42));

      const [message] = sentMessages();
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
  ] as const)('attempt of %s to a degraded conversation', (_name, payload, key) => {
    beforeEach(() => {
      parts.records.set(key, uploadedRecord());
      parts.degrade(parts.conversation);
      jest.spyOn(parts.kit.outbox, 'release');
    });

    it('holds the operation and asks the user once, without sending', async () => {
      await expect(parts.attempt('message', payload)).resolves.toEqual(held);
      await expect(parts.attempt('message', payload)).resolves.toEqual(held);
      await parts.kit.clock.settle();

      expect(parts.prompts).toHaveLength(1);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('releases the operation when the user accepts, and the next attempt sends', async () => {
      await parts.attempt('message', payload);
      await parts.kit.clock.settle();

      await parts.prompts[0].answer(true);

      expect(parts.kit.outbox.release).toHaveBeenCalledWith(key);
      expect(parts.updateEvent).not.toHaveBeenCalled();
      await expect(parts.attempt('message', payload)).resolves.toEqual(succeeded);
      expect(parts.send).toHaveBeenCalledTimes(1);
    });

    it('records the decline when the user declines, and sends nothing', async () => {
      await parts.attempt('message', payload);
      await parts.kit.clock.settle();

      await parts.prompts[0].answer(false);

      expect(parts.records.get(key)).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
      expect(parts.kit.outbox.release).not.toHaveBeenCalled();
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('treats a prompt that fails as a decline', async () => {
      jest.spyOn(parts.repository, 'requestUserSendingPermission').mockRejectedValue(new Error('modal'));

      await parts.attempt('message', payload);
      await parts.kit.clock.settle();

      expect(parts.records.get(key)).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
    });

    it('asks again for a conversation that is degraded again', async () => {
      await parts.attempt('message', payload);
      await parts.kit.clock.settle();
      await parts.prompts[0].answer(true);

      parts.degrade(parts.conversation);

      await expect(parts.attempt('message', payload)).resolves.toEqual(held);
      await parts.kit.clock.settle();
      expect(parts.prompts).toHaveLength(2);
    });
  });
});
