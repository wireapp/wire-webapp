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

import {isKnownSignature, MLSPublicKeys} from 'Repositories/client';
import {E2EIHandler, MLSStatuses, WireIdentity} from 'src/script/E2EIdentity';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {styles} from './MLSDeviceDetails.styles';

import {E2EICertificateDetails} from '../E2EICertificateDetails';
import {FormattedId} from '../FormattedId';

interface MLSDeviceDetailsProps {
  cipherSuite?: string;
  isCurrentDevice?: boolean;
  identity?: WireIdentity;
  isSelfUser?: boolean;
}

export const MLSDeviceDetails = ({
  cipherSuite,
  isCurrentDevice,
  identity,
  isSelfUser = false,
}: MLSDeviceDetailsProps) => {
  if (!isCurrentDevice && !identity) {
    return null;
  }

  const certificateState = identity?.status ?? MLSStatuses.NOT_ACTIVATED;
  const isE2EIEnabled = E2EIHandler.getInstance().isE2EIEnabled();
  const showE2EICertificateDetails =
    isE2EIEnabled && (isSelfUser || (!isSelfUser && certificateState !== MLSStatuses.NOT_ACTIVATED));

  if (!showE2EICertificateDetails && !identity?.thumbprint) {
    return null;
  }

  return (
    <div css={styles.wrapper}>
      {isKnownSignature(cipherSuite) && (
        <h4 className="paragraph-body-3">{t('mlsSignature', {signature: MLSPublicKeys[cipherSuite]})}</h4>
      )}

      {identity?.thumbprint && (
        <>
          <p className="label-2 preferences-label preferences-devices-fingerprint-label">{t('mlsThumbprint')}</p>

          <p className="preferences-devices-fingerprint" css={{width: '230px'}}>
            <FormattedId idSlices={splitFingerprint(identity.thumbprint)} />
          </p>
        </>
      )}

      {showE2EICertificateDetails && <E2EICertificateDetails identity={identity} isCurrentDevice={isCurrentDevice} />}
    </div>
  );
};
