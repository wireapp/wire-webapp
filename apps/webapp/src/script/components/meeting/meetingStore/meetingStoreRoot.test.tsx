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
import {FEATURE_STATUS, type FeatureList} from '@wireapp/api-client/lib/team/feature/';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {WebAppEvents} from '../../../webAppEvents';
import {
  act,
  render,
  screen,
  waitFor,
  type Matcher,
  type SelectorMatcherOptions,
  type waitForOptions,
  type MatcherOptions,
  type ByRoleMatcher,
  type ByRoleOptions,
} from '@testing-library/react';
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
import {Config} from 'src/script/Config';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {Core} from 'src/script/service/coreSingleton';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {MeetingStoreRoot} from './meetingStoreRoot';
import type {FunctionComponent} from 'react';
import type {Container} from 'react-dom/client';
import type {OptionsReceived} from '@testing-library/dom/node_modules/pretty-format';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const selfUserId: QualifiedId = {id: 'self-user-id', domain: 'example.com'};
const otherUserId: QualifiedId = {id: 'other-user-id', domain: 'example.com'};
const conversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};

type CreateApiMeetingResult = {
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  title: string;
  qualified_conversation: {id: string; domain: string};
  qualified_creator: {id: string; domain: string};
  qualified_id: {domain: string; id: string};
  tzid: string;
};
const createApiMeeting = (title: string, qualifiedId: QualifiedId = meetingId): CreateApiMeetingResult => {
  return {
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T11:00:00.000Z',
    title,
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    qualified_id: qualifiedId,
    tzid: 'Europe/Berlin',
  };
};

const meetingTitlesTestId = 'meeting-titles';

const setMeetingsTeamFeature = (status: FEATURE_STATUS): void => {
  act(() => {
    container.resolve(TeamState).teamFeatures({meetings: {status}} as FeatureList);
  });
};

const setNegotiatedApiVersion = (apiVersion: number): void => {
  container.resolve(Core).backendFeatures.version = apiVersion;
};

const MeetingTitlesProbe: FunctionComponent = () => {
  const meetingSeries = useMeetingStore(state => {
    return state.meetingSeries;
  });

  return (
    <div data-uie-name={meetingTitlesTestId}>
      {meetingSeries
        .map(series => {
          return series.title;
        })
        .join(',')}
    </div>
  );
};

type RenderParameters = {
  readonly getMeetingsList?: jest.Mock;
  readonly getMeeting?: jest.Mock;
  readonly isMeetingsFeatureEnabled?: boolean;
  readonly apiVersion?: number;
  readonly clock?: ReturnType<typeof createDeterministicClock>;
};

