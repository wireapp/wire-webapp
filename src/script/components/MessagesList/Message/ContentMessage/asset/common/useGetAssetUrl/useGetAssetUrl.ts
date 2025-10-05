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

import {AssetError} from 'Repositories/assets/AssetError';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';
import {getLogger} from 'Util/Logger';

import {AssetUrl} from '../useAssetTransfer/useAssetTransfer';

const logger = getLogger('useGetAssetUrl');

interface UseGetAssetUrlProps {
  asset: FileAsset;
  isEnabled: boolean;
  getAssetUrl: (resource: AssetRemoteData) => Promise<AssetUrl>;
  onError?: (error: Error) => void;
  onSuccess?: (url: string) => void;
}

export const useGetAssetUrl = ({asset, isEnabled, getAssetUrl, onError, onSuccess}: UseGetAssetUrlProps) => {
  const [url, setUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetchAssetUrl = useCallback(async () => {
    if (url || !isEnabled) {
      return;
    }

    setIsLoading(true);
    asset.status(AssetTransferState.DOWNLOADING);

    try {
      const assetUrl = await getAssetUrl(asset.original_resource());
      setUrl(assetUrl.url);
      onSuccess?.(assetUrl.url);
    } catch (error) {
      if (error instanceof Error && error.name !== AssetError.CANCEL_ERROR) {
        setIsError(true);
        onError?.(error);
      }
      logger.error(`Failed to load asset ${asset.id}`, error);
    } finally {
      setIsLoading(false);
      asset.status(AssetTransferState.UPLOADED);
    }
  }, [url, isEnabled, asset, getAssetUrl, onSuccess, onError]);

  useEffect(() => {
    void fetchAssetUrl();
  }, [fetchAssetUrl]);

  return {
    url,
    isLoading,
    isError,
  };
};
