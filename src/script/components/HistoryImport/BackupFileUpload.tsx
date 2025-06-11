/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {TabIndex, Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CONFIG as HistoryExportConfig} from 'Components/HistoryExport';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';

interface BackupFileUploadProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  backupImportHeadLine: string;
  variant: ButtonVariant;
  cssClassName?: string;
}

const BackupFileUpload = ({
  onFileChange,
  backupImportHeadLine,
  variant,
  cssClassName = 'button button-secondary',
}: BackupFileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileInputClick = () => fileInputRef.current?.click();

  return (
    <>
      <label className="preferences-history-backup-import-field" data-uie-name="do-backup-import" id="do-backup-import">
        <input
          id="file-import-input"
          ref={fileInputRef}
          tabIndex={TabIndex.UNFOCUSABLE}
          type="file"
          accept={`.${HistoryExportConfig.LEGACY_FILE_EXTENSION},.${HistoryExportConfig.UNIVERSAL_FILE_EXTENSION}`}
          onChange={onFileChange}
          onFocus={({target}) => target.blur()}
          data-uie-name="input-import-file"
          aria-describedby="preferences-history-describe-2"
        />
      </label>

      <Button
        variant={variant}
        className={cssClassName}
        role="button"
        tabIndex={TabIndex.FOCUSABLE}
        onKeyDown={event => handleKeyDown({event, callback: fileInputClick, keys: [KEY.ENTER, KEY.SPACE]})}
        onClick={() => fileInputRef.current?.click()}
        aria-labelledby="do-backup-import"
      >
        <span>{backupImportHeadLine}</span>
      </Button>
    </>
  );
};

export {BackupFileUpload};
