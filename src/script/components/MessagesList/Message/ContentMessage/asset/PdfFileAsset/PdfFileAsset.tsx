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

import {useEffect, useState} from 'react';

import type {ContentMessage} from 'src/script/entity/message/ContentMessage';
import type {FileAsset} from 'src/script/entity/message/FileAsset';
import {formatBytes, trimFileExtension} from 'Util/util';

import {PdfFileCard} from './PdfFileCard/PdfFileCard';
import {PdfFileContent} from './PdfFileContent/PdfFileContent';

import {useAssetTransfer} from '../useAssetTransfer';

export interface PdfFileAssetProps {
  message: ContentMessage;
  isFileShareRestricted: boolean;
}

export const PdfFileAsset = ({message, isFileShareRestricted}: PdfFileAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {transferState, uploadProgress, getAssetUrl} = useAssetTransfer(message);
  //   const {pdfUrl} = usePdfFile({asset, getAssetUrl});

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const name = trimFileExtension(asset.file_name);
  const size = formatBytes(asset.file_size);

  useEffect(() => {
    const sync = async () => {
      if (pdfUrl) {
        return;
      }

      const assetUrl = await getAssetUrl(asset.original_resource());
      setPdfUrl(assetUrl.url);
    };
    void sync();
  }, [asset, getAssetUrl, pdfUrl]);

  console.log('PdfFileAsset', asset);

  if (!pdfUrl) {
    return (
      <PdfFileCard extension="pdf" name={name} size={size}>
        Loading...
      </PdfFileCard>
    );
  }

  return (
    <PdfFileCard extension="pdf" name={name} size={size}>
      <PdfFileContent url={pdfUrl} />
    </PdfFileCard>
  );
};
