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
}

export const ProteusDeviceDetails = ({device, fingerprint, isProteusVerified = false}: ProteusDeviceDetailsProps) => {
  return (
    <div className="preferences-proteus-details">
      <h4>Proteus Device Details</h4>

      <div>
        <p className="label preferences-label preferences-devices-fingerprint-label">Proteus ID</p>

        <p className="preferences-devices-fingerprint" css={{width: '300px'}}>
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
        {/*{t('preferencesDevicesFingerprint')}*/}
        Proteus Key Fingerprint
      </h3>

      <p className="preferences-devices-fingerprint" css={{width: '300px'}}>
        <FormattedId idSlices={splitFingerprint(fingerprint)} />
      </p>

      <h3 className="label preferences-label preferences-devices-fingerprint-label">
        {/*{t('preferencesDevicesFingerprint')}*/}
        Verification Status
      </h3>

      <p className="preferences-devices-fingerprint">
        {isProteusVerified ? (
          <>
            Verified <Badges isProteusVerified />{' '}
          </>
        ) : (
          'Not verified'
        )}
      </p>
    </div>
  );
};
