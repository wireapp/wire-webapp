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

import {useEffect, useState} from 'react';

import {TMP_DecoratedWireIdentity} from 'src/script/E2EIdentity';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {styles} from './MLSDeviceDetails.styles';

import {MLSPublicKeys} from '../../../../../../../client';
import {E2EICertificateDetails} from '../E2EICertificateDetails';
import {FormattedId} from '../FormattedId';

interface MLSDeviceDetailsProps {
  isCurrentDevice?: boolean;
  getDeviceIdentity: () => Promise<TMP_DecoratedWireIdentity | undefined>;
}

export const MLSDeviceDetails = ({isCurrentDevice, getDeviceIdentity}: MLSDeviceDetailsProps) => {
  const [identity, setIdentity] = useState<TMP_DecoratedWireIdentity | undefined>();
  useEffect(() => {
    getDeviceIdentity?.().then(setIdentity);
  }, []);

  return (
    <div css={styles.wrapper}>
      <h4 className="paragraph-body-3">{t('mlsSignature', MLSPublicKeys.ED25519.toUpperCase())}</h4>

      {identity?.thumbprint && (
        <>
          <p className="label-2 preferences-label preferences-devices-fingerprint-label">{t('mlsThumbprint')}</p>

          <p className="preferences-devices-fingerprint" css={{width: '230px'}}>
            <FormattedId idSlices={splitFingerprint(identity.thumbprint)} />
          </p>
        </>
      )}

      <E2EICertificateDetails identity={identity} isCurrentDevice={isCurrentDevice} />
    </div>
  );
};
