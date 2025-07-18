/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import {getLogger} from 'Util/Logger';
import {useEffectRef} from 'Util/useEffectRef';

import {AssetUrl} from '../../common/useAssetTransfer/useAssetTransfer';

const logger = getLogger('useAudioPlayer');

interface UseAudioPlayerProps {
  asset: FileAsset;
  getAssetUrl: (resource: AssetRemoteData) => Promise<AssetUrl>;
}

export const useAudioPlayer = ({asset, getAssetUrl}: UseAudioPlayerProps) => {
  const [audioElement, setAudioElementRef] = useEffectRef<HTMLMediaElement>();
  const [audioTime, setAudioTime] = useState<number>(asset?.meta?.duration || 0);
  const [audioSrc, setAudioSrc] = useState<AssetUrl>();

  const handleTimeUpdate = () => {
    if (!audioElement) {
      return;
    }
    setAudioTime(audioElement.currentTime);
  };

  const handlePause = () => {
    if (!audioElement) {
      return;
    }
    audioElement.pause();
  };

  const handlePlay = async () => {
    if (!audioElement) {
      return;
    }

    if (!audioSrc) {
      asset.status(AssetTransferState.DOWNLOADING);
      try {
        const url = await getAssetUrl(asset.original_resource());
        setAudioSrc(url);
      } catch (error) {
        logger.error('Failed to load audio asset ', error);
      }
      asset.status(AssetTransferState.UPLOADED);
    }

    await audioElement.play();
  };

  useEffect(() => {
    if (!audioSrc || !audioElement) {
      return;
    }

    const playPromise = audioElement.play();

    playPromise?.catch(error => {
      logger.error('Failed to load audio asset ', error);
    });
  }, [audioElement, audioSrc]);

  useEffect(() => {
    return audioSrc?.dispose;
  }, [audioSrc]);

  return {
    audioElement,
    setAudioElementRef,
    audioTime,
    audioSrc,
    handleTimeUpdate,
    handlePause,
    handlePlay,
  };
};
