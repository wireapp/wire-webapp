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

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {noop} from 'noop-esm';
import {ThemeProvider} from '../uiKit';
import {Maybe, task} from 'true-myth';
import {container} from 'tsyringe';

import {MeetingStoreRoot} from '../components/meeting/meetingStore/meetingStoreRoot';
import {Meetings} from '../components/meeting/meetings';
import {MeetingPrepModal} from '../components/meeting/meetingPrep/meetingPrepModal';
import {
  meetingPrepPreviewErrors,
  type RequestMeetingPrepPreview,
} from '../components/meeting/meetingPrep/meetingPrepTypes';
import {useMeetingPrepModal} from '../components/meeting/meetingPrep/useMeetingPrepModal';
import {User} from '../repositories/entity/User';
import {MediaStreamHandler} from '../repositories/media/MediaStreamHandler';
import {UserState} from '../repositories/user/userState';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../page/testSupport/rootContextTestSupport';
import type {MainViewModel} from '../view_model/MainViewModel';
import {translateForTest} from '../util/test/translateForTest';

import {
  isLoginMeetingDestination,
  joinedMeetingDestinationSchema,
  loginJoinDestination,
  meetingJoinLandingPath,
  openLoginMeetingPrep,
  replaceLoginMeetingRoute,
} from './meetingJoinDestination';

const response = {
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  title: 'Link meeting',
  start_time: '2099-01-01T12:00:00Z',
  end_time: '2099-01-01T13:00:00Z',
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  tzid: 'Europe/Berlin',
  has_password: false,
};

