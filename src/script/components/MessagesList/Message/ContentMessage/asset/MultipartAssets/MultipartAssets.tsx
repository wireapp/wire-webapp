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

import {itemStyles, listStyles} from './MultipartAssets.styles';

interface MultipartAssetsProps {
  assets: ICellAsset[];
}

export const MultipartAssets = ({assets}: MultipartAssetsProps) => {
  return (
    <ul css={listStyles}>
      {assets.map(asset => (
        <li key={asset.uuid} css={itemStyles}>
          <MultipartAsset {...asset} />
        </li>
      ))}
    </ul>
  );
};

const MultipartAsset = ({initialName, initialSize}: ICellAsset) => {
  const name = trimFileExtension(initialName!);
  const extension = getFileExtension(initialName!);
  const size = formatBytes(Number(initialSize));

  return (
    <FileCard.Root extension={extension} name={name} size={size}>
      <FileCard.Header>
        <FileCard.Icon />
        <FileCard.Type />
      </FileCard.Header>
      <FileCard.Name />
    </FileCard.Root>
  );
};
