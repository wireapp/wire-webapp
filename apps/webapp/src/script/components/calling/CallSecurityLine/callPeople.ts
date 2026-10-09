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

import type {Participant} from 'Repositories/calling/Participant';

/** One person in the call. Several devices of the same person are one CallPerson. */
export interface CallPerson {
  readonly key: string;
  readonly name: string;
}

export interface CallPeopleChange {
  readonly joined: CallPerson[];
  readonly left: CallPerson[];
}

/**
 * The people in the call other than me, keyed by qualified user id.
 * Video, mute or speaking changes do not change this set, so they never trigger a key update.
 */
export const getCallPeople = (participants: readonly Pick<Participant, 'user'>[]): ReadonlyMap<string, CallPerson> => {
  const people = new Map<string, CallPerson>();

  participants
    .filter(({user}) => {
      return !user.isMe;
    })
    .forEach(({user}) => {
      const key = `${user.qualifiedId.id}@${user.qualifiedId.domain}`;

      if (!people.has(key)) {
        people.set(key, {key, name: user.name()});
      }
    });

  return people;
};

export const diffCallPeople = (
  previousPeople: ReadonlyMap<string, CallPerson>,
  nextPeople: ReadonlyMap<string, CallPerson>,
): CallPeopleChange => {
  return {
    joined: [...nextPeople.values()].filter(person => {
      return !previousPeople.has(person.key);
    }),
    left: [...previousPeople.values()].filter(person => {
      return !nextPeople.has(person.key);
    }),
  };
};
