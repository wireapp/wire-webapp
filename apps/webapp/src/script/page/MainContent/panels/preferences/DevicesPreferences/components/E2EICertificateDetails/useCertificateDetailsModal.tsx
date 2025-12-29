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

import {useState, useEffect} from 'react';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {ModalOptions} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {downloadFile} from 'Util/util';

const logger = getLogger('useCertificateDetailsModal');

const COPY_MESSAGE_TIMEOUT = 3000;
const DOWNLOAD_CERTIFICATE_TIMEOUT = 500;
const CERTIFICATE_NAME = 'certificate.pem';
const CERTIFICATE_TYPE = 'application/x-pem-file';

const ModalMessageWrapper = ({message}: {message: string}) => (
  <div
    css={{
      overflow: 'auto',
      maxHeight: '350px',
      fontSize: 'var(--font-size-small)',
      letterSpacing: '0.05px',
      lineHeight: 'var(--line-height-md)',
      wordBreak: 'break-word',
      // The margin is set to -30px to compensate for the margin of the modal content
      marginBottom: '-30px',
    }}
  >
    <p>{message}</p>
  </div>
);

export const useCertificateDetailsModal = (certificate: string) => {
  const [isTextCopied, setIsTextCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isModalActive, setIsModalActive] = useState(false);

  useEffect(() => {
    if (isModalActive) {
      removeCurrentModal();
      showModal();
      // removeCurrentModal will trigger the close callback of the previous modal, so we need to reset the state
      setIsModalActive(true);
    }
  }, [isTextCopied, isDownloading, isModalActive]);

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
      logger.development.error('Failed to copy: ', err);
    }
  };

  const modalOptions: ModalOptions = {
    text: {
      title: t('E2EI.certificateDetails'),
      message: <ModalMessageWrapper message={certificate} />,
    },
    secondaryAction: [
      {
        action: onCopy,
        text: <>{t(isTextCopied ? 'E2EI.certificateCopied' : 'E2EI.copyCertificate')}</>,
        uieName: 'copy-certificate',
        disabled: isTextCopied,
      },
      {
        action: onDownload,
        text: t('E2EI.downloadCertificate'),
        uieName: 'download-certificate',
        disabled: isDownloading,
      },
    ],
    closeOnSecondaryAction: false,
    close: () => {
      setIsModalActive(false);
    },
  };
  const modalType = PrimaryModal.type.MULTI_ACTIONS;

  const showModal = () => {
    PrimaryModal.show(modalType, modalOptions);
  };

  return () => {
    setIsModalActive(true);
  };
};
