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

import {instantiateComponent} from '../../../../helper/knockoutHelpers';

import ko from 'knockout';

import 'src/script/components/asset/controls/audioSeekBar';

describe('audio-seek-bar', () => {
  const loudness = new Uint8Array(Array.from({length: 200}, (item, index) => index));
  const audioAsset = {
    meta: {
      loudness,
    },
  };
  const defaultParams = {
    asset: audioAsset,
    disabled: ko.observable(false),
    src: document.createElement('audio'),
  };

  it('renders level indicators for the audio asset', async () => {
    const audioSeekBar = await instantiateComponent('audio-seek-bar', defaultParams);
    expect(audioSeekBar.children[0].querySelectorAll('path').length).toEqual(2);
  });

  it('updates on audio events', async () => {
    const audioElement = document.createElement('audio');
    Object.defineProperty(audioElement, 'duration', {get: () => 1000});
    audioElement.currentTime = 500;
    const params = {...defaultParams, src: audioElement};

    const audioSeekBar = await instantiateComponent('audio-seek-bar', params);
    const clipPath = () => audioSeekBar.children[0].style.getPropertyValue('--seek-bar-clip');

    audioElement.dispatchEvent(new Event('timeupdate'));

    expect(clipPath()).toEqual('polygon(0 0, 50% 0, 50% 100%, 0 100%)');

    audioElement.dispatchEvent(new Event('ended'));

    expect(clipPath()).toEqual('polygon(0 0, 0% 0, 0% 100%, 0 100%)');
  });

  it('updates the currentTime on click', async () => {
    const audioElement = document.createElement('audio');
    Object.defineProperty(audioElement, 'duration', {get: () => 1000});
    audioElement.currentTime = 0;
    const params = {...defaultParams, src: audioElement};

    const audioSeekBar = await instantiateComponent('audio-seek-bar', params);
    const clickPositionX = Math.floor(audioSeekBar.offsetWidth / 2);
    const expected = (1000 / audioSeekBar.offsetWidth) * clickPositionX;
    const element = audioSeekBar.querySelector('div');
    element.dispatchEvent(new MouseEvent('click', {clientX: clickPositionX}));

    expect(audioElement.currentTime).toBeCloseTo(expected);
  });
});
