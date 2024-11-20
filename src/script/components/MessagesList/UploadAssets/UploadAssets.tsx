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

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {UploadAssetItem} from './components/UploadAssetItem';
import {uploadAssetsContainer} from './UploadAssets.styles';

import {AssetRepository} from '../../../assets/AssetRepository';

interface Props {
  assetRepository: AssetRepository;
}

export const UploadAssets = ({assetRepository}: Props) => {
  const {processQueue, uploadProgressQueue} = useKoSubscribableChildren(assetRepository, [
    'processQueue',
    'uploadProgressQueue',
  ]);

  if (!processQueue.length) {
    return null;
  }

  return (
    <div css={uploadAssetsContainer}>
      {processQueue.map((processingMessage, key) => {
        const processingAsset = uploadProgressQueue.find(mess => mess.messageId === processingMessage.messageId);

        if (!processingAsset) {
          return null;
        }

        return <UploadAssetItem assetRepository={assetRepository} message={processingMessage} key={key} />;
      })}
    </div>
  );
};
