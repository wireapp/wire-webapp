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

import {createOutboxTestKit, createStoredSnapshot, type OutboxTestKit} from '../../../outbox/testing/createOutboxTestKit';

import {messageChangeOrderingKey, messageCorrelationKey, messageOrderingKey, receiptCorrelationKey} from './keys';
import {registerMessageOutboxKinds, type MessageOutboxHandles} from './messageOutboxKinds';
import type {MessageChangePayload, MessagePayload, ReceiptPayload} from './payloads';
import {
  CONVERSATION_ID,
  createFakeMessageOutboxPort,
  sendingRecord,
  type FakeConversation,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
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
} from './testing/payloadFactories';

type Variant = {
  name: string;
  /** The conversation that is degraded */
  degraded: (fake: FakeMessageOutbox) => FakeConversation;
  prepare?: (fake: FakeMessageOutbox) => void;
  enqueue: (handles: MessageOutboxHandles) => Promise<unknown>;
  key: string;
  /** What a decline leaves: a message that failed shows it, anything else is forgotten */
  declined: 'dead-lettered' | 'dropped';
  /** What happens on screen after a decline */
  expectDeclinedOnScreen: (fake: FakeMessageOutbox) => void;
};

const inConversation = (fake: FakeMessageOutbox): FakeConversation => {
  return fake.conversation;
};
const inSelfConversation = (fake: FakeMessageOutbox): FakeConversation => {
  return fake.selfConversation;
};
const nothingOnScreen = (fake: FakeMessageOutbox): void => {
  expect(fake.port.markFailed).not.toHaveBeenCalled();
  expect(fake.port.deleteMessage).not.toHaveBeenCalled();
};

function changeOf(payload: MessageChangePayload) {
  return (handles: MessageOutboxHandles) => {
    return handles.messageChange.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      orderingKey: messageChangeOrderingKey(CONVERSATION_ID),
    });
  };
}

function pendingChangeOf(payload: MessagePayload) {
  return (handles: MessageOutboxHandles) => {
    return handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      orderingKey: messageOrderingKey(CONVERSATION_ID),
    });
  };
}

function receiptOf(payload: ReceiptPayload) {
  return (handles: MessageOutboxHandles) => {
    return handles.receipt.enqueue({
      payload,
      correlationKey: receiptCorrelationKey(payload),
      orderingKey: `${CONVERSATION_ID.id}#receipts`,
    });
  };
}

const textVariant: Variant = {
  name: 'a text',
  degraded: inConversation,
  prepare: ({records}) => {
    records.set('message-1', sendingRecord());
  },
  enqueue: pendingChangeOf(textPayload()),
  key: 'message-1',
  declined: 'dead-lettered',
  expectDeclinedOnScreen: ({port, conversation}) => {
    expect(port.markFailed).toHaveBeenCalledWith(conversation, 'message-1', {reason: 'declined', federation: false});
  },
};

