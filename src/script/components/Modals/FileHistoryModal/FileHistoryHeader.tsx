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

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';
import {FileLoader} from 'Components/FileFullscreenModal/FileLoader/FileLoader';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  fileHistoryCloseButtonCss,
  fileHistoryHeaderContainerCss,
  fileHistoryHeaderTitleCss,
  fileHeaderInfoWrapperCss,
  fileHeaderFileInfoCss,
} from './FileHistoryModal.styles';
import {useFileHistoryModal} from './hooks/useFileHistoryModal';
import {FileInfo} from './types';

export const FileHistoryHeader = ({file}: {file?: FileInfo}) => {
  const {hideModal} = useFileHistoryModal();

  return (
    <div css={fileHistoryHeaderContainerCss}>
      <div css={fileHeaderInfoWrapperCss}>
        <h2 css={fileHistoryHeaderTitleCss}>{t('cells.versionHistory.title')}</h2>

        <div css={fileHeaderFileInfoCss}>
          {file ? (
            <>
              <FileTypeIcon extension={file.extension} />
              {file.name}
            </>
          ) : (
            <FileLoader />
          )}
        </div>
      </div>
      <button
        css={fileHistoryCloseButtonCss}
        onClick={hideModal}
        aria-label={t('cells.versionHistory.closeAriaLabel')}
        data-uie-name="do-close-file-history"
      >
        <Icon.CloseIcon width={14} height={14} />
      </button>
    </div>
  );
};
