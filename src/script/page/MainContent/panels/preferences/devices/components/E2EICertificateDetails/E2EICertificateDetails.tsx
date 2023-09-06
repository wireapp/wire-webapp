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
import {Core} from 'src/script/service/CoreSingleton';
import {t} from 'Util/LocalizerUtil';

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

interface E2ECertificateDetailsProps {
  core?: Core;
  isMLSVerified?: boolean;
}

export const E2EICertificateDetails = ({core = container.resolve(Core), isMLSVerified}: E2ECertificateDetailsProps) => {
  // TODO: This functionality need to be added in e2eIdentity service.
  const MLSStatus = undefined;

  const [isCertificateDetailsModalOpen, setIsCertificateDetailsModalOpen] = useState(false);

  const certificate = core.service?.e2eIdentity?.getCertificateData();

  if (!certificate) {
    return null;
  }

  const isExpired = MLSStatus === MLSStatues.EXPIRED;
  const isNotDownloaded = MLSStatus === MLSStatues.NOT_DOWNLOADED;
  const isExpiresSoon = MLSStatus === MLSStatues.EXPIRES_SOON;
  const isNotActivated = MLSStatus === MLSStatues.NOT_ACTIVATED;

  const isValid = !isExpired && !isNotDownloaded && !isExpiresSoon && !isNotActivated;

  const getCertificate = () => {
    // eslint-disable-next-line no-console
    console.log('Get Certificate');
  };

  const updateCertificate = () => {
    // eslint-disable-next-line no-console
    console.log('Update Certificate');
  };

  return (
    <div css={styles.container}>
      <h5 css={styles.title}>{t('E2E.certificateTitle')}</h5>

      <div
        data-uie-name="e2e-identity-status"
        data-uie-value={isValid ? 'Valid' : MLSStatus}
        css={styles.e2eStatusContainer}
      >
        <p className="label-1">
          <span>{t('E2E.status')}</span>
          <strong css={styles.e2eStatus(isValid ? MLSStatues.VALID : MLSStatus)}>
            {isValid ? t('E2E.valid') : t(`E2E.${MLSStatus}`)}
          </strong>
        </p>

        <Badges isMLSVerified={isMLSVerified} MLSStatus={MLSStatus} />
      </div>

      {/* For now, we don't display Serial Number */}
      {/*<p css={styles.serialNumberWrapper}>*/}
      {/*  <span className="label-1">{t('E2E.serialNumber')}</span>*/}

      {/*  {MLSStatus === MLSStatues.NOT_ACTIVATED ? (*/}
      {/*    <span className="label-1" css={styles.notAvailable}>*/}
      {/*      {t('E2E.notAvailable')}*/}
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
            {t('E2E.showCertificateDetails')}
          </Button>
        )}

        {isCertificateDetailsModalOpen && (
          <CertificateDetailsModal
            certificate={certificate}
            onClose={() => setIsCertificateDetailsModalOpen(false)}
            downloadCertificate={getCertificate}
          />
        )}

        {isNotActivated && (
          <Button variant={ButtonVariant.TERTIARY} onClick={getCertificate} data-uie-name="get-certificate">
            {t('E2E.getCertificate')}
          </Button>
        )}

        {(isExpiresSoon || isExpired) && (
          <Button variant={ButtonVariant.TERTIARY} onClick={updateCertificate} data-uie-name="update-certificate">
            {t('E2E.updateCertificate')}
          </Button>
        )}
      </div>
    </div>
  );
};
