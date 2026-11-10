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

import {Call} from '../../repositories/calling/Call';
import {Participant} from '../../repositories/calling/Participant';
import {Conversation} from '../../repositories/entity/Conversation';
import {User} from '../../repositories/entity/User';
import {backgroundEffectsStore} from '../../repositories/media/useBackgroundEffectsStore';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
  requireValueForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {translate} from '../../util/localizerUtil';

import {GroupVideoGrid, GroupVideoGripProps} from './GroupVideoGrid';

import {buildMediaDevicesHandler} from '../../auth/util/test/testUtil';
import {translateForTest} from '../../util/test/translateForTest';
import {CONVERSATION_PROTOCOL} from '../../apiClient/team/feature/featureList.types';

jest.mock('../avatar', () => {
  return {
    AVATAR_SIZE: {MEDIUM: 'medium', LARGE: 'large'},
    Avatar: () => {
      return <div data-testid="mock-avatar" />;
    },
  };
});

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createMockParticipant = (
  userId: string,
  clientId: string,
  {isMuted = false, isAudioEstablished = true}: {isMuted?: boolean; isAudioEstablished?: boolean},
): Participant => {
  const user = new User(userId, '', translateForTest);

  const participant = new Participant(user, clientId);
  participant.isMuted(isMuted);
  participant.isAudioEstablished(isAudioEstablished);

  return participant;
};

const createMockCall = (): Call => {
  return new Call(
    {domain: '', id: ''},
    new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
    0,
    new Participant(new User('', '', translateForTest), ''),
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
};

const createMediaStream = (): MediaStream => {
  return {
    getVideoTracks: jest.fn(() => {
      return [];
    }),
  } as unknown as MediaStream;
};

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

  it('minimizes and restores the local preview without changing its video stream', () => {
    const participant = createMockParticipant('self', 'client', {isMuted: true});
    participant.handRaisedAt(1);
    const stream = createMediaStream();
    participant.videoState(VIDEO_STATE.STARTED);
    participant.videoStream(stream);
    const remoteParticipant = createMockParticipant('remote', 'remoteClient', {});
    const remoteStream = createMediaStream();
    remoteParticipant.videoState(VIDEO_STATE.STARTED);
    remoteParticipant.videoStream(remoteStream);

    const props: GroupVideoGripProps = {
      grid: {grid: [remoteParticipant], thumbnail: participant},
      maximizedParticipant: null,
      selfParticipant: participant,
      call: createMockCall(),
      allowSelfVideoMinimize: true,
    };
    const {container, queryByTestId, getByRole, rerender} = render(<GroupVideoGrid {...props} />, {
      wrapper: rootProviderWrapper,
    });
    const remoteVideo = requireValueForTest(container.querySelector('[data-user-id="remote"] video'));
    expect(remoteVideo).toBeVisible();
    expect(container.querySelector('[data-uie-name="mic-icon-off"]')).toBeInTheDocument();
    expect(container.querySelector('.group-video-grid__element__label__hand_icon')).toBeVisible();
    expect(queryByTestId('self-video-preview-window-header')).toBeInTheDocument();

    fireEvent.click(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'}));
    expect(queryByTestId('self-video-thumbnail-wrapper')).toBeInTheDocument();
    const selfPreview = requireValueForTest(queryByTestId('self-video-thumbnail'));
    expect(selfPreview).not.toBeVisible();
    expect(remoteVideo).toBeVisible();
    expect(remoteParticipant.videoStream()).toBe(remoteStream);
    expect(container.querySelector('[data-uie-name="self-preview-muted-indicator"]')).toBeVisible();
    expect(container.querySelector('[data-uie-name="self-preview-hand-raised-indicator"]')).toBeVisible();
    expect(queryByTestId('self-video-preview-window-header')).toBeInTheDocument();
    expect(participant.videoStream()).toBe(stream);

    fireEvent.click(getByRole('button', {name: 'videoCallOverlayRestoreSelfVideo'}));
    expect(queryByTestId('self-video-thumbnail-wrapper')).toBeInTheDocument();
    expect(remoteVideo).toBeVisible();
    expect(participant.videoStream()).toBe(stream);

    fireEvent.click(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'}));
    rerender(<GroupVideoGrid {...props} call={createMockCall()} />);
    expect(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'})).toBeInTheDocument();
  });

  it('minimizes and restores only the self tile in a group grid', () => {
    const selfParticipant = createMockParticipant('self', 'client', {isMuted: true});
    selfParticipant.handRaisedAt(1);
    const stream = createMediaStream();
    selfParticipant.videoState(VIDEO_STATE.STARTED);
    selfParticipant.videoStream(stream);
    const remoteParticipant = createMockParticipant('remote', 'remoteClient', {});
    const remoteStream = createMediaStream();
    remoteParticipant.videoState(VIDEO_STATE.STARTED);
    remoteParticipant.videoStream(remoteStream);
    const props: GroupVideoGripProps = {
      grid: {grid: [selfParticipant, remoteParticipant], thumbnail: null},
      maximizedParticipant: null,
      selfParticipant,
      call: createMockCall(),
      allowSelfVideoMinimize: true,
    };
    const {container, getByRole} = render(<GroupVideoGrid {...props} />, {wrapper: rootProviderWrapper});
    const remoteVideo = requireValueForTest(container.querySelector('[data-user-id="remote"] video'));

    expect(container.querySelector('.group-video-grid__element-video')).toBeInTheDocument();
    expect(remoteVideo).toBeVisible();
    expect(container.querySelector('[data-uie-name="mic-icon-off"]')).toBeInTheDocument();
    expect(container.querySelector('.group-video-grid__element__label__hand_icon')).toBeVisible();
    fireEvent.click(getByRole('button', {name: 'videoCallOverlayMinimizeSelfVideo'}));
    const localVideo = requireValueForTest(container.querySelector('[data-user-id="self"] video'));
    expect(localVideo).not.toBeVisible();
    expect(remoteVideo).toBeVisible();
    expect(getByRole('button', {name: 'videoCallOverlayRestoreSelfVideo'})).toBeInTheDocument();
    expect(selfParticipant.videoStream()).toBe(stream);
    expect(remoteParticipant.videoStream()).toBe(remoteStream);
    expect(container.querySelector('[data-uie-name="self-preview-muted-indicator"]')).toBeVisible();
    expect(container.querySelector('[data-uie-name="self-preview-hand-raised-indicator"]')).toBeVisible();
    expect(
      requireValueForTest(
        container.querySelector<HTMLElement>('[data-uie-name="grids-wrapper"]'),
      ).style.getPropertyValue('--columns'),
    ).toBe('1');

    fireEvent.click(getByRole('button', {name: 'videoCallOverlayRestoreSelfVideo'}));
    expect(container.querySelector('.group-video-grid__element-video')).toBeInTheDocument();
    expect(selfParticipant.videoStream()).toBe(stream);
  });

  it('shows and hides the loading overlay while the raw thumbnail video is loading with background effects disabled', () => {
    const participant = createMockParticipant('userId', 'clientId', {});
    const videoStream = createMediaStream();
    participant.videoState(VIDEO_STATE.STARTED);
    participant.videoStream(videoStream);

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
    const video = requireValueForTest(container.querySelector('[data-uie-name="self-video-thumbnail"]'));

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
