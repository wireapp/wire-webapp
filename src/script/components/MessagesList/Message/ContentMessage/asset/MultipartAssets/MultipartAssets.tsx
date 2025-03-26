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

import {ICellAsset} from '@pydio/protocol-messaging';

import {FileCard} from 'Components/FileCard/FileCard';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

import {largeCardStyles, listStyles, smallCardStyles} from './MultipartAssets.styles';
import {ImageAssetCard} from './ImageAssetCard/ImageAssetCard';
import {VideoAssetCard} from './VideoAssetCard/VideoAssetCard';
import {useEffect, useState} from 'react';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {container} from 'tsyringe';
import {useInView} from 'Hooks/useInView/useInView';

interface MultipartAssetsProps {
  assets: ICellAsset[];
  cellsRepository?: CellsRepository;
}

export const MultipartAssets = ({assets}: MultipartAssetsProps) => {
  return (
    <ul css={listStyles}>
      {assets.map(asset => (
        <MultipartAsset key={asset.uuid} {...asset} />
      ))}
    </ul>
  );
};

interface MultipartAssetProps extends ICellAsset {
  cellsRepository?: CellsRepository;
}

const MultipartAsset = ({
  uuid,
  initialName,
  initialSize,
  contentType,
  cellsRepository = container.resolve(CellsRepository),
}: MultipartAssetProps) => {
  const name = trimFileExtension(initialName!);
  const extension = getFileExtension(initialName!);
  const size = formatBytes(Number(initialSize));
  const {elementRef, hasBeenInView} = useInView<HTMLLIElement>();

  const [src, setSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  const isImage = contentType.startsWith('image');
  const isVideo = contentType.startsWith('video');

  useEffect(() => {
    if (!hasBeenInView) {
      return;
    }

    cellsRepository.getFile({uuid}).then(asset => {
      setSrc(asset.PreSignedGET?.Url);
      setIsLoading(false);
    });
  }, [hasBeenInView]);

  if (isImage) {
    return (
      <li ref={elementRef} css={smallCardStyles}>
        <ImageAssetCard src={src} onRetry={() => {}} isLoading={isLoading} isError={false} />
      </li>
    );
  }

  if (isVideo) {
    return (
      <li ref={elementRef} css={smallCardStyles}>
        <VideoAssetCard src={src} onRetry={() => {}} isLoading={isLoading} isError={false} />
      </li>
    );
  }

  return (
    <li ref={elementRef} css={largeCardStyles}>
      <FileCard.Root extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon />
          <FileCard.Type />
        </FileCard.Header>
        <FileCard.Name />
      </FileCard.Root>
    </li>
  );
};
