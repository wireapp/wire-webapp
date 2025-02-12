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

import {AssetError} from 'src/script/assets/AssetError';
import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import {AssetTransferState} from 'src/script/assets/AssetTransferState';
import type {FileAsset} from 'src/script/entity/message/FileAsset';

import {AssetUrl} from '../../useAssetTransfer';

interface UseGetPdfAssetProps {
  asset: FileAsset;
  isEnabled: boolean;
  getAssetUrl: (resource: AssetRemoteData) => Promise<AssetUrl>;
}

export const useGetPdfAsset = ({asset, isEnabled, getAssetUrl}: UseGetPdfAssetProps) => {
  const [url, setUrl] = useState<string | null>(null);
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
    } catch (error) {
      if (error instanceof Error && error.name !== AssetError.CANCEL_ERROR) {
        setIsError(true);
      }
      console.error('Failed to load PDF asset:', error);
    } finally {
      setIsLoading(false);
      asset.status(AssetTransferState.UPLOADED);
    }
  }, [asset, isEnabled, getAssetUrl, url]);

  useEffect(() => {
    void fetchAssetUrl();
  }, [fetchAssetUrl]);

  return {
    url,
    isLoading,
    isError,
  };
};