describe('meeting link post-login landing', () => {
  afterEach(() => {
    act(() => {
      return useMeetingPrepModal.getState().close();
    });
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it.each([
    {isTemporaryGuest: true, canOpenMeetingsTab: false, expectedHash: '#/meetings/meeting-id/example.com'},
    {isTemporaryGuest: false, canOpenMeetingsTab: false, expectedHash: '#/meetings/meeting-id/example.com'},
    {isTemporaryGuest: false, canOpenMeetingsTab: true, expectedHash: '#/meetings'},
  ])('replaces an old conversation route before meeting preparation for $expectedHash', scenario => {
    window.history.replaceState(
      {eventKey: 'previous'},
      '',
      '/?enabled-features=mark-as-unread#/conversation/old-id/example.com',
    );
    const historyLength = window.history.length;
    const session = joinedMeetingDestinationSchema.parse(response).meetingPrep;

    replaceLoginMeetingRoute(session, scenario.isTemporaryGuest, scenario.canOpenMeetingsTab);

    expect(window.location.hash).toBe(scenario.expectedHash);
    expect(window.location.search).toBe('?enabled-features=mark-as-unread');
    expect(window.history.state).toEqual({eventKey: 'previous'});
    expect(window.history.length).toBe(historyLength);
  });

  it('shows guest preparation over only the joined meeting and leaves it visible after dismissal', async () => {
    const participant = new User('guest-id', 'example.com', translateForTest);
    participant.name('Guest');
    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(participant);
    const testContainer = container.createChildContainer();
    testContainer.registerInstance(MediaStreamHandler, {
      requestMediaStream: jest.fn(() => {
        return new Promise<MediaStream>(() => {
          return undefined;
        });
      }),
      releaseTracksFromStream: jest.fn(),
    } as unknown as MediaStreamHandler);
    jest.spyOn(container, 'resolve').mockImplementation(testContainer.resolve.bind(testContainer));
    const loadMeetings = jest.fn();
    const getMeeting = jest.fn().mockReturnValue(task.resolve(response));
    const mainViewModel = {
      content: {
        repositories: {
          meetings: {getMeetingsList: loadMeetings, getMeeting},
          conversation: {},
          calling: {},
          properties: {},
        },
      },
      calling: {callingRepository: {}, callActions: {}},
    } as unknown as MainViewModel;
    const joined = joinedMeetingDestinationSchema.parse(response);
    expect(meetingJoinLandingPath(joined.meetingPrep, true, false)).toBe('/meetings/meeting-id/example.com');
    openLoginMeetingPrep(loginJoinDestination(joined), useMeetingPrepModal.getState().open);
    window.history.replaceState({}, '', '/#/meetings/meeting-id/example.com');

    const renderPage = (): ReturnType<typeof render> => {
      return render(
        <MeetingStoreRoot>
          <Meetings linkedMeetingId={response.qualified_id} />
        </MeetingStoreRoot>,
        {
          wrapper: createRootProviderWrapperForTest(
            createRootContextValueForTest({
              translate: translateForTest,
              mainViewModel,
              fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
            }),
          ),
        },
      );
    };
    const page = renderPage();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Link meeting'})).toBeInTheDocument();
    await waitFor(() => {
      expect(page.container.querySelector('[data-uie-name="meetings-list"]')).toBeInTheDocument();
    });
    expect(getMeeting).toHaveBeenCalledWith(response.qualified_id);
    expect(loadMeetings).not.toHaveBeenCalled();
    expect(page.container.querySelector('header button')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(page.container.querySelector('[data-uie-name="meetings-list"]')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/meetings/meeting-id/example.com');
    page.unmount();

    const reloaded = renderPage();
    await waitFor(() => {
      expect(getMeeting).toHaveBeenCalledTimes(2);
      expect(reloaded.container.querySelector('[data-uie-name="meetings-list"]')).toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the unavailable state after a failed read and allows retry', async () => {
    const participant = new User('guest-id', 'example.com', translateForTest);
    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(participant);
    const getMeeting = jest
      .fn()
      .mockReturnValueOnce(task.reject(new Error('Not found')))
      .mockReturnValueOnce(task.resolve(response));
    const mainViewModel = {
      content: {repositories: {meetings: {getMeeting}, conversation: {}, calling: {}, properties: {}}},
      calling: {callingRepository: {}, callActions: {}},
    } as unknown as MainViewModel;
    const page = render(
      <ThemeProvider>
        <MeetingStoreRoot>
          <Meetings linkedMeetingId={response.qualified_id} />
        </MeetingStoreRoot>
      </ThemeProvider>,
      {
        wrapper: createRootProviderWrapperForTest(
          createRootContextValueForTest({translate: translateForTest, mainViewModel}),
        ),
      },
    );
    await waitFor(() => {
      expect(page.container.querySelector('[data-uie-name="linked-meeting-unavailable"]')).toBeInTheDocument();
    });
    expect(screen.getByText('meetings.list.reopenInviteLink')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.list.refresh'}));
    await waitFor(() => {
      expect(page.container.querySelector('[data-uie-name="meetings-list"]')).toBeInTheDocument();
    });
    expect(getMeeting).toHaveBeenCalledTimes(2);
  });

  it('does not show a late response from a previously opened linked meeting', async () => {
    const participant = new User('guest-id', 'example.com', translateForTest);
    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(participant);
    let finishFirstRead: () => void = noop;
    const firstRead = new Promise<void>(resolve => {
      finishFirstRead = resolve;
    });
    const secondMeeting = {
      ...response,
      qualified_id: {id: 'second-id', domain: 'example.com'},
      title: 'Second meeting',
      start_time: '2020-01-01T12:00:00Z',
      end_time: '2020-01-01T13:00:00Z',
    };
    const getMeeting = jest.fn((meetingId: {id: string}) => {
      return meetingId.id === response.qualified_id.id
        ? task.tryOrElse(
            () => {
              return new Error('Meeting read failed');
            },
            async () => {
              await firstRead;
              return response;
            },
          )
        : task.resolve(secondMeeting);
    });
    const mainViewModel = {
      content: {repositories: {meetings: {getMeeting}, conversation: {}, calling: {}, properties: {}}},
      calling: {callingRepository: {}, callActions: {}},
    } as unknown as MainViewModel;
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        mainViewModel,
        clock: createDeterministicClock({
          initialUnixEpochMicroseconds: BigInt(Date.parse('2026-06-15T12:00:00Z')) * 1_000n,
        }),
      }),
    );
    const page = render(
      <ThemeProvider>
        <MeetingStoreRoot>
          <Meetings linkedMeetingId={response.qualified_id} />
        </MeetingStoreRoot>
      </ThemeProvider>,
      {wrapper},
    );

    page.rerender(
      <ThemeProvider>
        <MeetingStoreRoot>
          <Meetings linkedMeetingId={secondMeeting.qualified_id} />
        </MeetingStoreRoot>
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(getMeeting).toHaveBeenCalledTimes(2);
      expect(page.container.querySelector('[data-uie-name="meetings-list-loading"]')).not.toBeInTheDocument();
      expect(page.container.querySelector('[data-uie-name="meetings-list"]')).not.toBeInTheDocument();
    });

    await act(async () => {
      finishFirstRead();
      await firstRead;
    });
    expect(page.container.querySelector('[data-uie-name="meetings-list"]')).not.toBeInTheDocument();
    expect(getMeeting).toHaveBeenCalledTimes(2);
  });

  it('opens prep for the joined meeting without joining the call automatically', () => {
    const participant = new User('guest-id', 'example.com', translateForTest);
    participant.name('Guest');
    const joinMeeting = jest.fn().mockResolvedValue(true);
    const pendingPreview: RequestMeetingPrepPreview = () => {
      return task.tryOrElse(
        () => {
          return meetingPrepPreviewErrors.requestFailed;
        },
        () => {
          return new Promise<MediaStream>(() => {
            return undefined;
          });
        },
      );
    };
    render(
      <ThemeProvider>
        <MeetingPrepModal
          participant={participant}
          isCallInProgress={false}
          invitees={[]}
          brandName="Wire"
          openTroubleshooting={Maybe.nothing()}
          requestPreviewStream={pendingPreview}
          releasePreviewStream={jest.fn()}
          playSpeakerTest={() => {
            return task.resolve(undefined);
          }}
          joinMeeting={joinMeeting}
        />
      </ThemeProvider>,
      {
        wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
      },
    );
    const joined = joinedMeetingDestinationSchema.parse(response);
    const persisted = JSON.parse(JSON.stringify(loginJoinDestination(joined)));
    let opened = false;
    act(() => {
      opened = openLoginMeetingPrep(persisted, useMeetingPrepModal.getState().open);
    });
    expect(opened).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Link meeting'})).toBeInTheDocument();
    expect(joinMeeting).not.toHaveBeenCalled();
    expect(useMeetingPrepModal.getState().session.isJust).toBe(true);
  });

  it('preserves group conversation destinations without opening meeting prep', () => {
    const open = jest.fn();
    const destination = loginJoinDestination({conversation: response.qualified_conversation});
    expect(openLoginMeetingPrep(destination, open)).toBe(false);
    expect(destination).toEqual({conversation: 'conversation-id', domain: 'example.com'});
    expect(open).not.toHaveBeenCalled();
    expect(isLoginMeetingDestination(destination)).toBe(false);
  });

  it('keeps the normal Meetings tab for members who have it', () => {
    const joined = joinedMeetingDestinationSchema.parse(response);
    expect(meetingJoinLandingPath(joined.meetingPrep, false, true)).toBe('/meetings');
  });

  it('rejects incomplete joined meeting data instead of silently navigating to its conversation', () => {
    expect(
      joinedMeetingDestinationSchema.safeParse({qualified_conversation: response.qualified_conversation}).success,
    ).toBe(false);
  });

  it.each(['not-a-date', '2026-13-01T12:00:00Z', '2026-01-01T12:00:00'])(
    'rejects invalid meeting times: %s',
    startTime => {
      expect(joinedMeetingDestinationSchema.safeParse({...response, start_time: startTime}).success).toBe(false);
      const joined = joinedMeetingDestinationSchema.parse(response);
      const open = jest.fn();
      expect(openLoginMeetingPrep({meetingPrep: {...joined.meetingPrep, meetingStartTime: startTime}}, open)).toBe(
        false,
      );
      expect(open).not.toHaveBeenCalled();
    },
  );
});
