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

import {GenericMessage} from '@wireapp/protocol-messaging';

import {LoadingBar} from 'Components/LoadingBar';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {t} from 'Util/LocalizerUtil';

import {uploadingProgressText} from './UploadAssetItem.styles';

interface Props {
  assetRepository: AssetRepository;
  message: GenericMessage;
  scrollToEnd?: () => void;
}

export const UploadAssetItem = ({assetRepository, message, scrollToEnd}: Props) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const progressSubscribable = assetRepository.getUploadProgress(message.messageId);
    setUploadProgress(progressSubscribable());
    const subscription = progressSubscribable.subscribe(value => setUploadProgress(value));

    scrollToEnd?.();

    return () => {
      subscription.dispose();
    };
  }, [assetRepository, message]);

  const cancelUpload = async () => {
    assetRepository.cancelUpload(message.messageId);
  };

  return (
    <div data-uie-name="upload-asset-item" data-uie-value={message.messageId}>
      <span css={uploadingProgressText}>
        {t('conversationAssetUploading')} {message.asset?.original?.name || ''} - {Math.trunc(uploadProgress)}%
      </span>

      <LoadingBar className="uploading-asset" progress={uploadProgress} centerText={false} />

      <button
        data-uie-name="cancel-asset-item-upload"
        className="uploading-asset button-reset-default accent-text"
        onClick={cancelUpload}
      >
        {t('conversationAssetUploadCancel')}
      </button>
    </div>
  );
};
