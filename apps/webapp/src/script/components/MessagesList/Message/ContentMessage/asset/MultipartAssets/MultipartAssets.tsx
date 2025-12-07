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

import {useInView} from 'Hooks/useInView/useInView';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {container} from 'tsyringe';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

import {ICellAsset} from '@wireapp/protocol-messaging';

import {FileAssetCard} from './FileAssetCard/FileAssetCard';
import {ImageAssetCard} from './ImageAssetCard/ImageAssetCard';
import {
  fileCardStyles,
  imageCardStyles,
  listSingleItemStyles,
  listStyles,
  videoCardStyles,
} from './MultipartAssets.styles';
import {useGetMultipartAsset} from './useGetMultipartAsset/useGetMultipartAsset';
import {VideoAssetCard} from './VideoAssetCard/VideoAssetCard';

interface MultipartAssetsProps {
  assets: ICellAsset[];
  cellsRepository?: CellsRepository;
  senderName: string;
  timestamp: number;
}

export const MultipartAssets = ({
  assets,
  cellsRepository = container.resolve(CellsRepository),
  senderName,
  timestamp,
}: MultipartAssetsProps) => {
  return (
    <ul css={assets.length === 1 ? listSingleItemStyles : listStyles}>
      {assets.map(asset => (
        <MultipartAsset
          key={asset.uuid}
          cellsRepository={cellsRepository}
          assetsCount={assets.length}
          senderName={senderName}
          timestamp={timestamp}
          {...asset}
        />
      ))}
    </ul>
  );
};

interface MultipartAssetProps extends ICellAsset {
  cellsRepository: CellsRepository;
  assetsCount: number;
  senderName: string;
  timestamp: number;
}

const MultipartAsset = ({
  uuid,
  initialName,
  initialSize,
  contentType,
  cellsRepository,
  assetsCount,
  image: imageMetadata,
  senderName,
  timestamp,
}: MultipartAssetProps) => {
  const extension = getFileExtension(initialName!);
  const size = formatBytes(Number(initialSize));

  const {elementRef, hasBeenInView} = useInView<HTMLLIElement>();

  const isImage = contentType.startsWith('image');
  const isVideo = contentType.startsWith('video');

  const isSingleAsset = assetsCount === 1;
  const variant = isSingleAsset ? 'large' : 'small';

  const {src, isLoading, isError, imagePreviewUrl, pdfPreviewUrl, path} = useGetMultipartAsset({
    uuid,
    cellsRepository,
    isEnabled: hasBeenInView,
    retryPreviewUntilSuccess: isSingleAsset && !isImage && !isVideo,
  });

  const name = path ? getName(path) : getName(initialName!);

  if (isImage) {
    return (
      <li ref={elementRef} css={imageCardStyles}>
        <ImageAssetCard
          id={uuid}
          src={src}
          name={name}
          extension={extension}
          variant={variant}
          metadata={imageMetadata}
          isLoading={isLoading}
          isError={isError}
          senderName={senderName}
          timestamp={timestamp}
        />
      </li>
    );
  }

  if (isVideo) {
    return (
      <li ref={elementRef} css={videoCardStyles(isSingleAsset)}>
        <VideoAssetCard
          id={uuid}
          variant={variant}
          src={src}
          extension={extension}
          name={name}
          size={size}
          isLoading={isLoading}
          isError={isError}
          senderName={senderName}
          timestamp={timestamp}
        />
      </li>
    );
  }

  return (
    <li ref={elementRef} css={fileCardStyles}>
      <FileAssetCard
        id={uuid}
        src={src}
        variant={variant}
        extension={extension}
        name={name}
        size={size}
        imagePreviewUrl={imagePreviewUrl}
        pdfPreviewUrl={pdfPreviewUrl}
        isLoading={isLoading}
        isError={isError}
        senderName={senderName}
        timestamp={timestamp}
      />
    </li>
  );
};

const getName = (name: string): string => {
  const parts = name.split('/');
  const lastPart = parts[parts.length - 1];
  return trimFileExtension(lastPart);
};
