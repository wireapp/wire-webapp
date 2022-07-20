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

import {FC, useMemo} from 'react';
import Icon from 'Components/Icon';
import {Config} from '../../Config';

interface PastedFileControlsProps {
  pastedFile: File;
  onClear: () => void;
  onSend: () => void;
}

const PastedFileControls: FC<PastedFileControlsProps> = ({pastedFile, onClear, onSend}) => {
  const pastedFilePreviewUrl = useMemo(() => {
    if (!pastedFile) {
      return '';
    }

    const isSupportedFileType = Config.getConfig().ALLOWED_IMAGE_TYPES.includes(pastedFile.type);

    if (isSupportedFileType) {
      return URL.createObjectURL(pastedFile);
    }

    return '';
  }, [pastedFile]);

  return (
    <div className="conversation-input-bar-paste-modal">
      <div className="controls-left"></div>

      <div className="controls-center">
        {pastedFilePreviewUrl ? (
          <img
            className="conversation-input-bar-paste-image conversation-input-bar-paste-icon"
            src={pastedFilePreviewUrl}
            alt={pastedFile.name}
          />
        ) : (
          <span className="conversation-input-bar-paste-icon">
            <Icon.File />
          </span>
        )}
        <span>{pastedFile.name}</span>
      </div>

      <div className="controls-right">
        <button type="button" className="conversation-input-bar-paste-cancel button-icon-large" onClick={onClear}>
          <Icon.Close />
        </button>

        <button type="button" className="conversation-input-bar-paste-send" onClick={onSend}>
          <Icon.Send />
        </button>
      </div>
    </div>
  );
};

export default PastedFileControls;
