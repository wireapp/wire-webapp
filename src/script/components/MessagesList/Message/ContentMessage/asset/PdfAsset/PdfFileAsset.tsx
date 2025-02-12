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

import type {ContentMessage} from 'src/script/entity/message/ContentMessage';
import type {FileAsset} from 'src/script/entity/message/FileAsset';

import {PdfAssetLoader} from './common/PdfAssetLoader/PdfAssetLoader';
import {getPdfMetadata} from './getPdfMetadata/getPdfMetadata';
import {PdfFileCard} from './PdfAssetCard/PdfFileCard';
import {PdfAssetError} from './PdfAssetError/PdfAssetError';
import {useGetPdfAsset} from './useGetPdfAsset/useGetPdfAsset';
import {useInView} from './useInView';

import {useAssetTransfer} from '../useAssetTransfer';

export interface PdfFileAssetProps {
  message: ContentMessage;
  isFileShareRestricted: boolean;
}

const PdfAssetPreview = lazy(() =>
  import('./PdfAssetContent/PdfAssetPreview').then(module => ({
    default: module.PdfAssetPreview,
  })),
);

export const PdfFileAsset = ({message, isFileShareRestricted}: PdfFileAssetProps) => {
  const asset = message.getFirstAsset() as FileAsset;
  const {getAssetUrl} = useAssetTransfer(message);
  const {elementRef, hasBeenInView} = useInView();

  const {url, isLoading, isError} = useGetPdfAsset({
    asset,
    isEnabled: hasBeenInView,
    getAssetUrl,
  });

  const {name, size} = getPdfMetadata({asset});

  if (isError) {
    return (
      <PdfFileCard extension="pdf" name={name} size={size}>
        <PdfAssetError />
      </PdfFileCard>
    );
  }

  if (isLoading || !url) {
    return (
      <PdfFileCard ref={elementRef} extension="pdf" name={name} size={size}>
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
