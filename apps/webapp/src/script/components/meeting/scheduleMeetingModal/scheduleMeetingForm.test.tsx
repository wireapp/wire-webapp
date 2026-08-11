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

import {render, screen} from '@testing-library/react';
import {maybe} from 'true-myth';

import type {User} from 'Repositories/entity/User';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {ScheduleMeetingForm} from './scheduleMeetingForm';
import {emptyScheduleMeetingFormErrors} from './scheduleMeetingTypes';

describe('ScheduleMeetingForm', () => {
  it('disables browser autocomplete for the meeting title', () => {
    const mainViewModel = {
      content: {
        repositories: {
          conversation: {},
          search: {},
          team: {},
        },
      },
    };

    render(
      withThemeAndRootContext(
        <ScheduleMeetingForm
          mode="create"
          formState={{
            title: '',
            start: maybe.nothing(),
            end: maybe.nothing(),
            recurrence: 'doesNotRepeat',
            selectedUsers: [],
            participantsFilter: '',
          }}
          errors={{...emptyScheduleMeetingFormErrors(), title: undefined}}
          onTitleChange={jest.fn()}
          onStartChange={jest.fn()}
          onEndChange={jest.fn()}
          onRecurrenceChange={jest.fn()}
          onSelectedUsersChange={jest.fn()}
          onParticipantsFilterChange={jest.fn()}
          selfUser={{} as User}
        />,
        createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            mainViewModel: mainViewModel as unknown as MainViewModel,
          }),
        ),
      ),
    );

    expect(screen.getByLabelText('meetings.scheduleModal.titleLabel')).toHaveAttribute('autocomplete', 'off');
  });
});
