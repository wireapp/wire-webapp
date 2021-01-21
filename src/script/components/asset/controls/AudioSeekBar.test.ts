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

import {FileAsset} from 'src/script/entity/message/FileAsset';
import TestPage from 'Util/test/TestPage';

import AudioSeekBar, {AudioSeekBarProps} from './AudioSeekBar';

class AudioSeekBarPage extends TestPage<AudioSeekBarProps> {
  constructor(props?: AudioSeekBarProps) {
    super(AudioSeekBar, props);
  }
}

describe('AudioSeekBar', () => {
  const getaudioAsset = () =>
    (({
      meta: {
        loudness: new Uint8Array(Array.from({length: 200}, (item, index) => index)),
      },
    } as unknown) as FileAsset);

  const createAudioElement = (currentTime = 0) => {
    const audioElement = document.createElement('audio');
    Object.defineProperty(audioElement, 'duration', {get: () => 1000});
    audioElement.currentTime = currentTime;
    return audioElement;
  };

  const getDefaultProps = () => ({
    asset: getaudioAsset(),
    disabled: false,
    audioElement: createAudioElement(),
  });

  it('renders level indicators for the audio asset', () => {
    const audioSeekBar = new AudioSeekBarPage(getDefaultProps());
    expect(audioSeekBar.get('path').length).toEqual(2);
  });

  it('updates on audio events', () => {
    const audioElement = createAudioElement(500);
    const audioSeekBar = new AudioSeekBarPage({...getDefaultProps(), audioElement});

    const clipPath = () =>
      audioSeekBar.get('svg').getDOMNode<SVGSVGElement>().style.getPropertyValue('--seek-bar-clip');

    audioElement.dispatchEvent(new Event('timeupdate'));

    expect(clipPath()).toEqual('polygon(0 0, 50% 0, 50% 100%, 0 100%)');

    audioElement.dispatchEvent(new Event('ended'));

    expect(clipPath()).toEqual('polygon(0 0, 0% 0, 0% 100%, 0 100%)');
  });

  it('updates the currentTime on click', () => {
    const props = getDefaultProps();
    const audioSeekBar = new AudioSeekBarPage(props);
    const svg = audioSeekBar.get('svg');
    Object.defineProperty(svg.getDOMNode<SVGSVGElement>(), 'clientWidth', {get: () => 100});

    const expected = 500;
    svg.simulate('click', {pageX: 50});

    expect(props.audioElement.currentTime).toBeCloseTo(expected);
  });
});
