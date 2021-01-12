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
import GroupVideoGrid, {GroupVideoGripProps} from './GroupVideoGrid';
import TestPage from 'Util/test/TestPage';
import {User} from '../../entity/User';
import {Participant} from '../../calling/Participant';

class GroupVideoGridPage extends TestPage<GroupVideoGripProps> {
  constructor(props?: GroupVideoGripProps) {
    super(GroupVideoGrid, props);
  }

  getGridsWrapper = () => this.get('div[data-uie-name="grids-wrapper"]');
  getPausedGrid = () => this.get('div[data-uie-name="status-video-paused"]');
  getThumbnail = () => this.get('div[data-uie-name="self-video-thumbnail-wrapper"]');
  getThumbnailMutedIcon = () => this.get('div[data-uie-name="status-call-audio-muted"]');

  doubleClickOnGridFirstChild = () => this.doubleClick(this.getGridsWrapper().childAt(0));
}

describe('GroupVideoGrid', () => {
  it('renders video grids', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');
    const groupVideoGrid = new GroupVideoGridPage({
      grid: {
        grid: [participant, participant],
        hasRemoteVideo: false,
        thumbnail: null,
      },
      minimized: false,
      muted: false,
      selfParticipant: participant,
    });

    expect(groupVideoGrid.getGridsWrapper().exists()).toBe(true);
    expect(groupVideoGrid.getGridsWrapper().children().length).toBe(2);
  });

  it('maximizes a grid on double click', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');
    const groupVideoGrid = new GroupVideoGridPage({
      grid: {
        grid: [participant, participant],
        hasRemoteVideo: false,
        thumbnail: null,
      },
      minimized: false,
      muted: false,
      selfParticipant: participant,
    });

    expect(groupVideoGrid.getGridsWrapper().children().length).toBe(2);
    groupVideoGrid.doubleClickOnGridFirstChild();
    expect(groupVideoGrid.getGridsWrapper().children().length).toBe(1);
  });

  it('renders a grid with paused video', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');
    participant.videoState(VIDEO_STATE.PAUSED);
    const groupVideoGrid = new GroupVideoGridPage({
      grid: {
        grid: [participant],
        hasRemoteVideo: false,
        thumbnail: null,
      },
      minimized: false,
      muted: false,
      selfParticipant: participant,
    });

    expect(groupVideoGrid.getPausedGrid().exists()).toBe(true);
  });

  it('renders thumbnail', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');
    participant.setVideoStream(new MediaStream());
    const groupVideoGrid = new GroupVideoGridPage({
      grid: {
        grid: [],
        hasRemoteVideo: false,
        thumbnail: participant,
      },
      minimized: false,
      muted: true,
      selfParticipant: participant,
    });

    expect(groupVideoGrid.getThumbnail().exists()).toBe(true);
    expect(groupVideoGrid.getThumbnailMutedIcon().exists()).toBe(true);
  });

  it('renders muted thumbnail', async () => {
    const user = new User('id');
    user.name('Anton Bertha');
    const participant = new Participant(user, 'example');
    participant.setVideoStream(new MediaStream());
    const groupVideoGrid = new GroupVideoGridPage({
      grid: {
        grid: [],
        hasRemoteVideo: false,
        thumbnail: participant,
      },
      minimized: false,
      muted: true,
      selfParticipant: participant,
    });

    expect(groupVideoGrid.getThumbnailMutedIcon().exists()).toBe(true);
  });
});
