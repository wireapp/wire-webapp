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

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {getMeetingParticipantsForDisplay} from './getMeetingParticipantsForDisplay';

const createUser = (id: string, name: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  return user;
};

describe('getMeetingParticipantsForDisplay', () => {
  it('places the organizer first, followed by the self user and other participants', () => {
    const selfUser = createUser('self', 'Kim Organizer');
    const otherUser = createUser('other', 'Jaqueline Olaho');
    const organizer = createUser('organizer', 'Organizer');

    expect(getMeetingParticipantsForDisplay([otherUser, selfUser, organizer], selfUser, organizer.qualifiedId)).toEqual(
      [organizer, selfUser, otherUser],
    );
  });

  it('handles the production participant list where self is absent', () => {
    const selfUser = createUser('self', 'Kim Self');
    const otherUser = createUser('other', 'Jaqueline Olaho');
    const organizer = createUser('organizer', 'Organizer');

    expect(getMeetingParticipantsForDisplay([otherUser, organizer], selfUser, organizer.qualifiedId)).toEqual([
      organizer,
      selfUser,
      otherUser,
    ]);
  });

  it('places the self user first when they are the organizer', () => {
    const selfUser = createUser('self', 'Kim Organizer');
    const otherUser = createUser('other', 'Jaqueline Olaho');

    expect(getMeetingParticipantsForDisplay([otherUser, selfUser], selfUser, selfUser.qualifiedId)).toEqual([
      selfUser,
      otherUser,
    ]);
  });

  it('falls back to the self user when the organizer is not visible', () => {
    const selfUser = createUser('self', 'Kim Organizer');

    expect(getMeetingParticipantsForDisplay([], selfUser, {id: 'organizer', domain: 'example.com'})).toEqual([
      selfUser,
    ]);
  });

  it('keeps the self user when they are the organizer but are not in the participants list', () => {
    const selfUser = createUser('self', 'Kim Organizer');

    expect(getMeetingParticipantsForDisplay([], selfUser, selfUser.qualifiedId)).toEqual([selfUser]);
  });

  it('places a known organizer first when they are absent from the participant list', () => {
    const selfUser = createUser('self', 'Kim Self');
    const organizer = createUser('organizer', 'Organizer');
    const otherUser = createUser('other', 'Jaqueline Olaho');

    expect(getMeetingParticipantsForDisplay([otherUser], selfUser, organizer.qualifiedId, organizer)).toEqual([
      organizer,
      selfUser,
      otherUser,
    ]);
  });
});
