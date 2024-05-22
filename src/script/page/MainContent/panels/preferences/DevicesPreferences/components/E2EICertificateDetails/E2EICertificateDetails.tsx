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

import {CredentialType} from '@wireapp/core/lib/messagingProtocols/mls';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {VerificationBadges} from 'Components/VerificationBadge';
import {E2EIHandler, MLSStatuses, WireIdentity} from 'src/script/E2EIdentity';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {styles} from './E2EICertificateDetails.styles';
import {useCertificateDetailsModal} from './useCertificateDetailsModal';

const logger = getLogger('E2EICertificateDetails');

interface E2EICertificateDetailsProps {
  identity?: WireIdentity;
  isCurrentDevice?: boolean;
}

const getCertificateState = (identity?: WireIdentity) => {
  if (!identity || identity.credentialType === CredentialType.Basic) {
    return MLSStatuses.NOT_ACTIVATED;
  }

  return identity.status;
};

export const E2EICertificateDetails = ({identity, isCurrentDevice}: E2EICertificateDetailsProps) => {
  const certificate = identity?.x509Identity?.certificate;
  const showModal = useCertificateDetailsModal(certificate ?? '');

  const certificateState = getCertificateState(identity);
  const isNotActivated = certificateState === MLSStatuses.NOT_ACTIVATED;
  const isValid = certificateState === MLSStatuses.VALID;
  const hasCertificate = !!certificate && Boolean(certificate.length);

  const getCertificate = async () => {
    try {
      await E2EIHandler.getInstance().enroll();
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

        <VerificationBadges MLSStatus={certificateState} context="device" />
      </div>

      <div css={styles.buttonsGroup}>
        {!isNotActivated && hasCertificate && (
          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={showModal}
            data-uie-name="show-certificate-details"
            aria-label={t('E2EI.showCertificateDetails')}
            tabIndex={TabIndex.FOCUSABLE}
          >
            {t('E2EI.showCertificateDetails')}
          </Button>
        )}

        {isCurrentDevice && (
          <>
            {isNotActivated && (
              <Button
                variant={ButtonVariant.TERTIARY}
                onClick={getCertificate}
                data-uie-name="get-certificate"
                aria-label={t('E2EI.getCertificate')}
                tabIndex={TabIndex.FOCUSABLE}
              >
                {t('E2EI.getCertificate')}
              </Button>
            )}

            {certificate && !isValid && (
              <Button
                variant={ButtonVariant.TERTIARY}
                onClick={getCertificate}
                data-uie-name="update-certificate"
                aria-label={t('E2EI.updateCertificate')}
                tabIndex={TabIndex.FOCUSABLE}
              >
                {t('E2EI.updateCertificate')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
