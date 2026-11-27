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

import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';
import {StatusType} from '../../message/statusType';
import {createStoredSnapshot} from '../../outbox/testing/createOutboxTestKit';
import {translateForTest} from '../../util/test/translateForTest';
import {WebAppEvents} from '../../webAppEvents';
import {Conversation} from '../entity/Conversation';
import type {ContentMessage} from '../entity/message/contentMessage';
import {StorageKey} from '../storage';

import {
  laneOfChanges,
  laneOfMessages,
  laneOfReceipts,
  messageCorrelationKey,
  receiptCorrelationKey,
  type MessageChangePayload,
  type MessagePayload,
  type ReceiptPayload,
} from './outbox/messageOutboxTypes';
import {
  CONVERSATION_ID,
  createOutboxRepository,
  OTHER_CONVERSATION_ID,
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

type Variant = {
  name: string;
  /** The conversation the user is asked about */
  degraded: (parts: OutboxRepository) => Conversation;
  prepare?: (parts: OutboxRepository) => void;
  enqueue: (parts: OutboxRepository) => Promise<unknown>;
  key: string;
  /** A message shows a decline as failed, and anything else is forgotten */
  declined: 'dead-lettered' | 'deleted';
  expectDeclinedOnScreen: (parts: OutboxRepository) => void;
};

const inConversation = ({conversation}: OutboxRepository): Conversation => {
  return conversation;
};
const inSelfConversation = ({selfConversation}: OutboxRepository): Conversation => {
  return selfConversation;
};
const nothingOnScreen = ({updateEvent, deleteMessage}: OutboxRepository): void => {
  expect(updateEvent).not.toHaveBeenCalled();
  expect(deleteMessage).not.toHaveBeenCalled();
};
const shownAsDeclined = (messageId: string) => {
  return ({records}: OutboxRepository): void => {
    expect(records.get(messageId)).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
  };
};

function changeOf(payload: MessageChangePayload) {
  return ({handles}: OutboxRepository) => {
    return handles['message-change'].enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfChanges(CONVERSATION_ID),
    });
  };
}

function inLaneOfMessages(payload: MessagePayload) {
  return ({handles}: OutboxRepository) => {
    return handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(CONVERSATION_ID),
    });
  };
}

function receiptOf(payload: ReceiptPayload) {
  return ({handles}: OutboxRepository) => {
    return handles.receipt.enqueue({
      payload,
      correlationKey: receiptCorrelationKey(payload),
      laneKey: laneOfReceipts(payload),
    });
  };
}

const variants: Variant[] = [
  {
    name: 'a text',
    degraded: inConversation,
    prepare: ({records}) => {
      records.set('message-1', sendingRecord());
    },
    enqueue: inLaneOfMessages(textPayload()),
    key: 'message-1',
    declined: 'dead-lettered',
    expectDeclinedOnScreen: shownAsDeclined('message-1'),
  },
  {
    name: 'an asset',
    degraded: inConversation,
    prepare: ({records}) => {
      records.set('asset-1', uploadedRecord());
    },
    enqueue: inLaneOfMessages(assetPayload()),
    key: 'asset-1',
    declined: 'dead-lettered',
    expectDeclinedOnScreen: shownAsDeclined('asset-1'),
  },
  {
    name: 'a ping',
    degraded: inConversation,
    enqueue: ({handles}) => {
      return handles.ping.enqueue({
        payload: pingPayload(),
        correlationKey: 'ping-1',
        laneKey: laneOfMessages(CONVERSATION_ID),
      });
    },
    key: 'ping-1',
    declined: 'deleted',
    expectDeclinedOnScreen: ({deleteMessage, conversation}) => {
      expect(deleteMessage).toHaveBeenCalledWith(conversation, 'ping-1');
    },
  },
  {
    name: 'a reaction',
    degraded: inConversation,
    enqueue: changeOf(reactionPayload()),
    key: 'message-1:reaction',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'an edit',
    degraded: inConversation,
    enqueue: changeOf(editPayload()),
    key: 'message-1:edit',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a deletion for everyone',
    degraded: inConversation,
    enqueue: changeOf(deletePayload()),
    key: 'message-1:delete',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a hide',
    degraded: inSelfConversation,
    enqueue: changeOf(hidePayload()),
    key: 'message-1:hide',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a reaction to a message that is still pending',
    degraded: inConversation,
    enqueue: inLaneOfMessages(reactionPayload()),
    key: 'message-1:reaction',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a last read',
    degraded: inSelfConversation,
    enqueue: receiptOf(lastReadPayload(10)),
    key: 'last-read:conversation-1',
    declined: 'deleted',
    expectDeclinedOnScreen: nothingOnScreen,
  },
];