const variants: Variant[] = [
  textVariant,
  {
    name: 'an asset',
    degraded: inConversation,
    prepare: ({records}) => {
      records.set('asset-1', sendingRecord({file: new Blob(['bytes']), hasUploadResult: true}));
    },
    enqueue: pendingChangeOf(assetPayload()),
    key: 'asset-1',
    declined: 'dead-lettered',
    expectDeclinedOnScreen: ({port, conversation}) => {
      expect(port.markFailed).toHaveBeenCalledWith(conversation, 'asset-1', {reason: 'declined', federation: false});
    },
  },
  {
    name: 'a ping',
    degraded: inConversation,
    enqueue: handles => {
      return handles.ping.enqueue({
        payload: pingPayload(),
        correlationKey: 'ping-1',
        orderingKey: messageOrderingKey(CONVERSATION_ID),
      });
    },
    key: 'ping-1',
    declined: 'dropped',
    expectDeclinedOnScreen: ({port, conversation}) => {
      expect(port.deleteMessage).toHaveBeenCalledWith(conversation, 'ping-1');
    },
  },
  {
    name: 'a reaction',
    degraded: inConversation,
    enqueue: changeOf(reactionPayload()),
    key: 'message-1:reaction',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'an edit',
    degraded: inConversation,
    enqueue: changeOf(editPayload()),
    key: 'message-1:edit',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a deletion for everyone',
    degraded: inConversation,
    enqueue: changeOf(deletePayload()),
    key: 'message-1:delete',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a hide',
    degraded: inSelfConversation,
    enqueue: changeOf(hidePayload()),
    key: 'message-1:hide',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a reaction to a message that is still pending',
    degraded: inConversation,
    enqueue: pendingChangeOf(reactionPayload()),
    key: 'message-1:reaction',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
  {
    name: 'a last read',
    degraded: inSelfConversation,
    enqueue: receiptOf(lastReadPayload(10)),
    key: 'last-read:conversation-1',
    declined: 'dropped',
    expectDeclinedOnScreen: nothingOnScreen,
  },
];

describe('asking the user before sending to a degraded conversation', () => {
  let kit: OutboxTestKit;
  let fake: FakeMessageOutbox;
  let handles: MessageOutboxHandles;

  beforeEach(() => {
    kit = createOutboxTestKit();
    fake = createFakeMessageOutboxPort(kit.clock.settle);
    handles = registerMessageOutboxKinds(kit.outbox, fake.port);
  });

  afterEach(() => {
    kit.dispose();
  });

  describe.each(variants)('$name', variant => {
    beforeEach(async () => {
      variant.prepare?.(fake);
      await kit.start();
    });

    it('is held, and asks the user once, without sending', async () => {
      fake.degraded.add(variant.degraded(fake));

      await variant.enqueue(handles);
      await kit.clock.settle();

      expect(kit.findOperation(variant.key)?.state).toBe('on-hold');
      expect(fake.prompts).toHaveLength(1);
      expect(fake.prompts[0].conversation).toBe(variant.degraded(fake));
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
    });

    it('is sent when the user accepts', async () => {
      fake.degraded.add(variant.degraded(fake));
      await variant.enqueue(handles);
      await kit.clock.settle();

      await fake.prompts[0].answer(true);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).toHaveBeenCalled();
      expect(fake.port.markFailed).not.toHaveBeenCalled();
      expect(kit.findOperation(variant.key)).toBeUndefined();
      expect(handles.holds.has(variant.key)).toBe(false);
    });

    it(`is ${variant.declined === 'dropped' ? 'forgotten' : 'dead-lettered'} and never sent when the user declines`, async () => {
      fake.degraded.add(variant.degraded(fake));
      await variant.enqueue(handles);
      await kit.clock.settle();

      await fake.prompts[0].answer(false);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      variant.expectDeclinedOnScreen(fake);
      expect(kit.findOperation(variant.key)?.state).toBe(
        variant.declined === 'dead-lettered' ? 'dead-lettered' : undefined,
      );
      expect(handles.holds.has(variant.key)).toBe(false);
    });

    it('is sent without a prompt when the conversation is not degraded', async () => {
      await variant.enqueue(handles);
      await kit.clock.settle();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).toHaveBeenCalled();
    });
  });

  describe('a confirmation', () => {
    it('is sent without a prompt, even when the conversation is degraded', async () => {
      await kit.start();
      fake.degraded.add(fake.conversation);

      await receiptOf(confirmationPayload())(handles);
      await kit.clock.settle();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).toHaveBeenCalled();
    });
  });

  describe('a self conversation next to one that is degraded', () => {
    it('gets the message at once, and the degraded one waits for the user', async () => {
      const otherSelfConversation = {id: 'self-2'};
      fake.port.selfConversations.mockReturnValue([fake.selfConversation, otherSelfConversation]);
      fake.degraded.add(otherSelfConversation);
      await kit.start();

      await changeOf(hidePayload())(handles);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(fake.port.sendToBackend.mock.calls[0][1]).toBe(fake.selfConversation);
      expect(fake.prompts.map(({conversation}) => {return conversation})).toEqual([otherSelfConversation]);
      expect(kit.findOperation('message-1:hide')?.state).toBe('on-hold');
    });
  });

  describe('holds that outlive a session', () => {
    function seedOnHold(kind: string, payload: unknown, correlationKey: string, orderingKey: string): void {
      kit.store.seed(
        createStoredSnapshot({
          kind,
          id: 'stored',
          trigger: 'operation-held',
          state: 'on-hold',
          payload,
          correlationKey,
          orderingKey,
        }),
      );
    }

    async function startAndOpen(conversation: FakeConversation = fake.conversation): Promise<void> {
      await kit.start();
      await handles.reviewRestoredHolds(conversation);
      await kit.clock.settle();
    }

    it('leaves a restored hold alone until its conversation is opened', async () => {
      fake.degraded.add(fake.conversation);
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);

      await kit.start();
      await kit.clock.settle();

      expect(kit.findOperation('message-1')?.state).toBe('on-hold');
      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
    });

    it('does nothing when the outbox did not start yet', async () => {
      fake.degraded.add(fake.conversation);
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);

      await handles.reviewRestoredHolds(fake.conversation);
      await kit.clock.settle();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
    });

    it('asks again when the conversation is opened and still degraded, and sends on yes', async () => {
      fake.records.set('message-1', sendingRecord());
      fake.degraded.add(fake.conversation);
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);

      await startAndOpen();

      expect(fake.prompts).toHaveLength(1);
      expect(kit.findOperation('message-1')?.state).toBe('on-hold');
      expect(handles.holds.has('message-1')).toBe(true);
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();

      await handles.reviewRestoredHolds(fake.conversation);
      await kit.clock.settle();
      expect(fake.prompts).toHaveLength(1);

      await fake.prompts[0].answer(true);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(kit.findOperation('message-1')).toBeUndefined();
    });

    it('marks the message as declined and dead-letters it on no', async () => {
      fake.records.set('message-1', sendingRecord());
      fake.degraded.add(fake.conversation);
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);
      await startAndOpen();

      await fake.prompts[0].answer(false);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      expect(fake.port.markFailed).toHaveBeenCalledWith(fake.conversation, 'message-1', {
        reason: 'declined',
        federation: false,
      });
      expect(kit.findOperation('message-1')?.state).toBe('dead-lettered');
      expect(handles.holds.has('message-1')).toBe(false);
    });

    it('drops a restored change on no', async () => {
      fake.degraded.add(fake.conversation);
      seedOnHold('message-change', reactionPayload(), 'message-1:reaction', `${CONVERSATION_ID.id}#changes`);
      await startAndOpen();

      await fake.prompts[0].answer(false);
      await kit.clock.settle();

      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      expect(kit.findOperation('message-1:reaction')).toBeUndefined();
    });

    it('releases a restored hold and sends when the conversation is not degraded any more', async () => {
      fake.records.set('message-1', sendingRecord());
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);

      await startAndOpen();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(kit.findOperation('message-1')).toBeUndefined();
    });

    it('leaves a restored edit on hold while the draft edits its message, even when degraded', async () => {
      fake.degraded.add(fake.conversation);
      fake.edited.set(fake.conversation, new Set(['message-1']));
      seedOnHold('message-change', editPayload(), 'message-1:edit', `${CONVERSATION_ID.id}#changes`);

      await startAndOpen();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      expect(kit.findOperation('message-1:edit')?.state).toBe('on-hold');
      expect(handles.holds.has('message-1:edit')).toBe(false);
    });

    it('leaves a restored message on hold while the draft edits it, even when degraded', async () => {
      fake.degraded.add(fake.conversation);
      fake.edited.set(fake.conversation, new Set(['message-1']));
      seedOnHold('message', textPayload(), 'message-1', CONVERSATION_ID.id);

      await startAndOpen();

      expect(fake.prompts).toHaveLength(0);
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      expect(kit.findOperation('message-1')?.state).toBe('on-hold');
    });

    it('releases a restored edit that the draft does not edit', async () => {
      seedOnHold('message-change', editPayload(), 'message-1:edit', `${CONVERSATION_ID.id}#changes`);

      await startAndOpen();

      expect(fake.port.sendToBackend).toHaveBeenCalledTimes(1);
      expect(kit.findOperation('message-1:edit')).toBeUndefined();
    });

    it('ignores the holds of other conversations', async () => {
      seedOnHold('message-change', editPayload(), 'message-1:edit', `${CONVERSATION_ID.id}#changes`);

      await startAndOpen(fake.otherConversation);

      expect(fake.port.sendToBackend).not.toHaveBeenCalled();
      expect(kit.findOperation('message-1:edit')?.state).toBe('on-hold');
    });

    it('leaves a hold alone that this session registered', async () => {
      await kit.start({run: false});
      const payload = editPayload();
      await handles.messageChange.enqueue({
        payload,
        correlationKey: 'message-1:edit',
        orderingKey: messageChangeOrderingKey(CONVERSATION_ID),
      });

      handles.holds.add('message-1:edit');
      await kit.outbox.hold('message-1:edit');
      kit.outbox.resume();
      await handles.reviewRestoredHolds(fake.conversation);
      await kit.clock.settle();

      expect(kit.findOperation('message-1:edit')?.state).toBe('on-hold');
      expect(fake.port.sendToBackend).not.toHaveBeenCalled();

      handles.holds.remove('message-1:edit');
      await kit.outbox.drop('message-1:edit');
    });
  });
});
