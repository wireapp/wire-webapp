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

import {VIDEO_STATE} from '@wireapp/avs';
import {render, fireEvent} from '@testing-library/react';
import GroupVideoGrid, {GroupVideoGripProps} from './GroupVideoGrid';
import {User} from '../../entity/User';
import {Participant} from '../../calling/Participant';

describe('GroupVideoGrid', () => {
  it('renders video grids', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');

    const props: GroupVideoGripProps = {
      grid: {
        grid: [participant, participant],
        thumbnail: null,
      },
      maximizedParticipant: null,
      minimized: false,
      selfParticipant: participant,
      setMaximizedParticipant: jest.fn(),
    };

    const {container} = render(<GroupVideoGrid {...props} />);

    const groupVideoGrid = container.querySelector('div[data-uie-name="grids-wrapper"]');

    expect(groupVideoGrid).not.toBeNull();
    expect(groupVideoGrid!.children.length).toBe(2);
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

    const {container} = render(<GroupVideoGrid {...props} />);

    const groupVideoGrid = container.querySelector('div[data-uie-name="grids-wrapper"]');
    expect(groupVideoGrid).not.toBeNull();

    expect(groupVideoGrid!.children.length).toBe(2);

    const gridFirstChild = groupVideoGrid!.children[0];

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

    const {container} = render(<GroupVideoGrid {...props} />);
    const pausedGrid = container.querySelector('div[data-uie-name="status-video-paused"]');

    expect(pausedGrid).not.toBeNull();
  });

  it('renders thumbnail', async () => {
    const user = new User('id');
    user.name('Anton Bertha');

    const participant = new Participant(user, 'example');
    participant.setVideoStream(new MediaStream(), false);
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

    const {container} = render(<GroupVideoGrid {...props} />);
    const thumbnailElement = container.querySelector('div[data-uie-name="self-video-thumbnail-wrapper"]');
    const thumbnailMutedIcon = container.querySelector('[data-uie-name="status-call-audio-muted"]');

    expect(thumbnailElement).not.toBeNull();
    expect(thumbnailMutedIcon).not.toBeNull();
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

    const {container} = render(<GroupVideoGrid {...props} />);
    const thumbnailMutedIcon = container.querySelector('[data-uie-name="status-call-audio-muted"]');

    expect(thumbnailMutedIcon).toBeNull();
  });
});
