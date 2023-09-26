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

import {Badges} from 'Components/Badges';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';
import {formatTimestamp} from 'Util/TimeUtil';

import {type DeviceProps} from './DetailedDevice';
import {FormattedId} from './FormattedId';

interface ProteusDeviceDetailsProps extends DeviceProps {
  isProteusVerified?: boolean;
  showVerificationStatus?: boolean;
}

export const ProteusDeviceDetails = ({
  device,
  fingerprint,
  isProteusVerified = false,
  showVerificationStatus = true,
}: ProteusDeviceDetailsProps) => {
  return (
    <div className="preferences-proteus-details">
      <h4>{t('proteusDeviceDetails')}</h4>

      <div>
        <p className="label preferences-label preferences-devices-fingerprint-label">{t('proteusID')}</p>

        <p className="preferences-devices-fingerprint" css={{width: '230px'}}>
          <FormattedId idSlices={splitFingerprint(device.id)} />
        </p>
      </div>

      {device.time !== undefined && (
        <div>
          <p className="label preferences-label preferences-devices-fingerprint-label">
            {t('preferencesDevicesActivatedOn')}
          </p>

          <p className="preferences-devices-fingerprint">{formatTimestamp(device.time)}</p>
        </div>
      )}

      <h3 className="label preferences-label preferences-devices-fingerprint-label">
        {t('participantDevicesProteusKeyFingerprint')}
      </h3>

      <p className="preferences-devices-fingerprint" css={{width: '230px'}}>
        <FormattedId idSlices={splitFingerprint(fingerprint)} />
      </p>

      <h3 className="label preferences-label preferences-devices-fingerprint-label">
        {t('preferencesDeviceDetailsVerificationStatus')}
      </h3>

      {showVerificationStatus && (
        <p className="preferences-devices-verification-details">
          {isProteusVerified ? (
            <>
              <span>{t('proteusVerified')}</span>
              <Badges isProteusVerified />
            </>
          ) : (
            <span>{t('proteusNotVerified')}</span>
          )}
        </p>
      )}
    </div>
  );
};
