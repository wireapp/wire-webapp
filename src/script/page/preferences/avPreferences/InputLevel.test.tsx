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

import TestPage from 'Util/test/TestPage';
import InputLevel, {InputLevelProps, MAX_AUDIO_BULLETS} from './InputLevel';

class InputLevelTestPage extends TestPage<InputLevelProps> {
  constructor(props?: InputLevelProps) {
    super(InputLevel, props);
  }

  getActiveInputLevelBullets = () => this.get('.input-level__bullet--active');
}

describe('InputLevel', () => {
  let originalAudioContext: any;
  beforeAll(() => {
    originalAudioContext = window.AudioContext;
    window.AudioContext = jest.fn().mockImplementation(() => ({
      createAnalyser: () =>
        ({
          frequencyBinCount: 100,
          getByteFrequencyData: (arr: Uint8Array) => {
            arr.fill(128);
          },
        } as AnalyserNode),
      createMediaStreamSource: (stream: MediaStream) => ({connect: () => {}}),
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

    const testPage = new InputLevelTestPage({
      disabled: false,
      mediaStream,
    });

    const activeAudioLevelBullets = testPage.getActiveInputLevelBullets();
    expect(activeAudioLevelBullets.length).toBe(expectedAudioLevel);
  });
});
