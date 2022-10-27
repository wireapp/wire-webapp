/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';

import {SeekBar} from './SeekBar';

const createAudioElement = (currentTime: number, maxTime: number) => {
  const audioElement = document.createElement('audio');
  Object.defineProperty(audioElement, 'duration', {get: () => maxTime});
  audioElement.currentTime = currentTime;
  return audioElement;
};

const getProgress = (element: HTMLElement) =>
  element.getAttribute('style')?.replace(/--seek-bar-progress: (.*);/, '$1');

describe('SeekBar', () => {
  it('shows how much of an audio asset has been already played', async () => {
    const audioElement = createAudioElement(25, 100);

    const props = {
      dark: false,
      disabled: false,
      mediaElement: audioElement,
    };

    const {getByTestId, rerender} = render(<SeekBar {...props} />);

    const mediaSeekBar = getByTestId('asset-control-media-seek-bar');

    const checkProgress = (currentTime: number, expectation: string) => {
      props.mediaElement.currentTime = currentTime;
      act(() => {
        audioElement.dispatchEvent(new Event('timeupdate'));
      });
      rerender(<SeekBar {...props} />);
      expect(getProgress(mediaSeekBar)).toEqual(expectation);
    };

    expect(getProgress(mediaSeekBar)).toEqual('0%');
    checkProgress(50, '50%');
    checkProgress(75, '75%');
    checkProgress(100, '100%');
    checkProgress(200, '100%');
  });
});
