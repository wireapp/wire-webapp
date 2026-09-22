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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {task} from 'true-myth';

import * as MeetingLinkConfirmation from 'Components/meeting/meetingLinkConfirmation/meetingLinkConfirmation';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {createMeetingStore} from 'Components/meeting/meetingStore/createMeetingStore';
import type {MeetingStoreServiceTasks} from 'Components/meeting/meetingStore/meetingStoreDeps';
import type {MeetingLink} from 'Components/meeting/shared/service/meetingService';
import {MeetingAction} from './meetingAction';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';

import * as ContextMenu from '../../../../../../ui/contextMenu';

const showContextMenuMock = jest.spyOn(ContextMenu, 'showContextMenu');
const showMeetingLinkConfirmationMock = jest.spyOn(MeetingLinkConfirmation, 'showMeetingLinkConfirmation');

const start = new Date('2026-06-15T14:00:00.000Z');
const end = new Date('2026-06-15T15:00:00.000Z');
const series: MeetingSeries = {
  series_start_date: start.toISOString(),
  series_end_date: end.toISOString(),
  duration_ms: end.getTime() - start.getTime(),
  recurrence: 'doesNotRepeat',
  conversation_id: 'conversation-id',
  title: 'Meeting',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  tzid: 'Europe/Berlin',
};

const meetingInstance: MeetingInstance = {
  meetingSeries: series,
  start,
  end,
};

const selfUser = new User('host-id', 'example.com', translateForTest);

const createMeetingStoreForTest = () =>
  createMeetingStore({
    meetingsRepository: {} as MeetingsRepository,
    conversationRepository: {} as ConversationRepository,
    callingRepository: {} as CallingRepository,
    wallClock: createDeterministicWallClock(),
    deviceTimeZone: {ianaTimeZoneId: 'Europe/Berlin'},
    serviceTasks: {
      scheduleMeeting: jest.fn(),
      meetNowMeeting: jest.fn(),
      updateMeeting: jest.fn(),
      deleteMeetingForMe: jest.fn(),
      deleteMeetingForAll: jest.fn(),
    } as MeetingStoreServiceTasks,
  });

const renderAction = (
  now: string,
  user = selfUser,
  wallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: Date.parse(now),
  }),
  mainViewModel = {} as MainViewModel,
) =>
  render(
    <MeetingStoreProvider store={createMeetingStoreForTest()}>
      <ThemeProvider>
        <MeetingAction
          meetingInstance={meetingInstance}
          selfUser={user}
          joinMeeting={() => undefined}
          isJoinDisabled={false}
        />
      </ThemeProvider>
    </MeetingStoreProvider>,
    {
      wrapper: createRootProviderWrapperForTest(
        createRootContextValueForTest({
          fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
          mainViewModel,
          translate: translateForTest,
          wallClock,
        }),
      ),
    },
  );

const clickMeetingLinkMenuEntry = () => {
  const menuArgs = showContextMenuMock.mock.lastCall?.[0];

  if (!menuArgs) {
    throw new Error('Expected context menu to be shown');
  }

  const meetingLinkEntry = menuArgs.entries.find(entry => entry.label === 'meetings.action.meetingLink');

  if (!meetingLinkEntry?.click) {
    throw new Error('Expected meeting link menu entry');
  }

  meetingLinkEntry.click();
};

const clickActionButton = () => {
  const actionButton = screen.getAllByRole('button').at(-1);

  if (!actionButton) {
    throw new Error('Expected meeting action button');
  }

  fireEvent.click(actionButton);
};

describe('MeetingAction', () => {
  it.each([
    ['upcoming', '2026-06-15T13:00:00.000Z'],
    ['ongoing', '2026-06-15T14:30:00.000Z'],
    ['ongoing at the scheduled end', '2026-06-15T15:00:00.000Z'],
    ['past', '2026-06-15T16:00:00.000Z'],
  ])('renders the action button for %s meetings for the host', (_status, now) => {
    renderAction(now);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it.each([
    ['upcoming', '2026-06-15T13:00:00.000Z'],
    ['ongoing', '2026-06-15T14:30:00.000Z'],
    ['past', '2026-06-15T16:00:00.000Z'],
  ])('renders the action button for %s meetings for an invitee', (_status, now) => {
    renderAction(now, new User('invitee-id', 'example.com', translateForTest));

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens the retryable confirmation when loading the meeting link fails', async () => {
    const getMeetingConversationCode = jest.fn().mockReturnValue(task.reject(new Error('get failed')));

    const requestMeetingConversationCode = jest.fn();

    const mainViewModel = {
      content: {
        repositories: {
          conversation: {
            getMeetingConversationCode,
            requestMeetingConversationCode,
          },
        },
      },
    } as unknown as MainViewModel;

    renderAction('2026-06-15T13:00:00.000Z', selfUser, undefined, mainViewModel);

    clickActionButton();
    clickMeetingLinkMenuEntry();

    await waitFor(() =>
      expect(showMeetingLinkConfirmationMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          meetingLinkUnavailable: true,
          meetingLinkUnavailableForHost: true,
          retryMeetingLink: expect.any(Function),
          translate: translateForTest,
        }),
      ),
    );

    expect(requestMeetingConversationCode).not.toHaveBeenCalled();
  });

  it('opens the meeting link confirmation when loading the meeting link succeeds', async () => {
    const meetingLink: MeetingLink = {
      meetingLink: 'https://wire.example/meeting-link',
      hasPassword: false,
    };

    const getMeetingConversationCode = jest.fn().mockReturnValue(task.resolve(meetingLink));

    const requestMeetingConversationCode = jest.fn();

    const mainViewModel = {
      content: {
        repositories: {
          conversation: {
            getMeetingConversationCode,
            requestMeetingConversationCode,
          },
        },
      },
    } as unknown as MainViewModel;

    renderAction('2026-06-15T13:00:00.000Z', selfUser, undefined, mainViewModel);

    clickActionButton();
    clickMeetingLinkMenuEntry();

    await waitFor(() =>
      expect(showMeetingLinkConfirmationMock).toHaveBeenLastCalledWith({
        meetingLink,
        retryMeetingLink: expect.any(Function),
        translate: translateForTest,
      }),
    );

    expect(requestMeetingConversationCode).not.toHaveBeenCalled();
  });

  it('shows the unavailable-link message to a guest without generating a link', async () => {
    const getMeetingConversationCode = jest.fn().mockReturnValue(task.reject(new Error('missing link')));

    const requestMeetingConversationCode = jest.fn();

    const mainViewModel = {
      content: {
        repositories: {
          conversation: {
            getMeetingConversationCode,
            requestMeetingConversationCode,
          },
        },
      },
    } as unknown as MainViewModel;

    renderAction(
      '2026-06-15T13:00:00.000Z',
      new User('invitee-id', 'example.com', translateForTest),
      undefined,
      mainViewModel,
    );

    clickActionButton();
    clickMeetingLinkMenuEntry();

    await waitFor(() =>
      expect(showMeetingLinkConfirmationMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          meetingLinkUnavailable: true,
          meetingLinkUnavailableForHost: false,
          retryMeetingLink: undefined,
          translate: translateForTest,
        }),
      ),
    );

    expect(getMeetingConversationCode).toHaveBeenCalledWith({
      domain: 'example.com',
      id: 'conversation-id',
    });

    expect(requestMeetingConversationCode).not.toHaveBeenCalled();
  });
});
