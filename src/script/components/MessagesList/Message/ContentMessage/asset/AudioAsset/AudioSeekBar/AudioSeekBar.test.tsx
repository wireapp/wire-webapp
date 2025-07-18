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

import {act, fireEvent, render} from '@testing-library/react';

import {FileAsset} from 'Repositories/entity/message/FileAsset';

import {AudioSeekBar} from './AudioSeekBar';

describe('AudioSeekBar', () => {
  const getAudioAsset = () =>
    ({
      meta: {
        loudness: new Uint8Array(Array.from({length: 200}, (item, index) => index)),
      },
    }) as unknown as FileAsset;

  const createAudioElement = (currentTime = 0) => {
    const audioElement = document.createElement('audio');
    Object.defineProperty(audioElement, 'duration', {get: () => 1000});
    audioElement.currentTime = currentTime;
    return audioElement;
  };

  const getDefaultProps = () => ({
    asset: getAudioAsset(),
    audioElement: createAudioElement(),
    disabled: false,
  });

  it('renders level indicators for the audio asset', () => {
    const {container} = render(<AudioSeekBar {...getDefaultProps()} />);
    expect(container.querySelectorAll('path')).toHaveLength(2);
  });

  it('updates on audio events', () => {
    const audioElement = createAudioElement(500);
    const {container} = render(<AudioSeekBar {...getDefaultProps()} audioElement={audioElement} />);

    const clipPathWidth = () => container.querySelector('svg rect')?.getAttribute('width');

    act(() => {
      audioElement.dispatchEvent(new Event('timeupdate'));
    });

    expect(clipPathWidth()).toEqual('0.5');

    act(() => {
      audioElement.dispatchEvent(new Event('ended'));
    });

    expect(clipPathWidth()).toEqual('0');
  });

  it('updates the currentTime on click', () => {
    const props = getDefaultProps();
    const {container} = render(<AudioSeekBar {...props} />);
    const svg = container.querySelector('svg') as SVGElement;
    Object.defineProperty(svg, 'clientWidth', {get: () => 100});

    const expected = 500;
    act(() => {
      fireEvent.click(svg, {clientX: 50});
    });

    expect(props.audioElement.currentTime).toBeCloseTo(expected);
  });
});
