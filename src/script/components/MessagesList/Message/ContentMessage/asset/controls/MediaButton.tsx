/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import cx from 'classnames';
import AssetLoader from '../AssetLoader';
import React, {useEffect, useState} from 'react';
import type {FileAsset} from '../../../../../../entity/message/FileAsset';
import {AssetTransferState} from '../../../../../../assets/AssetTransferState';
import {noop} from 'Util/util';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

export interface MediaButtonProps {
  asset: FileAsset;
  cancel?: () => void;
  large?: boolean;
  mediaElement?: HTMLMediaElement;
  pause?: () => void;
  play: () => void;
  transferState: AssetTransferState;
  uploadProgress: number;
}

const MediaButton: React.FC<MediaButtonProps> = ({
  mediaElement,
  large,
  asset,
  uploadProgress,
  transferState,
  play,
  pause = noop,
  cancel = noop,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);
  const unwrappedAsset = useKoSubscribableChildren(asset, ['downloadProgress']);

  useEffect(() => {
    if (mediaElement) {
      mediaElement.addEventListener('playing', onPlay);
      mediaElement.addEventListener('pause', onPause);
    }
    return () => {
      if (mediaElement) {
        mediaElement.removeEventListener('playing', onPlay);
        mediaElement.removeEventListener('pause', onPause);
      }
    };
  }, [mediaElement]);

  const isUploaded = transferState === AssetTransferState.UPLOADED;
  const isDownloading = transferState === AssetTransferState.DOWNLOADING;
  const isUploading = transferState === AssetTransferState.UPLOADING;

  return (
    <div
      className={cx({
        'media-button-lg': large,
      })}
    >
      {isUploaded && !isPlaying && mediaElement && (
        <div className="media-button media-button-play icon-play" onClick={play} data-uie-name="do-play-media" />
      )}
      {isUploaded && isPlaying && (
        <div className="media-button media-button-pause icon-pause" onClick={pause} data-uie-name="do-pause-media" />
      )}
      {isDownloading && <AssetLoader large={large} loadProgress={unwrappedAsset.downloadProgress} onCancel={cancel} />}
      {isUploading && <AssetLoader large={large} loadProgress={uploadProgress} onCancel={cancel} />}
    </div>
  );
};

export default MediaButton;
