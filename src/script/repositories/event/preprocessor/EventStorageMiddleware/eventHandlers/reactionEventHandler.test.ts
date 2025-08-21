/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {createMessageAddEvent, createReactionEvent, toSavedEvent} from 'test/helper/EventGenerator';
import {createUuid} from 'Util/uuid';

import {handleReactionEvent} from './reactionEventHandler';

describe('reactionEventHandler', () => {
  it('throws an error if the target message does not exist', async () => {
    const operation = handleReactionEvent(createReactionEvent(createUuid(), '🫶'), {
      findEvent: () => Promise.resolve(undefined),
      selfUserId: createUuid(),
    });

    await expect(operation).rejects.toThrow('Reaction event to a non-existing message');
  });

  describe('legacy reaction format', () => {
    it('successfully updates a message on the legacy reaction format with new reactions when they arrive', async () => {
      const baseReactions = {'first-user': '👍'};
      const baseVersion = 10;
      const targetMessage = toSavedEvent(
        createMessageAddEvent({overrides: {reactions: baseReactions, version: baseVersion}}),
      );
      const reactionEvent = createReactionEvent(createUuid(), '🫶');

      const operation: any = await handleReactionEvent(reactionEvent, {
        findEvent: () => Promise.resolve(targetMessage),
        selfUserId: createUuid(),
      });

      expect(operation.type).toBe('sequential-update');
      expect(operation.updates.reactions).toEqual([
        ['👍', [{domain: '', id: 'first-user'}]],
        ['🫶', [{domain: '', id: reactionEvent.from}]],
      ]);
      expect(operation.updates.version).toEqual(baseVersion + 1);
    });

    it('successfully deletes a reaction from a legacy reaction format', async () => {
      const reactor = createUuid();
      const baseReactions = {[reactor]: '👍'};
      const targetMessage = toSavedEvent(createMessageAddEvent({overrides: {reactions: baseReactions}}));
      const reactionEvent = createReactionEvent(createUuid(), '');
      reactionEvent.from = reactor;

      const operation: any = await handleReactionEvent(reactionEvent, {
        findEvent: () => Promise.resolve(targetMessage),
        selfUserId: createUuid(),
      });

      expect(operation.type).toBe('sequential-update');
      expect(operation.updates.reactions).toEqual([]);
    });
  });
});
