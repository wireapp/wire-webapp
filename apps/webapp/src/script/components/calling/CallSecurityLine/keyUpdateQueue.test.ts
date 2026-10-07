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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';

import type {CallPerson} from './callPeople';
import {
  createKeyUpdateQueue,
  KEY_UPDATE_HOLD_IN_MILLISECONDS,
  KEY_UPDATE_MAX_IN_A_ROW_IN_MILLISECONDS,
  KEY_UPDATE_QUIET_IN_MILLISECONDS,
  KeyUpdateMessage,
} from './keyUpdateQueue';

const person = (name: string): CallPerson => {
  return {key: `${name}@wire.test`, name};
};

const setUp = () => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
  const messages: Array<KeyUpdateMessage | undefined> = [];
  const queue = createKeyUpdateQueue({
    clock,
    onMessageChange: message => {
      messages.push(message);
    },
  });
  const current = () => {
    return messages[messages.length - 1];
  };

  return {clock, queue, messages, current};
};

describe('createKeyUpdateQueue', () => {
  it('shows one join for 4 s', () => {
    const {clock, queue, current} = setUp();

    queue.push({joined: [person('Alice')], left: []});

    expect(current()).toEqual({type: 'joined', name: 'Alice'});

    clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS - 1);
    expect(current()).toEqual({type: 'joined', name: 'Alice'});

    clock.advanceByMilliseconds(1);
    expect(current()).toBe(undefined);
  });

  it('shows a second change after the first, then a summary of the rest after 30 s of quiet', () => {
    const {clock, queue, current} = setUp();

    queue.push({joined: [person('Alice')], left: []});
    queue.push({joined: [person('Bob')], left: []});
    queue.push({joined: [person('Carol'), person('Dan')], left: [person('Eve')]});

    clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    expect(current()).toEqual({type: 'joined', name: 'Bob'});

    clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    expect(current()).toBe(undefined);

    clock.advanceByMilliseconds(KEY_UPDATE_QUIET_IN_MILLISECONDS);
    expect(current()).toEqual({type: 'summary', joinedCount: 2, leftCount: 1});
  });

  it('shows nothing when a person drops and rejoins before the leave is shown', () => {
    const {queue, current} = setUp();

    queue.push({joined: [person('Alice')], left: []});
    queue.push({joined: [], left: [person('Bob')]});
    queue.push({joined: [person('Bob')], left: []});

    expect(current()).toEqual({type: 'joined', name: 'Alice'});
  });

  it('does not show a rejoin within 60 s as a new join', () => {
    const {clock, queue, messages} = setUp();

    queue.push({joined: [], left: [person('Bob')]});
    clock.advanceByMilliseconds(20_000);
    queue.push({joined: [person('Bob')], left: []});

    expect(messages).toEqual([{type: 'left', name: 'Bob'}, undefined]);
  });

  it('ignores changes while absorbing, for the intro', () => {
    const {clock, queue, messages} = setUp();

    queue.absorbUntil(5000);
    queue.push({joined: [person('Alice')], left: []});
    clock.advanceByMilliseconds(5000);
    queue.push({joined: [person('Bob')], left: []});

    expect(messages).toEqual([{type: 'joined', name: 'Bob'}]);
  });

  it('keeps a burst of 100 joins over 120 s to about 20 s on screen, never more than 8 s in a row', () => {
    const {clock, queue, current} = setUp();
    const stepInMilliseconds = 100;
    let shownInMilliseconds = 0;
    let shownInARowInMilliseconds = 0;
    let longestInARowInMilliseconds = 0;

    for (let elapsed = 0; elapsed < 120_000; elapsed += stepInMilliseconds) {
      if (elapsed % 1200 === 0) {
        queue.push({joined: [person(`Person ${elapsed / 1200}`)], left: []});
      }

      if (current() === undefined) {
        shownInARowInMilliseconds = 0;
      } else {
        shownInMilliseconds += stepInMilliseconds;
        shownInARowInMilliseconds += stepInMilliseconds;
        longestInARowInMilliseconds = Math.max(longestInARowInMilliseconds, shownInARowInMilliseconds);
      }

      clock.advanceByMilliseconds(stepInMilliseconds);
    }

    expect(shownInMilliseconds).toBeLessThanOrEqual(24_000);
    expect(shownInMilliseconds).toBeGreaterThanOrEqual(16_000);
    expect(longestInARowInMilliseconds).toBeLessThanOrEqual(KEY_UPDATE_MAX_IN_A_ROW_IN_MILLISECONDS);
  });
});
