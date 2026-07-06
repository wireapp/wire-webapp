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

import {AddUsersFailureReasons} from '@wireapp/core/lib/conversation';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import en from 'I18n/en-US.json';
import {User} from 'Repositories/entity/User';
import {generateQualifiedIds} from 'src/script/auth/util/test/TestUtil';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {
  formatMeetingPartialAddFailureMessage,
  showMeetingPartialAddFailureModal,
} from './showMeetingPartialAddFailureModal';

setStrings({en});

const createUser = (qualifiedId: {id: string; domain: string}, name: string) => {
  const user = new User(qualifiedId.id, qualifiedId.domain, translateForTest);
  user.name(name);
  return user;
};

describe('formatMeetingPartialAddFailureMessage', () => {
  it('returns an empty string when there are no failed users', () => {
    expect(
      formatMeetingPartialAddFailureMessage(
        [{users: [], backends: [], reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}],
        [],
        translate,
      ),
    ).toBe('');
  });

  it('formats a singular offline backend failure', () => {
    const [qualifiedId] = generateQualifiedIds(1, 'offline.example');
    const user = createUser(qualifiedId, 'Felix');

    const message = formatMeetingPartialAddFailureMessage(
      [
        {
          users: [qualifiedId],
          backends: ['offline.example'],
          reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        },
      ],
      [user],
      translate,
    );

    expect(message).toContain('Felix');
    expect(message).toContain('offline.example');
    expect(message).toContain('could not be added to the group');
  });

  it('formats a plural failure with details', () => {
    const [qualifiedId1, qualifiedId2] = generateQualifiedIds(2, 'test.domain');
    const users = [createUser(qualifiedId1, 'Alice'), createUser(qualifiedId2, 'Bob')];

    const message = formatMeetingPartialAddFailureMessage(
      [
        {
          users: [qualifiedId1, qualifiedId2],
          reason: AddUsersFailureReasons.NOT_MLS_CAPABLE,
        },
      ],
      users,
      translate,
    );

    expect(message).toContain('2 participants');
    expect(message).toContain('Alice');
    expect(message).toContain('Bob');
    expect(message).toContain('MLS-capable clients');
  });
});

describe('showMeetingPartialAddFailureModal', () => {
  const showModalSpy = jest.spyOn(PrimaryModal, 'show');

  beforeEach(() => {
    jest.useFakeTimers();
    showModalSpy.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show a modal when failedToAdd is empty', () => {
    showMeetingPartialAddFailureModal({failedToAdd: [], users: [], translate});

    jest.runAllTimers();

    expect(showModalSpy).not.toHaveBeenCalled();
  });

  it('shows an acknowledge modal with the partial failure message', () => {
    const [qualifiedId] = generateQualifiedIds(1, 'offline.example');
    const user = createUser(qualifiedId, 'Felix');

    showMeetingPartialAddFailureModal({
      failedToAdd: [
        {
          users: [qualifiedId],
          backends: ['offline.example'],
          reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        },
      ],
      users: [user],
      translate,
    });

    expect(showModalSpy).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(showModalSpy).toHaveBeenCalledWith(
      PrimaryModal.type.ACKNOWLEDGE,
      expect.objectContaining({
        text: expect.objectContaining({
          title: translate('meetings.scheduleModal.error.addParticipantsFailed'),
          htmlMessage: expect.stringContaining('Felix'),
        }),
      }),
      undefined,
      translate,
    );
  });
});
