/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useRef} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

interface AssetUploadButtonProps {
  onSelectFiles: (files: File[]) => void;
  acceptedFileTypes?: string[];
}

export const AssetUploadButton = ({onSelectFiles, acceptedFileTypes}: AssetUploadButtonProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {files} = event.target;

    if (!files) {
      return;
    }

    onSelectFiles(Array.from(files));

    //reset file input's value resetting form wrapper
    formRef.current?.reset();
  };

  return (
    <form ref={formRef}>
      <button
        type="button"
        aria-label={t('tooltipConversationFile')}
        title={t('tooltipConversationFile')}
        className="input-bar-control file-button"
        onClick={() => fileRef.current?.click()}
        data-uie-name="do-share-file"
      >
        <Icon.AttachmentIcon />
        <input
          ref={fileRef}
          accept={acceptedFileTypes?.join(',')}
          id="conversation-input-bar-files"
          tabIndex={TabIndex.UNFOCUSABLE}
          onChange={handleFileChange}
          type="file"
          multiple
        />
      </button>
    </form>
  );
};
