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

import {Suspense, lazy} from 'react';

import {useInView} from 'Hooks/useInView/useInView';
import type {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset} from 'Repositories/entity/message/FileAsset';

import {PdfAssetLoader} from './common/PdfAssetLoader/PdfAssetLoader';
import {getPdfMetadata} from './getPdfMetadata/getPdfMetadata';
import {PdfFileCard} from './PdfAssetCard/PdfFileCard';
import {PdfAssetError} from './PdfAssetError/PdfAssetError';

import {useAssetTransfer} from '../common/useAssetTransfer/useAssetTransfer';
import {useGetAssetUrl} from '../common/useGetAssetUrl/useGetAssetUrl';

export interface PdfFileAssetProps {
  message: ContentMessage;
  isFileShareRestricted: boolean;
}

const PdfAssetPreview = lazy(() =>
  import('./PdfAssetPreview/PdfAssetPreview').then(module => ({
    default: module.PdfAssetPreview,
  })),
);

export const PdfAsset = ({message, isFileShareRestricted}: PdfFileAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {isUploading, getAssetUrl, uploadProgress} = useAssetTransfer(message);
  const {elementRef, hasBeenInView} = useInView();

  const {url, isLoading, isError} = useGetAssetUrl({
    asset,
    isEnabled: hasBeenInView,
    getAssetUrl,
  });

  const {name, size} = getPdfMetadata({asset});

  if (isError || isFileShareRestricted) {
    return (
      <PdfFileCard extension="pdf" name={name} size={size} isError>
        <PdfAssetError isFileShareRestricted={isFileShareRestricted} />
      </PdfFileCard>
    );
  }

  if (isUploading || isLoading || !url) {
    return (
      <PdfFileCard ref={elementRef} extension="pdf" name={name} size={size} isLoading loadingProgress={uploadProgress}>
        <PdfAssetLoader />
      </PdfFileCard>
    );
  }

  return (
    <PdfFileCard ref={elementRef} extension="pdf" name={name} size={size}>
      {hasBeenInView && (
        <Suspense fallback={<PdfAssetLoader />}>
          <PdfAssetPreview url={url} />
        </Suspense>
      )}
    </PdfFileCard>
  );
};
