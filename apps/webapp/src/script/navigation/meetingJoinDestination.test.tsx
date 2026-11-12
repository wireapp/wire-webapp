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

import {act, fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '../uiKit';
import {task} from 'true-myth';
import {container} from 'tsyringe';

import {MeetingStoreRoot} from '../components/meeting/meetingStore/meetingStoreRoot';
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

import {joinedMeetingDestinationSchema, loginJoinDestination, openLoginMeetingPrep} from './meetingJoinDestination';

const response = {
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  title: 'Link meeting',
  start_time: '2099-01-01T12:00:00Z',
};

describe('meeting link post-login landing', () => {
  afterEach(() => {
    act(() => {
      return useMeetingPrepModal.getState().close();
    });
    jest.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('shows guest preparation without an outer theme provider or the meetings view', () => {
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
    const mainViewModel = {
      content: {
        repositories: {meetings: {getMeetingsList: loadMeetings}, conversation: {}, calling: {}, properties: {}},
      },
      calling: {callingRepository: {}, callActions: {}},
    } as unknown as MainViewModel;
    const joined = joinedMeetingDestinationSchema.parse(response);
    openLoginMeetingPrep(loginJoinDestination(joined), useMeetingPrepModal.getState().open);
    window.history.replaceState({}, '', '/#/conversation/conversation-id/example.com');

    const page = render(
      <MeetingStoreRoot>
        <div>Conversation</div>
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

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Link meeting'})).toBeInTheDocument();
    expect(loadMeetings).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', {name: 'meetings.navigation.title'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'modalConfirmSecondary'}));
    expect(window.location.hash).toBe('#/conversation/conversation-id/example.com');
    page.unmount();
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
          requestPreviewStream={pendingPreview}
          releasePreviewStream={jest.fn()}
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
