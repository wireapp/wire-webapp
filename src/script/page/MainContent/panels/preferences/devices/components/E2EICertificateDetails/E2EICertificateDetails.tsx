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

import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {Badges, MLSStatues} from 'Components/Badges';
import {CertificateDetailsModal} from 'Components/Modals/CertificateDetailsModal';
import {E2EIHandler} from 'src/script/E2EIdentity';
import {Core} from 'src/script/service/CoreSingleton';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {styles} from './E2EICertificateDetails.styles';

/* For now, we don't display Serial Number */
// const TMP_SERIAL_NUMBER = 'e5:d5:e6:75:7e:04:86:07:14:3c:a0:ed:9a:8d:e4:fd';
// const formattedSerialNumber = (serialNumber: string) => {
//   const splittedSerialNumber = serialNumber.split(':');
//
//   return splittedSerialNumber.map((slice, index) => {
//     const breakLine = splittedSerialNumber.length;
//
//     return (
//       <Fragment key={slice + index}>
//         {index > 0 ? <span css={styles.delimiter(breakLine)}>:</span> : null}
//
//         <span className="serial-number-part">{slice}</span>
//       </Fragment>
//     );
//   });
// };
const logger = getLogger('E2EICertificateDetails');

interface E2EICertificateDetailsProps {
  core?: Core;
  isMLSVerified?: boolean;
  isOtherDevice?: boolean;
}

export const E2EICertificateDetails = ({
  core = container.resolve(Core),
  isMLSVerified,
  isOtherDevice = false,
}: E2EICertificateDetailsProps) => {
  const [isCertificateDetailsModalOpen, setIsCertificateDetailsModalOpen] = useState(false);

  const e2eIdentity = core.service?.e2eIdentity;
  const hasActiveCertificate = e2eIdentity?.hasActiveCertificate();
  const isValid = !!hasActiveCertificate;
  const isNotActivated = !hasActiveCertificate;

  const getCertificate = async () => {
    try {
      const e2eHandler = E2EIHandler.getInstance();

      await e2eHandler.enrollE2EI();
    } catch (error) {
      logger.error('Cannot get E2EI instance: ', error);
    }
  };

  return (
    <div css={styles.container}>
      <h5 css={styles.title}>{t('E2EI.certificateTitle')}</h5>

      <div
        data-uie-name="e2ei-identity-status"
        data-uie-value={isValid ? 'Valid' : 'Not activated'}
        css={styles.e2eiStatusContainer}
      >
        <p className="label-1">
          <span>{t('E2EI.status')}</span>
          <strong css={styles.e2eiStatus(isValid ? MLSStatues.VALID : MLSStatues.NOT_ACTIVATED)}>
            {isValid ? t('E2EI.valid') : t(`E2EI.not_activated`)}
          </strong>
        </p>

        <Badges isMLSVerified={isMLSVerified} MLSStatus={isValid ? MLSStatues.VALID : MLSStatues.NOT_DOWNLOADED} />
      </div>

      {/* For now, we don't display Serial Number */}
      {/*<p css={styles.serialNumberWrapper}>*/}
      {/*  <span className="label-1">{t('E2EI.serialNumber')}</span>*/}

      {/*  {MLSStatus === MLSStatues.NOT_ACTIVATED ? (*/}
      {/*    <span className="label-1" css={styles.notAvailable}>*/}
      {/*      {t('E2EI.notAvailable')}*/}
      {/*    </span>*/}
      {/*  ) : (*/}
      {/*    <>*/}
      {/*      /!*<div css={styles.serialNumber}>e5:d5:e6:75:7e:04:86:07:14:3c:a0:ed:9a:8d:e4:fd</div>*!/*/}
      {/*      <p css={styles.serialNumber}>{formattedSerialNumber(TMP_SERIAL_NUMBER)}</p>*/}
      {/*    </>*/}
      {/*  )}*/}
      {/*</p>*/}

      <div>
        {!isNotActivated && (
          <Button
            variant={ButtonVariant.TERTIARY}
            onClick={() => setIsCertificateDetailsModalOpen(true)}
            data-uie-name="show-certificate-details"
          >
            {t('E2EI.showCertificateDetails')}
          </Button>
        )}

        {isCertificateDetailsModalOpen && hasActiveCertificate && (
          <CertificateDetailsModal
            certificate={e2eIdentity?.getCertificateData() || ''}
            onClose={() => setIsCertificateDetailsModalOpen(false)}
          />
        )}

        {!isOtherDevice && isNotActivated && (
          <Button variant={ButtonVariant.TERTIARY} onClick={getCertificate} data-uie-name="get-certificate">
            {t('E2EI.getCertificate')}
          </Button>
        )}

        {/* TODO: Waiting for functionality for updating certificate */}
        {/*{(isExpiresSoon || isExpired) && (*/}
        {/*  <Button variant={ButtonVariant.TERTIARY} onClick={updateCertificate} data-uie-name="update-certificate">*/}
        {/*    {t('E2EI.updateCertificate')}*/}
        {/*  </Button>*/}
        {/*)}*/}
      </div>
    </div>
  );
};
