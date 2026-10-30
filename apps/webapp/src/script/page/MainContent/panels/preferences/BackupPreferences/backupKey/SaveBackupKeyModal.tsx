/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useId, useState} from 'react';

import {AlertIcon, CheckIcon, Checkbox, CheckboxLabel, CopyIcon, DownloadIcon, TabIndex} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {Config} from 'src/script/Config';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {copyBackupKey, downloadBackupKey, generateBackupKey} from './BackupKey';
import {
  bodyStyle,
  errorStyle,
  modalWrapperStyle,
  optionStyle,
  optionSubStyle,
  optionsStyle,
  optionTextStyle,
  optionTitleStyle,
  subtitleStyle,
  warningStyle,
} from './SaveBackupKeyModal.styles';
import {useBackupKeyStore} from './useBackupKeyStore';

interface SaveBackupKeyModalProps {
  onClose: () => void;
}

type Step = 'save' | 'skipWarning';

/**
 * Generates a new backup encryption key and lets the user save it (copy or download).
 * The key is only committed to the store on Continue / Skip anyway; closing the modal discards it.
 */
export const SaveBackupKeyModal = ({onClose}: SaveBackupKeyModalProps) => {
  const brandName = Config.getConfig().BRAND_NAME;
  const setKey = useBackupKeyStore(state => state.setKey);

  const [pendingKey] = useState(generateBackupKey);
  const [step, setStep] = useState<Step>('save');
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showError, setShowError] = useState(false);

  const titleId = useId();
  const checkboxId = useId();

  const markSaved = () => {
    setIsSaved(true);
    setShowError(false);
  };

  const onCopy = async () => {
    try {
      await copyBackupKey(pendingKey);
      setIsCopied(true);
      markSaved();
    } catch {
      // Clipboard not available, the user can still download the key file
    }
  };

  const onDownload = () => {
    downloadBackupKey(pendingKey);
    setIsDownloaded(true);
    markSaved();
  };

  const commitKey = () => {
    setKey(pendingKey);
    onClose();
  };

  const onContinue = () => {
    if (!isSaved) {
      setShowError(true);
      return;
    }
    commitKey();
  };

  const isSaveStep = step === 'save';
  const title = isSaveStep ? t('preferencesBackupKeySaveTitle') : t('preferencesBackupKeySkipTitle');

  return (
    <ModalComponent
      isShown
      wrapperCSS={modalWrapperStyle}
      onBgClick={onClose}
      onKeyDown={event => handleEscDown(event, onClose)}
      aria-labelledby={titleId}
      data-uie-name="backup-key-modal"
    >
      <div className="modal__header">
        <h2 className="modal__header__title" id={titleId}>
          {title}
        </h2>
        <button
          type="button"
          className="modal__header__button"
          onClick={onClose}
          aria-label={t('modalCloseButton')}
          data-uie-name="do-close"
        >
          <Icon.CloseIcon className="modal__header__icon" aria-hidden="true" />
        </button>
      </div>

      {isSaveStep ? (
        <>
          <div className="modal__body" css={bodyStyle}>
            <p css={subtitleStyle}>{t('preferencesBackupKeySaveSubtitle', {brandName})}</p>

            <div css={warningStyle} role="note">
              <AlertIcon />
              <p>
                <strong>{t('preferencesBackupKeySaveWarningTitle')}</strong>{' '}
                {t('preferencesBackupKeySaveWarning', {brandName})}
              </p>
            </div>

            <div css={optionsStyle}>
              <button type="button" css={optionStyle(isCopied)} onClick={onCopy} data-uie-name="do-copy-backup-key">
                {isCopied ? <CheckIcon /> : <CopyIcon />}
                <span css={optionTextStyle}>
                  <span css={optionTitleStyle}>{t('preferencesBackupKeyCopy')}</span>
                  <span css={optionSubStyle}>
                    {isCopied ? t('preferencesBackupKeyCopied') : t('preferencesBackupKeyCopySub')}
                  </span>
                </span>
              </button>

              <button
                type="button"
                css={optionStyle(isDownloaded)}
                onClick={onDownload}
                data-uie-name="do-download-backup-key"
              >
                {isDownloaded ? <CheckIcon /> : <DownloadIcon />}
                <span css={optionTextStyle}>
                  <span css={optionTitleStyle}>{t('preferencesBackupKeyDownload')}</span>
                  <span css={optionSubStyle}>
                    {isDownloaded ? t('preferencesBackupKeyDownloaded') : t('preferencesBackupKeyDownloadSub')}
                  </span>
                </span>
              </button>
            </div>

            <Checkbox
              id={checkboxId}
              tabIndex={TabIndex.FOCUSABLE}
              checked={isSaved}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setIsSaved(event.target.checked);
                setShowError(false);
              }}
              data-uie-name="backup-key-saved-checkbox"
            >
              <CheckboxLabel htmlFor={checkboxId}>{t('preferencesBackupKeyCheckbox')}</CheckboxLabel>
            </Checkbox>

            {showError && (
              <p css={errorStyle} role="alert" data-uie-name="backup-key-error">
                {t('preferencesBackupKeyError')}
              </p>
            )}
          </div>

          <div className="modal__buttons">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={() => setStep('skipWarning')}
              data-uie-name="do-skip-backup-key"
            >
              {t('preferencesBackupKeySkip')}
            </button>
            <button
              type="button"
              className="modal__button modal__button--primary"
              onClick={onContinue}
              data-uie-name="do-continue-backup-key"
            >
              {t('preferencesBackupKeyContinue')}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="modal__body" css={bodyStyle}>
            <p css={subtitleStyle}>{t('preferencesBackupKeySkipMessage', {brandName})}</p>
          </div>

          <div className="modal__buttons">
            <button
              type="button"
              className="modal__button modal__button--secondary"
              onClick={commitKey}
              data-uie-name="do-skip-backup-key-anyway"
            >
              {t('preferencesBackupKeySkipAnyway')}
            </button>
            <button
              type="button"
              className="modal__button modal__button--primary"
              onClick={() => setStep('save')}
              data-uie-name="do-back-to-backup-key"
            >
              {t('preferencesBackupKeySkipBack')}
            </button>
          </div>
        </>
      )}
    </ModalComponent>
  );
};
