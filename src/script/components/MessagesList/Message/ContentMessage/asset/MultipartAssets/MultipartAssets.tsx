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

import {container} from 'tsyringe';

import {ICellAsset} from '@wireapp/protocol-messaging';

import {useInView} from 'Hooks/useInView/useInView';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

import {FileAssetCard} from './FileAssetCard/FileAssetCard';
import {ImageAssetCard} from './ImageAssetCard/ImageAssetCard';
import {largeCardStyles, listSingleItemStyles, listStyles, smallCardStyles} from './MultipartAssets.styles';
import {useGetMultipartAssetPreview} from './useGetMultipartAssetPreview/useGetMultipartAssetPreview';
import {VideoAssetCard} from './VideoAssetCard/VideoAssetCard';

interface MultipartAssetsProps {
  assets: ICellAsset[];
  cellsRepository?: CellsRepository;
}

export const MultipartAssets = ({
  assets,
  cellsRepository = container.resolve(CellsRepository),
}: MultipartAssetsProps) => {
  return (
    <ul css={assets.length === 1 ? listSingleItemStyles : listStyles}>
      {assets.map(asset => (
        <MultipartAsset key={asset.uuid} cellsRepository={cellsRepository} assetsCount={assets.length} {...asset} />
      ))}
    </ul>
  );
};

interface MultipartAssetProps extends ICellAsset {
  cellsRepository: CellsRepository;
  assetsCount: number;
}

const MultipartAsset = ({
  uuid,
  initialName,
  initialSize,
  contentType,
  cellsRepository,
  assetsCount,
}: MultipartAssetProps) => {
  const name = trimFileExtension(initialName!);
  const extension = getFileExtension(initialName!);
  const size = formatBytes(Number(initialSize));

  const {elementRef, hasBeenInView} = useInView<HTMLLIElement>();

  const isImage = contentType.startsWith('image');
  const isVideo = contentType.startsWith('video');

  const {src, status, previewImageUrl} = useGetMultipartAssetPreview({
    uuid,
    cellsRepository,
    isEnabled: hasBeenInView,
    retryUntilSuccess: true,
  });

  const isLoading = status === 'loading';
  const isError = status === 'error';

  const isSingleAsset = assetsCount === 1;

  if (isImage) {
    return (
      <li ref={elementRef} css={smallCardStyles}>
        <ImageAssetCard src={src} isLoading={isLoading} isError={isError} />
      </li>
    );
  }

  if (isVideo) {
    return (
      <li ref={elementRef} css={isSingleAsset ? largeCardStyles : smallCardStyles}>
        <VideoAssetCard
          variant={isSingleAsset ? 'large' : 'small'}
          src={src}
          extension={extension}
          name={name}
          size={size}
          isLoading={isLoading}
          isError={isError}
        />
      </li>
    );
  }

  return (
    <li ref={elementRef} css={isSingleAsset ? largeCardStyles : smallCardStyles}>
      <FileAssetCard
        variant={isSingleAsset ? 'large' : 'small'}
        extension={extension}
        name={name}
        size={size}
        isLoading={isLoading}
        isError={isError}
        previewImageUrl={previewImageUrl}
      />
    </li>
  );
};
