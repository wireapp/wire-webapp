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

import {instantiateComponent} from '../../../../api/knockoutHelpers';

import ko from 'knockout';

import 'src/script/components/asset/controls/audioSeekBar';

describe('audio-seek-bar', () => {
  const audioElement = document.createElement('audio');
  const loudness = new Uint8Array(Array.from({length: 200}, (item, index) => index));
  const audioAsset = {
    meta: {
      loudness,
    },
  };
  const defaultParams = {
    asset: audioAsset,
    disabled: ko.observable(false),
    src: audioElement,
  };

  it('renders level indicators for the audio asset', () => {
    return instantiateComponent('audio-seek-bar', defaultParams).then(domContainer => {
      expect(domContainer.childElementCount).toBeGreaterThan(0);
    });
  });
});
