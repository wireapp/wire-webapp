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

import {FC} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../../Config';

interface PastedFileControlsProps {
  pastedFile: File;
  onClear: () => void;
  onSend: () => void;
}

export const PastedFileControls: FC<PastedFileControlsProps> = ({pastedFile, onClear, onSend}) => {
  const isSupportedFileType = (Config.getConfig().ALLOWED_IMAGE_TYPES as ReadonlyArray<string>).includes(
    pastedFile.type,
  );
  const pastedFilePreviewUrl = isSupportedFileType ? URL.createObjectURL(pastedFile) : '';

  return (
    <div
      className="conversation-input-bar-paste-modal"
      data-uie-name="pasted-file-controls"
      aria-label={pastedFile.name}
    >
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
            <Icon.FileIcon />
          </span>
        )}

        {}
        <span tabIndex={TabIndex.FOCUSABLE}>{pastedFile.name}</span>
      </div>

      <div className="controls-right">
        <button
          type="button"
          className="conversation-input-bar-paste-cancel button-icon-large"
          onClick={onClear}
          aria-label={t('pastedFileCloseMessage')}
        >
          <Icon.CloseIcon />
        </button>

        <button
          type="button"
          className="conversation-input-bar-paste-send"
          onClick={onSend}
          aria-label={t('pastedFileSendMessage')}
        >
          <Icon.SendIcon />
        </button>
      </div>
    </div>
  );
};
