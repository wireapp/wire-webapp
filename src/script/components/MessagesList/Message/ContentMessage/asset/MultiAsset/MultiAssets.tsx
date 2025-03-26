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

import {FileCard} from 'Components/FileCard/FileCard';
import {formatBytes, getFileExtension, trimFileExtension} from 'Util/util';

import {largeFileCardStyles, wrapperStyles} from './MultiAsset.styles';

interface MultiAssetsProps {
  assets: {uuid: string; contentType: string; initialName: string; initialSize: number}[];
}

export const MultiAssets = ({assets}: MultiAssetsProps) => {
  return (
    <ul css={wrapperStyles}>
      {assets.map(asset => (
        <MutliAsset key={asset.uuid} asset={asset} />
      ))}
    </ul>
  );
};

const MutliAsset = ({
  asset,
}: {
  asset: {uuid: string; contentType: string; initialName: string; initialSize: number};
}) => {
  const name = trimFileExtension(asset.initialName);
  const extension = getFileExtension(asset.initialName);
  const size = formatBytes(asset.initialSize);

  return (
    <div css={largeFileCardStyles} key={asset.uuid}>
      <FileCard.Root extension={extension} name={name} size={size}>
        <FileCard.Header>
          <FileCard.Icon />
          <FileCard.Type />
        </FileCard.Header>
        <FileCard.Name />
      </FileCard.Root>
    </div>
  );
};
