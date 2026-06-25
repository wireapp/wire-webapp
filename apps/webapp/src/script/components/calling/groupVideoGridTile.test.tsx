/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {VIDEO_STATE} from '@wireapp/avs';

import {Participant} from 'Repositories/calling/Participant';
import {User} from 'Repositories/entity/User';
import {backgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {createUuid} from 'Util/uuid';

import {GroupVideoGridTile} from './groupVideoGridTile';
import {translateForTest} from 'Util/test/translateForTest';

const loadingOverlaySelector = '[data-uie-name="background-effect-initializing"]';
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createParticipant = (name: string) => {
  const user = new User(createUuid(), '', translateForTest);
  user.name(name);

  return new Participant(user, `client-${name}`);
};

const createMediaStream = () =>
  ({
    getVideoTracks: jest.fn(() => []),
  }) as unknown as MediaStream;

const createProcessedVideoStream = (stream: MediaStream) => ({
  stream,
  release: jest.fn(),
});

const renderComponent = ({
  participant = createParticipant('self'),
  selfParticipant = participant,
}: {
  participant?: Participant;
  selfParticipant?: Participant;
} = {}) =>
  render(
    <GroupVideoGridTile
      minimized={false}
      participant={participant}
      selfParticipant={selfParticipant}
      participantCount={1}
      isMaximized={false}
      onTileDoubleClick={jest.fn()}
    />,
    {wrapper: rootProviderWrapper},
  );

describe('GroupVideoGridTile', () => {
  beforeEach(() => {
    backgroundEffectsStore.setState({
      isInitializing: false,
    });
  });

  it('should show loading overlay when background effect is initializing', () => {
    backgroundEffectsStore.setState({
      isInitializing: true,
    });

    const {container} = renderComponent();

    expect(container.querySelector(loadingOverlaySelector)).toBeInTheDocument();
  });

  it('should show loading overlay while video is loading', () => {
    const participant = createParticipant('self');
    const videoStream = createMediaStream();

    participant.videoState(VIDEO_STATE.STARTED);
    participant.videoStream(videoStream);
    participant.processedVideoStream(createProcessedVideoStream(videoStream));

    const {container} = renderComponent({participant});

    expect(container.querySelector(loadingOverlaySelector)).toBeInTheDocument();
  });

  it('should hide loading overlay when video is ready', () => {
    const participant = createParticipant('self');
    const videoStream = createMediaStream();

    participant.videoState(VIDEO_STATE.STARTED);
    participant.videoStream(videoStream);
    participant.processedVideoStream(createProcessedVideoStream(videoStream));

    const {container} = renderComponent({participant});

    fireEvent.canPlay(container.querySelector('video')!);

    expect(container.querySelector(loadingOverlaySelector)).not.toBeInTheDocument();
  });
});