describe('the holds of MessageRepository', () => {
  let parts: OutboxRepository;

  beforeEach(() => {
    parts = createOutboxRepository();
  });

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
  });

  /** This session holds nothing: neither stopping to edit nor allowing to send releases an operation */
  async function expectNothingHeld(): Promise<void> {
    const release = jest.spyOn(parts.kit.outbox, 'release');
    release.mockClear();

    await parts.repository.stopEditing();
    for (const conversation of [parts.conversation, parts.otherConversation, ...parts.selfConversations]) {
      await parts.repository.allowSending(conversation);
    }

    expect(release).not.toHaveBeenCalled();
  }

  function failedMessageIds(): string[] {
    return [...parts.records]
      .filter(([, {status}]) => {
        return status === StatusType.FAILED;
      })
      .map(([messageId]) => {
        return messageId;
      });
  }

  function stateOf(correlationKey: string): string | undefined {
    const findResult = parts.kit.outbox.findByCorrelationKey(correlationKey);
    return findResult.outcome === 'operation-found' ? findResult.operation.state : undefined;
  }

  function editingOf(messageId: string): ContentMessage {
    return {id: messageId} as ContentMessage;
  }

  function editedMessages(): unknown {
    return parts.simpleStorage.get(StorageKey.OUTBOX.EDITED_MESSAGES);
  }

  function seedEditedMessages(entries: Record<string, string>): void {
    parts.simpleStorage.set(StorageKey.OUTBOX.EDITED_MESSAGES, entries);
  }

  describe('asking the user before sending to a degraded conversation', () => {
    describe.each(variants)('$name', variant => {
      beforeEach(async () => {
        variant.prepare?.(parts);
        await parts.kit.start();
      });

      async function enqueueDegraded(): Promise<void> {
        parts.degrade(variant.degraded(parts));
        await variant.enqueue(parts);
        await parts.kit.clock.settle();
      }

      it('is held, and asks the user once, without sending', async () => {
        await enqueueDegraded();

        expect(stateOf(variant.key)).toBe('on-hold');
        expect(parts.prompts).toHaveLength(1);
        expect(parts.prompts[0].conversation).toBe(variant.degraded(parts));
        expect(parts.send).not.toHaveBeenCalled();
      });

      it('is sent when the user accepts', async () => {
        await enqueueDegraded();

        await parts.prompts[0].answer(true);

        expect(parts.send).toHaveBeenCalled();
        expect(failedMessageIds()).toEqual([]);
        expect(stateOf(variant.key)).toBeUndefined();
        await expectNothingHeld();
      });

      it(`is ${variant.declined === 'deleted' ? 'forgotten' : 'dead-lettered'} and never sent when the user declines`, async () => {
        await enqueueDegraded();

        await parts.prompts[0].answer(false);

        expect(parts.send).not.toHaveBeenCalled();
        variant.expectDeclinedOnScreen(parts);
        expect(stateOf(variant.key)).toBe(variant.declined === 'dead-lettered' ? 'dead-lettered' : undefined);
        await expectNothingHeld();
      });

      it('is sent without a prompt when the conversation is not degraded', async () => {
        await variant.enqueue(parts);
        await parts.kit.clock.settle();

        expect(parts.prompts).toHaveLength(0);
        expect(parts.send).toHaveBeenCalled();
      });
    });

    it('sends a confirmation without a prompt, even when the conversation is degraded', async () => {
      await parts.kit.start();
      parts.degrade(parts.conversation);

      await receiptOf(confirmationPayload())(parts);
      await parts.kit.clock.settle();

      expect(parts.prompts).toHaveLength(0);
      expect(parts.send).toHaveBeenCalled();
    });

    it('sends to a self conversation at once, and lets the degraded one next to it wait for the user', async () => {
      const otherSelfConversation = new Conversation('self-2', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      parts.selfConversations.push(otherSelfConversation);
      parts.degrade(otherSelfConversation);
      await parts.kit.start();

      await changeOf(hidePayload())(parts);
      await parts.kit.clock.settle();

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(parts.send.mock.calls[0][0].conversationId).toEqual(parts.selfConversation.qualifiedId);
      expect(
        parts.prompts.map(({conversation}) => {
          return conversation;
        }),
      ).toEqual([otherSelfConversation]);
      expect(stateOf('message-1:hide')).toBe('on-hold');
    });
  });

  describe('holding a message the user edits', () => {
    beforeEach(async () => {
      await parts.kit.start({run: false});
      parts.records.set('message-1', sendingRecord());
      parts.records.set('message-2', sendingRecord());
      await inLaneOfMessages(textPayload())(parts);
      await parts.handles.message.enqueue({
        payload: textPayload({messageId: 'message-2', conversationId: {id: 'conversation-2', domain: 'wire.test'}}),
        correlationKey: 'message-2',
        laneKey: laneOfMessages(OTHER_CONVERSATION_ID),
      });
      await parts.kit.clock.settle();
    });

    it('holds the message, and releases it when the user stops editing', async () => {
      await parts.repository.startEditing(editingOf('message-1'));

      expect(stateOf('message-1')).toBe('on-hold');

      await parts.repository.stopEditing();

      expect(stateOf('message-1')).toBe('queued');
      await expectNothingHeld();
    });

    it('records the edited message for the next session, and forgets it when the user stops editing', async () => {
      await parts.repository.startEditing(editingOf('message-1'));

      expect(editedMessages()).toEqual({[CONVERSATION_ID.id]: 'message-1'});

      await parts.repository.stopEditing();

      expect(editedMessages()).toEqual({});
    });

    it('records nothing when the message could not be held', async () => {
      await parts.repository.startEditing(editingOf('sent-message'));

      expect(editedMessages()).toBeUndefined();
    });

    it('releases the message edited before when the user starts editing another one', async () => {
      await parts.repository.startEditing(editingOf('message-1'));
      await parts.repository.startEditing(editingOf('message-2'));

      expect(stateOf('message-1')).toBe('queued');
      expect(stateOf('message-2')).toBe('on-hold');
    });

    it('keeps the hold when the user starts editing the same message again', async () => {
      await parts.repository.startEditing(editingOf('message-1'));
      jest.spyOn(parts.kit.outbox, 'release');

      await parts.repository.startEditing(editingOf('message-1'));

      expect(parts.kit.outbox.release).not.toHaveBeenCalled();
      expect(stateOf('message-1')).toBe('on-hold');
    });

    it('holds nothing for a message the outbox does not have', async () => {
      await parts.repository.startEditing(editingOf('sent-message'));

      await expectNothingHeld();
    });
  });

  describe('holds that outlive a session', () => {
    function seedOnHold(kind: string, payload: unknown, correlationKey: string, laneKey: string): void {
      parts.kit.store.seed(
        createStoredSnapshot({
          kind,
          id: `stored-${correlationKey}`,
          trigger: 'operation-held',
          state: 'on-hold',
          payload,
          correlation: {state: 'correlated', correlationKey},
          lane: {state: 'in-lane', laneKey},
        }),
      );
    }

    async function startAndReview(): Promise<void> {
      await parts.kit.start();
      parts.repository.reviewRestoredHolds();
      await parts.kit.clock.settle();
    }

    it('leaves a restored hold alone until it is reviewed', async () => {
      parts.degrade(parts.conversation);
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      await parts.kit.start();

      expect(stateOf('message-1')).toBe('on-hold');
      expect(parts.prompts).toHaveLength(0);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('does nothing when the outbox did not start yet', async () => {
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      parts.repository.reviewRestoredHolds();
      await parts.kit.clock.settle();

      expect(parts.prompts).toHaveLength(0);
      expect(parts.send).not.toHaveBeenCalled();
    });

    it('releases a restored hold, whose next attempt asks again when still degraded, and sends on yes', async () => {
      parts.records.set('message-1', sendingRecord());
      parts.degrade(parts.conversation);
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      await startAndReview();

      expect(parts.prompts).toHaveLength(1);
      expect(stateOf('message-1')).toBe('on-hold');
      expect(parts.send).not.toHaveBeenCalled();

      await parts.prompts[0].answer(true);

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(stateOf('message-1')).toBeUndefined();
    });

    it('marks the message as declined and dead-letters it on no', async () => {
      parts.records.set('message-1', sendingRecord());
      parts.degrade(parts.conversation);
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));
      await startAndReview();

      await parts.prompts[0].answer(false);

      expect(parts.send).not.toHaveBeenCalled();
      expect(parts.records.get('message-1')).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
      expect(stateOf('message-1')).toBe('dead-lettered');
      await expectNothingHeld();
    });

    it('drops a restored change on no', async () => {
      parts.degrade(parts.conversation);
      seedOnHold('message-change', reactionPayload(), 'message-1:reaction', laneOfChanges(CONVERSATION_ID));
      await startAndReview();

      await parts.prompts[0].answer(false);

      expect(parts.send).not.toHaveBeenCalled();
      expect(stateOf('message-1:reaction')).toBeUndefined();
    });

    it('releases a restored hold and sends when the conversation is not degraded any more', async () => {
      parts.records.set('message-1', sendingRecord());
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      await startAndReview();

      expect(parts.prompts).toHaveLength(0);
      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(stateOf('message-1')).toBeUndefined();
    });

    it('holds a restored text for editing while it was being edited, even when degraded, until editing stops', async () => {
      parts.records.set('message-1', sendingRecord());
      parts.degrade(parts.conversation);
      seedEditedMessages({[CONVERSATION_ID.id]: 'message-1'});
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      await startAndReview();

      expect(parts.prompts).toHaveLength(0);
      expect(parts.send).not.toHaveBeenCalled();
      expect(stateOf('message-1')).toBe('on-hold');
      expect(editedMessages()).toEqual({[CONVERSATION_ID.id]: 'message-1'});

      await parts.repository.stopEditing();
      await parts.kit.clock.settle();

      expect(parts.prompts).toHaveLength(1);
      expect(editedMessages()).toEqual({});
    });

    it('releases a restored text that another message of its conversation was edited instead of', async () => {
      parts.records.set('message-1', sendingRecord());
      seedEditedMessages({[CONVERSATION_ID.id]: 'message-2'});
      seedOnHold('message', textPayload(), 'message-1', laneOfMessages(CONVERSATION_ID));

      await startAndReview();

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(stateOf('message-1')).toBeUndefined();
      expect(editedMessages()).toEqual({});
    });

    it('releases a restored edit, because only a text message is held for editing', async () => {
      seedEditedMessages({[CONVERSATION_ID.id]: 'message-1'});
      seedOnHold('message-change', editPayload(), 'message-1:edit', laneOfChanges(CONVERSATION_ID));

      await startAndReview();

      expect(parts.send).toHaveBeenCalledTimes(1);
      expect(stateOf('message-1:edit')).toBeUndefined();
    });

    it('leaves a hold alone that this session made', async () => {
      parts.records.set('message-1', sendingRecord());
      await parts.kit.start({run: false});
      await inLaneOfMessages(textPayload())(parts);
      await parts.repository.startEditing(editingOf('message-1'));
      parts.kit.outbox.resume();

      parts.repository.reviewRestoredHolds();
      await parts.kit.clock.settle();

      expect(stateOf('message-1')).toBe('on-hold');
      expect(parts.send).not.toHaveBeenCalled();
      expect(editedMessages()).toEqual({[CONVERSATION_ID.id]: 'message-1'});
    });
  });
});
