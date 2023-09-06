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

import {useState} from 'react';

import {Icon} from 'Components/Icon';
import {ModalComponent} from 'Components/ModalComponent';
import {t} from 'Util/LocalizerUtil';

const COPY_MESSAGE_TIMEOUT = 3000;

export interface CertificateDetailsModalProps {
  certificate: string;
  onClose: () => void;
  downloadCertificate: () => void;
}

export const CertificateDetailsModal = ({certificate, onClose, downloadCertificate}: CertificateDetailsModalProps) => {
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownload = () => {
    setIsDownloading(true);
    downloadCertificate();

    setTimeout(() => {
      setIsDownloading(false);
    }, COPY_MESSAGE_TIMEOUT);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(certificate).then(() => {
        setIsTextCopied(true);

        setTimeout(() => {
          setIsTextCopied(false);
        }, COPY_MESSAGE_TIMEOUT);
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="modal__certificate-details">
      <ModalComponent isShown onBgClick={onClose} onClosed={onClose} data-uie-name="modal-certificate-details">
        <div className="modal__header">
          <h2 className="modal__header__title" data-uie-name="status-modal-title">
            {t('E2EI.certificateDetails')}
          </h2>

          <button type="button" className="modal__header__button" onClick={onClose} data-uie-name="do-close">
            <Icon.Close />
          </button>
        </div>

        <div className="modal__body">{certificate}</div>

        <div className="modal__buttons">
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className="modal__button modal__button--secondary"
            data-uie-name="download-certificate"
          >
            {t('E2EI.downloadCertificate')}
          </button>

          <button
            type="button"
            onClick={onCopy}
            disabled={isTextCopied}
            className="modal__button modal__button--secondary"
            data-uie-name="copy-certificate"
          >
            {t(isTextCopied ? 'E2EI.certificateCopied' : 'E2EI.copyCertificate')}
          </button>
        </div>
      </ModalComponent>
    </div>
  );
};
