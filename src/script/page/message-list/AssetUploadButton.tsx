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

import {useState, useRef} from 'react';
import {Config} from '../../Config';
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';

interface AssetUploadButtonProps {
  onSelectFiles: (files: File[]) => void;
}

export const AssetUploadButton = ({onSelectFiles}: AssetUploadButtonProps) => {
  const [inputKey, setInputKey] = useState(Date.now());
  const acceptedFileTypes = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS.join(',');
  const fileRef = useRef<HTMLInputElement>(null!);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {files} = event.target;

    if (!files) {
      return;
    }

    onSelectFiles(Array.from(files));

    //reset file input's value by re-rendering the component
    setInputKey(Date.now());
  };

  return (
    <button
      type="button"
      aria-label={t('tooltipConversationFile')}
      title={t('tooltipConversationFile')}
      className="conversation-button controls-right-button no-radius file-button"
      onClick={() => fileRef.current?.click()}
      data-uie-name="do-share-file"
    >
      <Icon.Attachment />
      <input
        key={inputKey}
        ref={fileRef}
        accept={acceptedFileTypes ?? null}
        id="conversation-input-bar-files"
        data-uie-name="conversation-input-bar-files"
        tabIndex={-1}
        onChange={handleFileChange}
        type="file"
      />
    </button>
  );
};
