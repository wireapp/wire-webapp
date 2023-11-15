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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CertificateDetailsModal} from 'Components/Modals/CertificateDetailsModal';
import {VerificationBadges} from 'Components/VerificationBadge';
import {E2EIHandler} from 'src/script/E2EIdentity';
import {getCertificateDetails, getCertificateState} from 'Util/certificateDetails';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {styles} from './E2EICertificateDetails.styles';

const logger = getLogger('E2EICertificateDetails');

interface E2EICertificateDetailsProps {
  certificate?: string;
  isOtherDevice?: boolean;
}

export const E2EICertificateDetails = ({certificate, isOtherDevice = false}: E2EICertificateDetailsProps) => {
  const [isCertificateDetailsModalOpen, setIsCertificateDetailsModalOpen] = useState(false);

  const {isNotDownloaded, isValid, isExpireSoon} = getCertificateDetails(certificate);
  const certificateState = getCertificateState({isNotDownloaded, isValid, isExpireSoon});

  const updateCertificate = (): null => {
    // TODO: Waiting for update certificate implementation
    return null;
  };

  const getCertificate = async () => {
    try {
      const e2eHandler = E2EIHandler.getInstance();

      await e2eHandler.enroll();
    } catch (error) {
      logger.error('Cannot get E2EI instance: ', error);
    }
  };

  return (
    <div css={styles.container}>
      <h5 css={styles.title}>{t('E2EI.certificateTitle')}</h5>

      <div data-uie-name="e2ei-identity-status" data-uie-value={certificateState} css={styles.e2eiStatusContainer}>
        <p className="label-1">
          <span>{t('E2EI.status')}</span>
          <strong css={styles.e2eiStatus(certificateState)}>{t(`E2EI.${certificateState}`)}</strong>
        </p>

        <VerificationBadges MLSStatus={certificateState} />
      </div>

      <div css={styles.buttonsGroup}>
        {!isNotDownloaded && (
          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => setIsCertificateDetailsModalOpen(true)}
            data-uie-name="show-certificate-details"
          >
            {t('E2EI.showCertificateDetails')}
          </Button>
        )}

        {isCertificateDetailsModalOpen && certificate && (
          <CertificateDetailsModal certificate={certificate} onClose={() => setIsCertificateDetailsModalOpen(false)} />
        )}

        {!isOtherDevice && isNotDownloaded && (
          <Button variant={ButtonVariant.TERTIARY} onClick={getCertificate} data-uie-name="get-certificate">
            {t('E2EI.getCertificate')}
          </Button>
        )}

        {!isOtherDevice && certificate && !isValid && (
          <Button variant={ButtonVariant.TERTIARY} onClick={updateCertificate} data-uie-name="update-certificate">
            {t('E2EI.updateCertificate')}
          </Button>
        )}
      </div>
    </div>
  );
};
