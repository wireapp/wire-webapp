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

import {splitFingerprint} from 'Util/StringUtil';

import {FormattedId} from './FormattedId';

interface MLSDeviceDetailsProps {
  fingerprint?: string;
}

// TODO: Replace with proper mls id
const TMP_MLS_FINGERPRINT = '3dc87fff07c9296e3dc87fff07c9296e65687fff07c9296e3dc87fff07c9656f';

export const MLSDeviceDetails = ({fingerprint = TMP_MLS_FINGERPRINT}: MLSDeviceDetailsProps) => {
  return (
    <div className="mls-device-details">
      <h4 className="paragraph-body-3">MLS with Ed255519 Signature</h4>

      <p className="label-2 preferences-label preferences-devices-fingerprint-label">MLS Thumbprint</p>

      <p className="preferences-devices-fingerprint" css={{width: '230px'}}>
        <FormattedId idSlices={splitFingerprint(fingerprint)} />
      </p>
    </div>
  );
};
