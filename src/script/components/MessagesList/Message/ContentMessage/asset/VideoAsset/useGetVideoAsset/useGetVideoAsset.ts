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

import {useState, useCallback, useEffect} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {AssetError} from 'src/script/assets/AssetError';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import {EventName} from 'src/script/tracking/EventName';

import {AssetUrl} from '../../useAssetTransfer';

interface UseGetVideoAssetProps {
  asset: FileAsset;
  enabled: boolean;
  getAssetUrl: (resource: any) => Promise<AssetUrl>;
}

export const useGetVideoAsset = ({asset, enabled, getAssetUrl}: UseGetVideoAssetProps) => {
  const [url, setUrl] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchAssetUrl = useCallback(async () => {
    if (url || !enabled) {
      return;
    }

    asset.status(AssetTransferState.DOWNLOADING);

    try {
      const assetUrl = await getAssetUrl(asset.original_resource());

      setUrl(assetUrl.url);
      setIsLoaded(true);

      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_SUCCESS);
    } catch (error) {
      if (error instanceof Error && error.name !== AssetError.CANCEL_ERROR) {
        setIsError(true);
      }
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.MESSAGES.VIDEO.PLAY_FAILED);
      console.error('Failed to load video asset ', error);
    }

    asset.status(AssetTransferState.UPLOADED);
  }, [asset, enabled, getAssetUrl, url]);

  useEffect(() => {
    void fetchAssetUrl();
  }, [fetchAssetUrl]);

  return {
    url,
    isError,
    isLoaded,
  };
};
