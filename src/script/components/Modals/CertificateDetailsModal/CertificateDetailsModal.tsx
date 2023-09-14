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
import {downloadFile} from 'Util/util';

import {styles} from './CertificateDetailsModal.styles';

const COPY_MESSAGE_TIMEOUT = 3000;
const DOWNLOAD_CERTIFICATE_TIMEOUT = 500;
const CERTIFICATE_NAME = 'certificate.pem';
const CERTIFICATE_TYPE = 'application/x-pem-file';

export interface CertificateDetailsModalProps {
  certificate: string;
  onClose: () => void;
}

export const CertificateDetailsModal = ({certificate, onClose}: CertificateDetailsModalProps) => {
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownload = () => {
    setIsDownloading(true);

    const certificateUrl = `data:${CERTIFICATE_TYPE},${encodeURIComponent(certificate)}`;
    downloadFile(certificateUrl, CERTIFICATE_NAME, CERTIFICATE_TYPE);

    setTimeout(() => {
      setIsDownloading(false);
    }, DOWNLOAD_CERTIFICATE_TIMEOUT);
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
    <ModalComponent
      isShown
      onBgClick={onClose}
      onClosed={onClose}
      data-uie-name="modal-certificate-details"
      wrapperCSS={styles.modalWrapper}
    >
      <div className="modal__header">
        <h2 className="modal__header__title" data-uie-name="status-modal-title">
          {t('E2EI.certificateDetails')}
        </h2>

        <button type="button" className="modal__header__button" onClick={onClose} data-uie-name="do-close">
          <Icon.Close />
        </button>
      </div>

      <div className="modal__body" css={styles.content}>
        {certificate}
      </div>

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
  );
};
