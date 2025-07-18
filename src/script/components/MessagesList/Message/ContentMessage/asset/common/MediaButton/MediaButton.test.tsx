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
import ko from 'knockout';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {FileAsset} from 'Repositories/entity/message/FileAsset';

import {MediaButton, MediaButtonProps} from './MediaButton';

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

    const {getByTestId} = render(<MediaButton {...props} />);

    const playButton = getByTestId('do-play-media');
    fireEvent.click(playButton);
    expect(props.play).toHaveBeenCalledTimes(1);

    const pauseButton = getByTestId('do-pause-media');
    fireEvent.click(pauseButton);
    expect(props.pause).toHaveBeenCalledTimes(1);
  });

  it('displays a loader if the media is being downloaded', () => {
    const props: MediaButtonProps = {...getDefaultProps(), transferState: AssetTransferState.DOWNLOADING};

    const {queryByTestId} = render(<MediaButton {...props} />);

    expect(queryByTestId('status-loading-media')).not.toBe(null);
  });

  it('displays a loader if the media is being uploaded', () => {
    const props: MediaButtonProps = {...getDefaultProps(), transferState: AssetTransferState.UPLOADING};

    const {queryByTestId} = render(<MediaButton {...props} />);

    expect(queryByTestId('status-loading-media')).not.toBe(null);
  });
});
