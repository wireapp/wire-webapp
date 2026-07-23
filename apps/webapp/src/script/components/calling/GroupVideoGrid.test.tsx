/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {fireEvent, render} from '@testing-library/react';

import {CALL_TYPE, VIDEO_STATE} from '@wireapp/avs';

import {Call} from 'Repositories/calling/Call';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {backgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translate} from 'Util/localizerUtil';

import {GroupVideoGrid, GroupVideoGripProps} from './GroupVideoGrid';

import {buildMediaDevicesHandler} from '../../auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

jest.mock('Components/avatar', () => ({
  AVATAR_SIZE: {MEDIUM: 'medium', LARGE: 'large'},
  Avatar: () => <div data-testid="mock-avatar" />,
}));

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createMockParticipant = (
  userId: string,
  clientId: string,
  {isMuted = false, isAudioEstablished = true}: {isMuted?: boolean; isAudioEstablished?: boolean},
) => {
  const user = new User(userId, '', translateForTest);

  const participant = new Participant(user, clientId);
  participant.isMuted(isMuted);
  participant.isAudioEstablished(isAudioEstablished);

  return participant;
};

const createMockCall = () => {
  return new Call(
    {domain: '', id: ''},
    new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
    0,
    new Participant(new User('', '', translateForTest), ''),
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
};

const createMediaStream = () =>
  ({
    getVideoTracks: jest.fn(() => []),
  }) as unknown as MediaStream;

const createProcessedVideoStream = (stream: MediaStream) => ({
  stream,
  release: jest.fn(),
});

describe('GroupVideoGrid', () => {
  beforeEach(() => {
    backgroundEffectsStore.setState({
      isInitializing: false,
    });
  });

  it('renders video grids', async () => {
    const selfParticipant = createMockParticipant('selfUser', 'selfClient', {isMuted: true});
    selfParticipant.user.name('Anton Bertha');

    const participant = createMockParticipant('userId', 'clientId', {isMuted: true});
    participant.user.name('Anot Heruser');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [selfParticipant, participant],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: selfParticipant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {getByTestId} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});

    const groupVideoGrid = getByTestId('grids-wrapper');

    expect(groupVideoGrid.children.length).toBe(2);
  });

  it('maximizes a grid on double click', async () => {
    const participant = createMockParticipant('user1', 'clientId1', {});
    participant.user.name('Testing User One');

    const participant2 = createMockParticipant('user2', 'clientId2', {});
    participant2.user.name('Testing User Two');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [participant, participant2],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {getByTestId} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});

    const groupVideoGrid = getByTestId('grids-wrapper');

    expect(groupVideoGrid.children.length).toBe(2);

    const gridFirstChild = groupVideoGrid.children[0];

    fireEvent.doubleClick(gridFirstChild);
    expect(props.setMaximizedParticipant).toHaveBeenCalledWith(participant);
  });

  it('renders a grid with paused video', async () => {
    const participant = createMockParticipant('userId', 'clientId', {isMuted: true});
    participant.user.name('Anton Bertha');
    participant.videoState(VIDEO_STATE.PAUSED);

    const props: GroupVideoGripProps = {
      grid: {
        grid: [participant],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {queryByTestId} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});

    expect(queryByTestId('status-video-paused')).not.toBeNull();
  });

  it('renders thumbnail', async () => {
    const participant = createMockParticipant('userId', 'clientId', {isMuted: true});
    participant.user.name('Anton Bertha');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {getAllByTestId} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});
    const thumbnailElements = getAllByTestId('self-video-thumbnail-wrapper');
    const thumbnailMutedIcons = getAllByTestId('status-call-audio-muted');

    expect(thumbnailElements).not.toHaveLength(0);
    expect(thumbnailMutedIcons).not.toHaveLength(0);
  });

  it('shows and hides the loading overlay while the thumbnail video is loading', () => {
    const participant = createMockParticipant('userId', 'clientId', {});
    const videoStream = createMediaStream();
    participant.videoState(VIDEO_STATE.STARTED);
    participant.videoStream(videoStream);
    participant.processedVideoStream(createProcessedVideoStream(videoStream));

    const props: GroupVideoGripProps = {
      grid: {
        grid: [],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {container} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});
    const video = container.querySelector('[data-uie-name="self-video-thumbnail"]')!;

    expect(container.querySelector('[data-uie-name="background-effect-initializing"]')).toBeInTheDocument();

    fireEvent.canPlay(video);

    expect(container.querySelector('[data-uie-name="background-effect-initializing"]')).not.toBeInTheDocument();
  });

  it('does not render muted thumbnail when un-muted', async () => {
    const participant = createMockParticipant('userId', 'clientId', {});

    const props: GroupVideoGripProps = {
      grid: {
        grid: [],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {queryByTestId} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});
    const thumbnailMutedIcon = queryByTestId('status-call-audio-muted');
    expect(thumbnailMutedIcon).toBeNull();
  });

  it('Does render "connecting..." text for users that are in non established audio state', async () => {
    const participant = createMockParticipant('user1', 'clientId1', {});
    const participant2 = createMockParticipant('user2', 'clientId2', {isAudioEstablished: false});
    const participant3 = createMockParticipant('user3', 'clientId3', {isAudioEstablished: false});

    const props: GroupVideoGripProps = {
      grid: {
        grid: [participant, participant2, participant3],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
      call: createMockCall(),
    };

    const {getAllByText} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});
    expect(getAllByText(translate('videoCallParticipantConnecting'))).toHaveLength(2);
  });
});
