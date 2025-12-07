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

import {render} from '@testing-library/react';

import {InputLevel, MAX_AUDIO_BULLETS} from './InputLevel';

describe('InputLevel', () => {
  let originalAudioContext: any;
  beforeAll(() => {
    originalAudioContext = window.AudioContext;
    window.AudioContext = jest.fn().mockImplementation(() => ({
      close: () => Promise.resolve(),
      createAnalyser: () =>
        ({
          frequencyBinCount: 100,
          getByteFrequencyData: (arr: Uint8Array) => {
            arr.fill(128);
          },
        }) as AnalyserNode,
      createMediaStreamSource: (stream: MediaStream) => ({connect: () => {}, disconnect: () => {}}),
    }));

    jest.spyOn(global, 'setInterval').mockImplementation((callback: () => void, interval: any) => {
      callback();
      return 0 as any;
    });
  });

  afterAll(() => {
    window.AudioContext = originalAudioContext;
  });

  it('represents the audio input volume in an audiometer with active audio bullets', () => {
    const expectedAudioLevel = (128 / 160) * MAX_AUDIO_BULLETS;
    const mediaStream = new MediaStream();

    const props = {
      disabled: false,
      mediaStream,
    };

    const {container} = render(<InputLevel {...props} />);

    const activeAudioLevelBullets = container.querySelectorAll('.input-level__bullet--active');
    expect(activeAudioLevelBullets).toHaveLength(expectedAudioLevel);
  });
});
