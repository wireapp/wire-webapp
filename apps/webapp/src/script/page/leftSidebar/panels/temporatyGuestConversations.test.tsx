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

import {act, render} from '@testing-library/react';
import ko from 'knockout';

import {TemporaryGuestConversations} from './temporatyGuestConversations';

import type {Call} from '../../../repositories/calling/Call';
import {User} from '../../../repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../testSupport/rootContextTestSupport';
import {ContentState, useAppState} from '../../useAppState';
import {translateForTest} from '../../../util/test/translateForTest';
import type {CallingViewModel} from '../../../view_model/CallingViewModel';
import type {ListViewModel} from '../../../view_model/ListViewModel';

jest.mock('../../../components/calling/CallingCell', () => {
  return {
    CallingCell: ({call}: {call: Call}) => {
      return <div data-testid={`call-${call.conversation.id}`} />;
    },
  };
});

describe('TemporaryGuestConversations', () => {
  afterEach(() => {
    useAppState.getState().setContentState(ContentState.WATERMARK);
  });

  it('hides only meeting calls in the sidebar while the Meetings list is open', () => {
    const meetingCall = {
      conversation: {
        id: 'meeting',
        display_name: () => {
          return 'Meeting';
        },
        isMeeting: () => {
          return true;
        },
      },
    } as unknown as Call;
    const normalCall = {
      conversation: {
        id: 'conversation',
        display_name: () => {
          return 'Conversation';
        },
        isMeeting: () => {
          return false;
        },
      },
    } as unknown as Call;
    const callingViewModel = {
      activeCalls: ko.observableArray([meetingCall, normalCall]),
      hasAccessToCamera: () => {
        return true;
      },
    } as unknown as CallingViewModel;
    const selfUser = new User('guest-id', 'example.com', translateForTest);
    const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

    useAppState.getState().setContentState(ContentState.CONVERSATION);
    const {container} = render(
      <TemporaryGuestConversations
        callingViewModel={callingViewModel}
        listViewModel={{} as ListViewModel}
        selfUser={selfUser}
      />,
      {wrapper},
    );
    expect(container.querySelector('[data-testid="call-meeting"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="call-conversation"]')).toBeInTheDocument();

    act(() => {
      useAppState.getState().setContentState(ContentState.MEETINGS);
    });
    expect(container.querySelector('[data-testid="call-meeting"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="call-conversation"]')).toBeInTheDocument();

    act(() => {
      useAppState.getState().setContentState(ContentState.CONVERSATION);
    });
    expect(container.querySelector('[data-testid="call-meeting"]')).toBeInTheDocument();
  });
});
