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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team/feature/';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {WebAppEvents} from '@wireapp/webapp-events';
import {act, render, screen, waitFor} from '@testing-library/react';
import {amplify} from 'amplify';
import {task} from 'true-myth';
import {container} from 'tsyringe';

import {useMeetingStore} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {
  MeetingNotificationKind,
  useMeetingNotificationStore,
} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetingStoreRoot} from './meetingStoreRoot';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const selfUserId: QualifiedId = {id: 'self-user-id', domain: 'example.com'};
const otherUserId: QualifiedId = {id: 'other-user-id', domain: 'example.com'};

const createApiMeeting = (title: string, qualifiedId: QualifiedId = meetingId) => ({
  created_at: '2026-06-15T09:00:00.000Z',
  updated_at: '2026-06-15T09:00:00.000Z',
  start_time: '2026-06-16T10:00:00.000Z',
  end_time: '2026-06-16T11:00:00.000Z',
  title,
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  qualified_id: qualifiedId,
  trial: false,
});

const meetingTitlesTestId = 'meeting-titles';

const setMeetingsTeamFeature = (status: FEATURE_STATUS) => {
  act(() => {
    container.resolve(TeamState).teamFeatures({meetings: {status}} as FeatureList);
  });
};

const MeetingTitlesProbe = () => {
  const meetingSeries = useMeetingStore(state => state.meetingSeries);

  return <div data-uie-name={meetingTitlesTestId}>{meetingSeries.map(series => series.title).join(',')}</div>;
};

type RenderParameters = {
  readonly getMeetingsList?: jest.Mock;
  readonly getMeeting?: jest.Mock;
  readonly isMeetingsFeatureEnabled?: boolean;
};

const renderMeetingStoreRoot = ({
  getMeetingsList = jest.fn(() => task.resolve([createApiMeeting('Weekly sync')])),
  getMeeting = jest.fn(() => task.resolve(createApiMeeting('Weekly sync (updated)'))),
  isMeetingsFeatureEnabled = true,
}: RenderParameters = {}) => {
  setMeetingsTeamFeature(isMeetingsFeatureEnabled ? FEATURE_STATUS.ENABLED : FEATURE_STATUS.DISABLED);
  container.resolve(UserState).self(new User(selfUserId.id, selfUserId.domain, translateForTest));

  const mainViewModel = {
    content: {
      repositories: {
        meetings: {getMeetingsList, getMeeting},
        conversation: {},
        calling: {},
      },
    },
  } as unknown as MainViewModel;

  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      wallClock: createDeterministicWallClock(),
      mainViewModel,
      isFeatureToggleEnabled: () => true,
    }),
  );

  const renderResult = render(
    <MeetingStoreRoot>
      <MeetingTitlesProbe />
    </MeetingStoreRoot>,
    {wrapper: rootProviderWrapper},
  );

  return {...renderResult, getMeetingsList, getMeeting};
};

const getRenderedMeetingTitles = () => screen.getByTestId(meetingTitlesTestId).textContent;

describe('MeetingStoreRoot', () => {
  afterEach(() => {
    useMeetingNotificationStore.getState().clearNotifications();
    act(() => {
      container.resolve(TeamState).teamFeatures(undefined);
    });
  });

  it('loads the meetings list once for the signed-in session', async () => {
    const {getMeetingsList} = renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    expect(getMeetingsList).toHaveBeenCalledTimes(1);
  });

  it('syncs a meeting into the store when a meeting created event is published', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => task.resolve([])),
      getMeeting: jest.fn(() => task.resolve(createApiMeeting('Newly created meeting'))),
    });

    amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Newly created meeting');
    });

    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('does not create a notification for the host when a meeting is created', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => task.resolve([])),
      getMeeting: jest.fn(() => task.resolve(createApiMeeting('Newly created meeting'))),
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Newly created meeting');
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('creates notifications while the meetings view is not mounted', async () => {
    renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId, otherUserId);
    });

    await waitFor(() => {
      expect(useMeetingNotificationStore.getState().notifications).toEqual([
        expect.objectContaining({
          kind: MeetingNotificationKind.UPDATE,
          meetingTitle: 'Weekly sync (updated)',
          qualifiedId: meetingId,
        }),
      ]);
    });
  });

  it('does not notify the user who updated the meeting', async () => {
    renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId, selfUserId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync (updated)');
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });

  it('syncs a meeting into the store when a meeting member-added event is published', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => task.resolve([])),
      getMeeting: jest.fn(() => task.resolve(createApiMeeting('Late joiner meeting'))),
    });

    amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, otherUserId);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Late joiner meeting');
    });

    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('creates an update notification from the freshly synced member-added meeting', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => task.resolve([])),
      getMeeting: jest.fn(() => task.resolve(createApiMeeting('Late joiner meeting'))),
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, otherUserId);
    });

    await waitFor(() => {
      expect(useMeetingNotificationStore.getState().notifications).toEqual([
        expect.objectContaining({
          kind: MeetingNotificationKind.UPDATE,
          meetingTitle: 'Late joiner meeting',
          qualifiedId: meetingId,
        }),
      ]);
    });

    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('removes a meeting from the store when a meeting deleted event is published', async () => {
    renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });
  });

  it('creates a cancellation notification before removing a deleted meeting', async () => {
    renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        kind: MeetingNotificationKind.CANCELLED,
        meetingTitle: 'Weekly sync',
        qualifiedId: meetingId,
      }),
    ]);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });
  });

  it('does not add an update notification when a queued sync is followed by deletion', async () => {
    let resolveMeeting: () => void = () => undefined;
    const meetingFetch = new Promise<void>(resolve => {
      resolveMeeting = resolve;
    });
    const getMeeting = jest.fn(() =>
      task.tryOrElse(
        () => new Error('fetch failed'),
        async () => {
          await meetingFetch;
          return createApiMeeting('Weekly sync (updated)');
        },
      ),
    );
    renderMeetingStoreRoot({getMeeting});

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.UPDATED, meetingId, otherUserId);
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);
      resolveMeeting();
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        kind: MeetingNotificationKind.CANCELLED,
        qualifiedId: meetingId,
      }),
    ]);
  });

  it('reloads meetings when missed events are reported', async () => {
    const getMeetingsList = jest
      .fn()
      .mockReturnValueOnce(task.resolve([createApiMeeting('Weekly sync')]))
      .mockReturnValueOnce(task.resolve([createApiMeeting('Weekly sync (refreshed)')]));
    renderMeetingStoreRoot({getMeetingsList});

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    amplify.publish(WebAppEvents.CONVERSATION.MISSED_EVENTS);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync (refreshed)');
    });
    expect(getMeetingsList).toHaveBeenCalledTimes(2);
  });

  it('stops handling meeting lifecycle events after unmounting', async () => {
    const {getMeeting, unmount} = renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    unmount();

    await act(async () => {
      amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId);
      await Promise.resolve();
    });

    expect(getMeeting).not.toHaveBeenCalled();
  });

  it('does not load meeting data when the meetings feature is disabled', async () => {
    const {getMeetingsList} = renderMeetingStoreRoot({isMeetingsFeatureEnabled: false});

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    expect(getMeetingsList).not.toHaveBeenCalled();
  });
});
