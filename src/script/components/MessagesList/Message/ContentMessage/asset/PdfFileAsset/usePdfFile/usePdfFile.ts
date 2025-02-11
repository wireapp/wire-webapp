/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {useCallback, useEffect, useState} from 'react';

import {AssetRemoteData} from 'src/script/assets/AssetRemoteData';
import type {FileAsset} from 'src/script/entity/message/FileAsset';

import {AssetUrl} from '../../useAssetTransfer';

interface UsePdfFileProps {
  asset: FileAsset;
  getAssetUrl: (resource: AssetRemoteData) => Promise<AssetUrl>;
}

export const usePdfFile = ({asset, getAssetUrl}: UsePdfFileProps) => {
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const loadPdfUrl = useCallback(async () => {
    try {
      const assetUrl = await getAssetUrl(asset.original_resource());
      setPdfUrl(assetUrl.url);
    } catch (error) {
      console.error('Error loading PDF URL:', error);
    }
  }, [asset, getAssetUrl]);

  useEffect(() => {
    void loadPdfUrl();
  }, [loadPdfUrl]);

  return {pdfUrl};
};