type RenderMeetingStoreRootResult = {
  getMeetingsList: jest.Mock<any, any, any>;
  getMeeting: jest.Mock<any, any, any>;
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (
    baseElement?: Container | (Element | Document) | Array<Container | (Element | Document)> | undefined,
    maxLength?: number | undefined,
    options?: OptionsReceived | undefined,
  ) => void;
  rerender: (ui: React.ReactNode) => void;
  unmount: () => void;
  asFragment: () => DocumentFragment;
  getByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
  getAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
  queryByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
  queryAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
  findByLabelText: (
    id: Matcher,
    options?: SelectorMatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByLabelText: (
    id: Matcher,
    options?: SelectorMatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
  getAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  queryByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
  queryAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  findByPlaceholderText: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByPlaceholderText: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
  getAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
  queryByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
  queryAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
  findByText: (
    id: Matcher,
    options?: SelectorMatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByText: (
    id: Matcher,
    options?: SelectorMatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
  getAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  queryByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
  queryAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  findByAltText: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByAltText: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
  getAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  queryByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
  queryAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  findByTitle: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByTitle: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
  getAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  queryByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
  queryAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  findByDisplayValue: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByDisplayValue: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement;
  getAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
  queryByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement | null;
  queryAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
  findByRole: (
    role: ByRoleMatcher,
    options?: ByRoleOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByRole: (
    role: ByRoleMatcher,
    options?: ByRoleOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
  getByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
  getAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  queryByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
  queryAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
  findByTestId: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement>;
  findAllByTestId: (
    id: Matcher,
    options?: MatcherOptions | undefined,
    waitForElementOptions?: waitForOptions | undefined,
  ) => Promise<HTMLElement[]>;
};
const renderMeetingStoreRoot = ({
  getMeetingsList = jest.fn(() => {
    return task.resolve([createApiMeeting('Weekly sync')]);
  }),
  getMeeting = jest.fn(() => {
    return task.resolve(createApiMeeting('Weekly sync (updated)'));
  }),
  isMeetingsFeatureEnabled = true,
  apiVersion = Config.getConfig().MIN_MEETINGS_SUPPORTED_API_VERSION,
  clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n}),
}: RenderParameters = {}): RenderMeetingStoreRootResult => {
  setMeetingsTeamFeature(isMeetingsFeatureEnabled ? FEATURE_STATUS.ENABLED : FEATURE_STATUS.DISABLED);
  setNegotiatedApiVersion(apiVersion);
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
      clock,
      mainViewModel,
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

const getRenderedMeetingTitles = (): string => {
  return screen.getByTestId(meetingTitlesTestId).textContent;
};

describe('MeetingStoreRoot', () => {
  afterEach(() => {
    useMeetingNotificationStore.getState().clearNotifications();
    act(() => {
      container.resolve(TeamState).teamFeatures(undefined);
    });
    setNegotiatedApiVersion(1);
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
      getMeetingsList: jest.fn(() => {
        return task.resolve([]);
      }),
      getMeeting: jest.fn(() => {
        return task.resolve(createApiMeeting('Newly created meeting'));
      }),
    });

    amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Newly created meeting');
    });

    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('does not create a notification for the host when a meeting is created', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => {
        return task.resolve([]);
      }),
      getMeeting: jest.fn(() => {
        return task.resolve(createApiMeeting('Newly created meeting'));
      }),
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

  it('creates update notifications for existing participants while the meetings view is not mounted', async () => {
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
      getMeetingsList: jest.fn(() => {
        return task.resolve([]);
      }),
      getMeeting: jest.fn(() => {
        return task.resolve(createApiMeeting('Late joiner meeting'));
      }),
    });

    amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, otherUserId);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Late joiner meeting');
    });

    expect(getMeeting).toHaveBeenCalledWith(meetingId);
  });

  it('creates an invite notification from the freshly synced member-added meeting', async () => {
    const {getMeeting} = renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => {
        return task.resolve([]);
      }),
      getMeeting: jest.fn(() => {
        return task.resolve(createApiMeeting('Late joiner meeting'));
      }),
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.MEMBER_ADDED, meetingId, otherUserId);
    });

    await waitFor(() => {
      expect(useMeetingNotificationStore.getState().notifications).toEqual([
        expect.objectContaining({
          kind: MeetingNotificationKind.INVITE,
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
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId, otherUserId);
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

  it('does not notify the user who deleted the meeting', async () => {
    renderMeetingStoreRoot();

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId, selfUserId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });

  it('dismisses leftover meeting cards without a cancellation when the current user deleted the meeting', async () => {
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
          qualifiedId: meetingId,
        }),
      ]);
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId, selfUserId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });

  it('does not add an update notification when a queued sync is followed by deletion', async () => {
    let resolveMeeting: () => void = () => {
      return undefined;
    };
    const meetingFetch = new Promise<void>(resolve => {
      resolveMeeting = resolve;
    });
    const getMeeting = jest.fn(() => {
      return task.tryOrElse(
        () => {
          return new Error('fetch failed');
        },
        async () => {
          await meetingFetch;
          return createApiMeeting('Weekly sync (updated)');
        },
      );
    });
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

  it('replaces update notifications with cancellation when self is removed from the meeting conversation', async () => {
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
          qualifiedId: meetingId,
        }),
      ]);
    });

    act(() => {
      amplify.publish(WebAppEvents.CONVERSATION.SELF_REMOVED, {
        qualifiedConversationId: conversationId,
        initiatedBySelf: false,
      });
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        kind: MeetingNotificationKind.CANCELLED,
        qualifiedId: meetingId,
      }),
    ]);

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });
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

  it('does not load meeting data when the negotiated API version is below 17', async () => {
    const {getMeetingsList} = renderMeetingStoreRoot({
      apiVersion: Config.getConfig().MIN_MEETINGS_SUPPORTED_API_VERSION - 1,
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    expect(getMeetingsList).not.toHaveBeenCalled();
  });

  it('shows an in-app reminder ten minutes before a loaded meeting starts', async () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(Date.parse('2026-06-16T09:49:00.000Z')) * 1_000n,
    });
    renderMeetingStoreRoot({clock});

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      clock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE - 1);
    });
    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);

    act(() => {
      clock.advanceByMilliseconds(1);
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        kind: MeetingNotificationKind.REMINDER,
        meetingTitle: 'Weekly sync',
        meetingStartTime: '2026-06-16T10:00:00.000Z',
        qualifiedId: meetingId,
      }),
    ]);
  });

  it('shows the T-10 reminder for a meeting the signed-in user created', async () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(Date.parse('2026-06-16T09:49:00.000Z')) * 1_000n,
    });
    renderMeetingStoreRoot({
      getMeetingsList: jest.fn(() => {
        return task.resolve([]);
      }),
      getMeeting: jest.fn(() => {
        return task.resolve(createApiMeeting('Newly created meeting'));
      }),
      clock,
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.CREATED, meetingId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Newly created meeting');
    });
    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);

    act(() => {
      clock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      expect.objectContaining({
        kind: MeetingNotificationKind.REMINDER,
        meetingTitle: 'Newly created meeting',
        qualifiedId: meetingId,
      }),
    ]);
  });

  it('does not fire a reminder after the meeting is deleted', async () => {
    const clock = createDeterministicClock({
      initialUnixEpochMicroseconds: BigInt(Date.parse('2026-06-16T09:49:00.000Z')) * 1_000n,
    });
    renderMeetingStoreRoot({clock});

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('Weekly sync');
    });

    act(() => {
      amplify.publish(WebAppEvents.MEETING.DELETED, meetingId, selfUserId);
    });

    await waitFor(() => {
      expect(getRenderedMeetingTitles()).toBe('');
    });

    act(() => {
      clock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });
});
