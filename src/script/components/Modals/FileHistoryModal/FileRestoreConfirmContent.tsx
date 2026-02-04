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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  fileHistoryRestoreCloseButtonCss,
  restoreModalButtonCss,
  restoreModalButtonsContainerCss,
  restoreModalContainerCss,
  restoreModalDescriptionCss,
  restoreModalTitleCss,
} from './FileHistoryModal.styles';

interface FileRestoreConfirmModalProps {
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const FileRestoreConfirmContent = ({isLoading, onClose, onConfirm}: FileRestoreConfirmModalProps) => {
  return (
    <div css={restoreModalContainerCss}>
      <button
        css={fileHistoryRestoreCloseButtonCss}
        onClick={onClose}
        aria-label={t('cells.versionHistory.closeAriaLabel')}
        data-uie-name="do-close-file-history"
      >
        <Icon.CloseIcon width={14} height={14} />
      </button>
      <h2 css={restoreModalTitleCss}>{t('cells.versionHistory.restoreModal.title')}</h2>
      <p css={restoreModalDescriptionCss}>{t('cells.versionHistory.restoreModal.description')}</p>
      <div css={restoreModalButtonsContainerCss}>
        <Button css={restoreModalButtonCss} onClick={onClose} variant={ButtonVariant.TERTIARY}>
          {t('cells.versionHistory.restoreModal.cancel')}
        </Button>
        <Button showLoading={isLoading} css={restoreModalButtonCss} onClick={onConfirm}>
          {t('cells.versionHistory.restoreModal.confirm')}
        </Button>
      </div>
    </div>
  );
};
