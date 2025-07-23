/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import cx from 'classnames';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {ClientState} from 'Repositories/client/ClientState';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {FormattedId} from '../../../../page/MainContent/panels/preferences/DevicesPreferences/components/FormattedId';
import {DeviceCard} from '../DeviceCard';

interface SelfFingerprintProps {
  clientState?: ClientState;
  cryptographyRepository: CryptographyRepository;
  noPadding: boolean;
}

export const SelfFingerprint = ({
  cryptographyRepository,
  noPadding,
  clientState = container.resolve(ClientState),
}: SelfFingerprintProps) => {
  const [localFingerprint, setLocalFingerprint] = useState<string>('');
  useEffect(() => {
    cryptographyRepository.getLocalFingerprint().then(setLocalFingerprint);
  }, [cryptographyRepository]);

  const currentClient = clientState.currentClient;

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      {currentClient && <DeviceCard device={currentClient} />}
      <div className="participant-devices__fingerprint">
        <FormattedId idSlices={splitFingerprint(localFingerprint)} smallPadding />
      </div>

      <div>
        <button
          type="button"
          className="button-reset-default participant-devices__link accent-text"
          onClick={() => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES)}
        >
          {t('participantDevicesSelfAllDevices')}
        </button>
      </div>
    </div>
  );
};
