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

import type {Clock, TimeoutIdentifier} from '@enormora/clock/clock';

import type {CallPeopleChange, CallPerson} from './callPeople';

/** How long one "Updating encryption keys" message stays on screen. */
export const KEY_UPDATE_HOLD_IN_MILLISECONDS = 4000;
/** The message never stays on screen longer than this in a row. */
export const KEY_UPDATE_MAX_IN_A_ROW_IN_MILLISECONDS = 8000;
/** After the cap is hit, changes are only counted during this period, then shown as one summary. */
export const KEY_UPDATE_QUIET_IN_MILLISECONDS = 30_000;

export type KeyUpdateMessage =
  | {readonly type: 'joined'; readonly name: string}
  | {readonly type: 'left'; readonly name: string}
  | {readonly type: 'summary'; readonly joinedCount: number; readonly leftCount: number};

interface KeyUpdateEvent {
  readonly type: 'joined' | 'left';
  readonly person: CallPerson;
}

export interface KeyUpdateQueue {
  /** Changes before this time are ignored. Used to let the intro sentence finish undisturbed. */
  readonly absorbUntil: (unixEpochMilliseconds: number) => void;
  readonly push: (change: CallPeopleChange) => void;
  readonly dispose: () => void;
}

interface KeyUpdateQueueOptions {
  readonly clock: Clock;
  readonly onMessageChange: (message: KeyUpdateMessage | undefined) => void;
}

const toMessage = ({type, person}: KeyUpdateEvent): KeyUpdateMessage => {
  return type === 'joined' ? {type: 'joined', name: person.name} : {type: 'left', name: person.name};
};

const toSummaryMessage = (events: KeyUpdateEvent[]): KeyUpdateMessage => {
  if (events.length === 1) {
    return toMessage(events[0]);
  }

  const joinedCount = events.filter(({type}) => {
    return type === 'joined';
  }).length;

  return {type: 'summary', joinedCount, leftCount: events.length - joinedCount};
};

/**
 * Turns join and leave changes into the messages shown on the call security line:
 * - each change shows for 4 s; a second one waits its turn
 * - never more than 8 s in a row: any further change starts a 30 s quiet period where changes are only counted
 * - at the end of a quiet period, one summary, followed by another quiet period while changes keep coming
 * - a person who drops and comes back before their leave has shown shows nothing; once a leave has shown,
 *   coming back shows as joined, because the keys are updated again
 */
export const createKeyUpdateQueue = ({clock, onMessageChange}: KeyUpdateQueueOptions): KeyUpdateQueue => {
  let isShowing = false;
  let isQuiet = false;
  let shownInARowInMilliseconds = 0;
  let pendingEvent: KeyUpdateEvent | undefined;
  let countedEvents: KeyUpdateEvent[] = [];
  let absorbedUntil = 0;
  let timeoutIdentifier: TimeoutIdentifier | undefined;

  const schedule = (handler: () => void, delayInMilliseconds: number) => {
    timeoutIdentifier = clock.setTimeout(() => {
      timeoutIdentifier = undefined;
      handler();
    }, delayInMilliseconds);
  };

  const hide = () => {
    isShowing = false;
    onMessageChange(undefined);
  };

  const show = (message: KeyUpdateMessage, onHoldEnd: () => void) => {
    isShowing = true;
    shownInARowInMilliseconds += KEY_UPDATE_HOLD_IN_MILLISECONDS;
    onMessageChange(message);
    schedule(onHoldEnd, KEY_UPDATE_HOLD_IN_MILLISECONDS);
  };

  const startQuiet = () => {
    isQuiet = true;
    shownInARowInMilliseconds = 0;
    schedule(endQuiet, KEY_UPDATE_QUIET_IN_MILLISECONDS);
  };

  const endQuiet = () => {
    const events = countedEvents;
    countedEvents = [];

    if (events.length === 0) {
      isQuiet = false;
      return;
    }

    // isQuiet stays on while the summary shows, so changes keep being counted for the next one.
    show(toSummaryMessage(events), () => {
      hide();
      startQuiet();
    });
  };

  const endHold = () => {
    if (pendingEvent !== undefined) {
      const nextEvent = pendingEvent;
      pendingEvent = undefined;
      show(toMessage(nextEvent), endHold);
      return;
    }

    hide();

    if (countedEvents.length > 0) {
      startQuiet();
    } else {
      shownInARowInMilliseconds = 0;
    }
  };

  const enqueue = (event: KeyUpdateEvent) => {
    if (isQuiet) {
      countedEvents.push(event);
      return;
    }

    if (!isShowing) {
      shownInARowInMilliseconds = 0;
      show(toMessage(event), endHold);
      return;
    }

    const fitsInARow =
      shownInARowInMilliseconds + KEY_UPDATE_HOLD_IN_MILLISECONDS <= KEY_UPDATE_MAX_IN_A_ROW_IN_MILLISECONDS;

    if (pendingEvent === undefined && fitsInARow) {
      pendingEvent = event;
      return;
    }

    countedEvents.push(event);
  };

  const isLeaveOf = (personKey: string) => {
    return ({type, person}: KeyUpdateEvent) => {
      return type === 'left' && person.key === personKey;
    };
  };

  /** Drops a leave that has not shown yet. Returns whether there was one. */
  const dropUnshownLeave = (personKey: string): boolean => {
    if (pendingEvent !== undefined && isLeaveOf(personKey)(pendingEvent)) {
      pendingEvent = undefined;
      return true;
    }

    const countedCount = countedEvents.length;
    countedEvents = countedEvents.filter(event => {
      return !isLeaveOf(personKey)(event);
    });

    return countedEvents.length < countedCount;
  };

  return {
    absorbUntil: unixEpochMilliseconds => {
      absorbedUntil = unixEpochMilliseconds;
    },

    push: ({joined, left}) => {
      if (clock.currentUnixEpochMilliseconds < absorbedUntil) {
        return;
      }

      left.forEach(person => {
        enqueue({type: 'left', person});
      });

      joined.forEach(person => {
        // A quick drop and return that nobody saw: show neither the leave nor the join.
        if (!dropUnshownLeave(person.key)) {
          enqueue({type: 'joined', person});
        }
      });
    },

    dispose: () => {
      if (timeoutIdentifier !== undefined) {
        clock.clearTimeout(timeoutIdentifier);
        timeoutIdentifier = undefined;
      }
    },
  };
};
