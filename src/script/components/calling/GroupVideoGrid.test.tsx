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

import {render, fireEvent} from '@testing-library/react';
import ko from 'knockout';

import {CALL_TYPE, VIDEO_STATE} from '@wireapp/avs';

import {Call} from 'Repositories/calling/Call';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';

import {GroupVideoGrid, GroupVideoGripProps} from './GroupVideoGrid';

jest.mock('@wireapp/api-client/lib/team');

const createMockParticipant = (
  userId: string,
  clientId: string,
  {isMuted = false, isAudioEstablished = true}: {isMuted?: boolean; isAudioEstablished?: boolean},
) => {
  const user = new User(userId);

  const participant = new Participant(user, clientId);
  participant.isMuted(isMuted);
  participant.isAudioEstablished(isAudioEstablished);

  return participant;
};

const createMockCall = () => {
  return new Call(
    {domain: '', id: ''},
    new Conversation('', ''),
    0,
    new Participant(new User(''), ''),
    CALL_TYPE.NORMAL,
    {
      currentAvailableDeviceId: {
        audiooutput: ko.pureComputed(() => 'test'),
      },
    } as MediaDevicesHandler,
  );
};

describe('GroupVideoGrid', () => {
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

    const {getByTestId} = render(<GroupVideoGrid {...props} />);

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

    const {getByTestId} = render(<GroupVideoGrid {...props} />);

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

    const {queryByTestId} = render(<GroupVideoGrid {...props} />);

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

    const {getAllByTestId} = render(<GroupVideoGrid {...props} />);
    const thumbnailElements = getAllByTestId('self-video-thumbnail-wrapper');
    const thumbnailMutedIcons = getAllByTestId('status-call-audio-muted');

    expect(thumbnailElements).not.toHaveLength(0);
    expect(thumbnailMutedIcons).not.toHaveLength(0);
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

    const {queryByTestId} = render(<GroupVideoGrid {...props} />);
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

    const {getAllByText} = render(<GroupVideoGrid {...props} />);
    expect(getAllByText('videoCallParticipantConnecting')).toHaveLength(2);
  });
});
