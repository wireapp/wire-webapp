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

import ko from 'knockout';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import TestPage from 'Util/test/TestPage';
import MediaButton, {MediaButtonProps} from './MediaButton';
import {FileAsset} from 'src/script/entity/message/FileAsset';

class MediaButtonTestPage extends TestPage<MediaButtonProps> {
  constructor(props?: MediaButtonProps) {
    super(MediaButton, props);
  }

  getPlayButton = () => this.get('[data-uie-name="do-play-media"]');
  getPauseButton = () => this.get('[data-uie-name="do-pause-media"]');
  getAssetLoader = () => this.get('[data-uie-name="status-loading-media"]');
  clickOnPlayButton = () => this.click(this.getPlayButton());
  clickOnPauseButton = () => this.click(this.getPauseButton());
}

describe('MediaButton', () => {
  const getDefaultProps = (): MediaButtonProps => {
    const videoElement = document.createElement('video');

    return {
      asset: {downloadProgress: ko.pureComputed(() => 0)} as FileAsset,
      cancel: () => {},
      large: false,
      mediaElement: videoElement,
      pause: () => {
        videoElement.dispatchEvent(new Event('pause'));
      },
      play: () => {
        videoElement.dispatchEvent(new Event('playing'));
      },
      transferState: AssetTransferState.UPLOAD_PENDING,
      uploadProgress: 0,
    };
  };

  it('displays the media buttons if the media is uploaded', () => {
    const props: MediaButtonProps = {...getDefaultProps(), transferState: AssetTransferState.UPLOADED};

    jest.spyOn(props, 'play');
    jest.spyOn(props, 'pause');

    const testPage = new MediaButtonTestPage(props);

    testPage.clickOnPlayButton();

    expect(props.play).toHaveBeenCalledTimes(1);

    testPage.clickOnPauseButton();

    expect(props.pause).toHaveBeenCalledTimes(1);
  });

  it('displays a loader if the media is being downloaded', () => {
    const props: MediaButtonProps = {...getDefaultProps(), transferState: AssetTransferState.DOWNLOADING};

    const testPage = new MediaButtonTestPage(props);

    const loader = testPage.getAssetLoader();

    expect(loader).not.toBe(null);
  });

  it('displays a loader if the media is being uploaded', () => {
    const props: MediaButtonProps = {...getDefaultProps(), transferState: AssetTransferState.UPLOADING};

    const testPage = new MediaButtonTestPage(props);

    const loader = testPage.getAssetLoader();

    expect(loader).not.toBe(null);
  });
});
