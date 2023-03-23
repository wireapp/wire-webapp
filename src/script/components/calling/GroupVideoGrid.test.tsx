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

import {VIDEO_STATE} from '@wireapp/avs';

import {User} from 'Entities/User';

import {GroupVideoGrid, GroupVideoGripProps} from './GroupVideoGrid';

import {Participant} from '../../calling/Participant';

describe('GroupVideoGrid', () => {
  it('renders video grids', async () => {
    const self = new User('self');
    self.name('Anton Bertha');

    const user = new User('user1');
    user.name('Anot Heruser');

    const selfParticipant = new Participant(self, 'selfClient');
    const participant = new Participant(user, 'otherClient');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [selfParticipant, participant],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: selfParticipant,
      setMaximizedParticipant: jest.fn(),
    };

    const {getByTestId} = render(<GroupVideoGrid {...props} />);

    const groupVideoGrid = getByTestId('grids-wrapper');

    expect(groupVideoGrid.children.length).toBe(2);
  });

  it('maximizes a grid on double click', async () => {
    const userOne = new User('idOne');
    userOne.name('Testing User One');

    const userTwo = new User('idTwo');
    userOne.name('Testing User Two');

    const participantOne = new Participant(userOne, 'exampleOne');
    const participantTwo = new Participant(userTwo, 'exampleTwo');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [participantOne, participantTwo],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participantOne,
      setMaximizedParticipant: jest.fn(),
    };

    const {getByTestId} = render(<GroupVideoGrid {...props} />);

    const groupVideoGrid = getByTestId('grids-wrapper');

    expect(groupVideoGrid.children.length).toBe(2);

    const gridFirstChild = groupVideoGrid.children[0];

    fireEvent.doubleClick(gridFirstChild);
    expect(props.setMaximizedParticipant).toHaveBeenCalledWith(participantOne);
  });

  it('renders a grid with paused video', async () => {
    const user = new User('id');
    user.name('Anton Bertha');

    const participant = new Participant(user, 'example');
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
    };

    const {queryByTestId} = render(<GroupVideoGrid {...props} />);

    expect(queryByTestId('status-video-paused')).not.toBeNull();
  });

  it('renders thumbnail', async () => {
    const user = new User('user1');
    user.name('Anton Bertha');

    const participant = new Participant(user, 'example1');
    participant.isMuted(true);

    const props: GroupVideoGripProps = {
      grid: {
        grid: [],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
    };

    const {getAllByTestId} = render(<GroupVideoGrid {...props} />);
    const thumbnailElements = getAllByTestId('self-video-thumbnail-wrapper');
    const thumbnailMutedIcons = getAllByTestId('status-call-audio-muted');

    expect(thumbnailElements).not.toHaveLength(0);
    expect(thumbnailMutedIcons).not.toHaveLength(0);
  });

  it('does not render muted thumbnail when un-muted', async () => {
    const user = new User('id');
    const participant = new Participant(user, 'example');
    participant.isMuted(false);

    const props: GroupVideoGripProps = {
      grid: {
        grid: [],
        thumbnail: participant,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
    };

    const {queryByTestId} = render(<GroupVideoGrid {...props} />);
    const thumbnailMutedIcon = queryByTestId('status-call-audio-muted');
    expect(thumbnailMutedIcon).toBeNull();
  });
});
