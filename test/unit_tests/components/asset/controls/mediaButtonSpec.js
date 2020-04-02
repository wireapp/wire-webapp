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

import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import 'src/script/components/asset/controls/mediaButton';

describe('media-button', () => {
  const videoElement = document.createElement('video');
  const defaultParams = {
    asset: {downloadProgress: () => 0},
    cancel: () => {},
    pause: () => {},
    play: () => {},
    src: videoElement,
    transferState: ko.observable(),
    uploadProgress: () => '',
  };

  it('displays the media buttons if the media is uploaded', () => {
    const params = {...defaultParams, transferState: ko.observable(AssetTransferState.UPLOADED)};
    spyOn(params, 'play');
    spyOn(params, 'pause');
    return instantiateComponent('media-button', params).then(domContainer => {
      const playButton = domContainer.querySelector('[data-uie-name=do-play-media]');
      const pauseButton = domContainer.querySelector('[data-uie-name=do-pause-media]');

      expect(playButton.style.display).withContext('play button style').toBe('');

      expect(pauseButton.style.display).withContext('pause button style').toBe('none');

      playButton.click();

      expect(params.play).toHaveBeenCalledTimes(1);

      pauseButton.click();

      expect(params.pause).toHaveBeenCalledTimes(1);

      videoElement.dispatchEvent(new Event('playing'));

      expect(playButton.style.display).toBe('none');
      expect(pauseButton.style.display).toBe('');

      videoElement.dispatchEvent(new Event('pause'));

      expect(playButton.style.display).toBe('');
      expect(pauseButton.style.display).toBe('none');
    });
  });

  it('displays a loader if the media is being downloaded', () => {
    const params = {...defaultParams, transferState: ko.observable(AssetTransferState.DOWNLOADING)};

    return instantiateComponent('media-button', params).then(domContainer => {
      const playButton = domContainer.querySelector('[data-uie-name=do-play-media]');
      const pauseButton = domContainer.querySelector('[data-uie-name=do-pause-media]');

      expect(playButton).withContext('play button').toBe(null);

      expect(pauseButton).withContext('pause button').toBe(null);

      expect(domContainer.querySelector('asset-loader')).not.toBe(null);
    });
  });

  it('displays a loader if the media is being uploaded', () => {
    const params = {...defaultParams, transferState: ko.observable(AssetTransferState.UPLOADING)};

    spyOn(params, 'cancel');

    return instantiateComponent('media-button', params).then(domContainer => {
      const playButton = domContainer.querySelector('[data-uie-name=do-play-media]');
      const pauseButton = domContainer.querySelector('[data-uie-name=do-pause-media]');

      expect(playButton).toBe(null);
      expect(pauseButton).toBe(null);

      expect(domContainer.querySelector('asset-loader')).not.toBe(null);
    });
  });
});
