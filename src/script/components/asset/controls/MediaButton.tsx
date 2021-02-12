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

import {noop} from 'Util/util';
import {AssetTransferState} from '../../../assets/AssetTransferState';
import type {FileAsset} from '../../../entity/message/FileAsset';
import '../AssetLoader';
import React, {useEffect, useRef, useState} from 'react';

interface MediaButtonProps {
  asset: FileAsset;
  cancel?: () => void;
  large: boolean;
  pause?: () => void;
  play?: () => void;
  src: HTMLMediaElement;
  transferState: AssetTransferState;
  uploadProgress: number;
}

const MediaButton: React.FC<MediaButtonProps> = ({
                                                   src,
                                                   large,
                                                   asset,
                                                   uploadProgress,
                                                   transferState,
                                                   play = noop,
                                                   pause = noop,
                                                   cancel = noop
                                                 }) => {
  const element = useRef<HTMLElement>();

  if (large) {
    element.current.classList.add('media-button-lg');
  }

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const onPlay = () => (setIsPlaying(true));
  const onPause = () => (setIsPlaying(false));

  const mediaElement = src;

  useEffect(() => {
    mediaElement.addEventListener('playing', onPlay);
    mediaElement.addEventListener('pause', onPause);

    return () => {
      mediaElement.removeEventListener('playing', onPlay);
      mediaElement.removeEventListener('pause', onPause);
    };
  }, [mediaElement]);

  const isUploaded = transferState === AssetTransferState.UPLOADED

  const mediaButtonPlay = (
    <div className="media-button media-button-play icon-play"
         onClick={play}
         data-uie-name="do-play-media"></div>
  )

  const mediaButtonPause = (
    <div className="media-button media-button-pause icon-pause"
         onClick={pause}
         data-uie-name="do-pause-media"></div>
  )

  return (
    <>
      {isUploaded && !isPlaying && mediaButtonPlay}
      {isUploaded && isPlaying && mediaButtonPause}
    </>
  );
}

export default MediaButton;

