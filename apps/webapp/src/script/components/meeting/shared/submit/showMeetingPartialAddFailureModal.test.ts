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

import assert from 'node:assert';

import {isNonEmptyString} from '@sindresorhus/is';
import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import {createElement} from 'react';

import {render} from '@testing-library/react';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {MessageContent} from 'Components/Modals/PrimaryModal/Content/MessageContent';
import en from 'I18n/en-US.json';
import {User} from 'Repositories/entity/User';
import {generateQualifiedIds} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
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
    expect(message).toContain('devices that are MLS-capable');
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

  it('includes a React translation for every plural failure detail', () => {
    const qualifiedIds = generateQualifiedIds(8, 'backend.example');
    const users = [
      createUser(qualifiedIds[0], 'R&D <Test>'),
      createUser(qualifiedIds[1], '[link]Admin[/link]'),
      createUser(qualifiedIds[2], 'Carol'),
      createUser(qualifiedIds[3], 'Dave'),
      createUser(qualifiedIds[4], 'Eve'),
      createUser(qualifiedIds[5], 'Frank'),
      createUser(qualifiedIds[6], 'Grace'),
      createUser(qualifiedIds[7], 'Heidi'),
    ];
    const failedToAdd: AddUsersFailure[] = [
      {
        users: [qualifiedIds[0], qualifiedIds[1]],
        backends: ['backend.<example>'],
        reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
      },
      {
        users: [qualifiedIds[2], qualifiedIds[3]],
        backends: ['backend.<example>'],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
      },
      {
        users: [qualifiedIds[4], qualifiedIds[5]],
        reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG,
      },
      {
        users: [qualifiedIds[6], qualifiedIds[7]],
        reason: AddUsersFailureReasons.NOT_MLS_CAPABLE,
      },
    ];

    showMeetingPartialAddFailureModal({failedToAdd, users, translate});
    jest.runAllTimers();

    const translatedMessage = showModalSpy.mock.calls[0][1].text?.translatedMessage;
    expect(translatedMessage).toMatchObject({kind: 'sequence'});

    assert(translatedMessage?.kind === 'sequence');

    expect(
      translatedMessage.messages.map(message => {
        return message.translationKey;
      }),
    ).toEqual([
      'failedToAddParticipantsPlural',
      'failedToAddParticipantsPluralDetailsNonFederatingBackends',
      'failedToAddParticipantsPluralDetailsOfflineBackend',
      'failedToAddParticipantsPluralDetailsOfflineForTooLong',
      'failedToAddParticipantsPluralDetailsNotMlsCapable',
    ]);
    expect(translatedMessage.messages[0].values[0].runtimeText).toBe('8');
    expect(translatedMessage.messages[1].values).toEqual([
      expect.objectContaining({placeholder: 'name', runtimeText: 'R&D <Test>'}),
      expect.objectContaining({placeholder: 'names', runtimeText: '[link]Admin[/link]'}),
    ]);
    expect(translatedMessage.messages[2].values).toEqual([
      expect.objectContaining({placeholder: 'name', runtimeText: 'Carol'}),
      expect.objectContaining({placeholder: 'names', runtimeText: 'Dave'}),
      expect.objectContaining({placeholder: 'domain', runtimeText: 'backend.<example>'}),
    ]);

    const messageHtml = showModalSpy.mock.calls[0][1].text?.htmlMessage;
    assert(isNonEmptyString(messageHtml));

    const {container} = render(
      createElement(MessageContent, {
        message: null,
        messageHtml,
        translatedMessage,
        translate,
      }),
      {
        wrapper: createRootProviderWrapperForTest(
          createRootContextValueForTest({
            isFeatureToggleEnabled(featureName) {
              return featureName === reactTranslationRenderingFeatureToggleName;
            },
            translate,
          }),
        ),
      },
    );

    expect(container.querySelectorAll('strong')).toHaveLength(10);
    expect(container.querySelectorAll('br')).toHaveLength(4);
    expect(container).toHaveTextContent('R&D <Test>');
    expect(container).toHaveTextContent('[link]Admin[/link]');
    expect(container).toHaveTextContent('backend.<example>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('test')).toBeNull();
    expect(container.querySelector('example')).toBeNull();
  });
});
