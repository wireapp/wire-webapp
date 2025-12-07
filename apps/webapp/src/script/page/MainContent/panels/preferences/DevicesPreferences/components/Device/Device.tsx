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

import {MouseEvent, KeyboardEvent} from 'react';

import {DeviceVerificationBadges} from 'Components/Badge';
import * as Icon from 'Components/Icon';
import {ClientEntity} from 'Repositories/client';
import {WireIdentity} from 'src/script/E2EIdentity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FormattedId} from '../FormattedId';

interface DeviceProps {
  device: ClientEntity;
  isSSO: boolean;
  getDeviceIdentity?: (deviceId: string) => WireIdentity | undefined;
  onRemove: (device: ClientEntity) => void;
  onSelect: (device: ClientEntity, currentDeviceIdentity?: WireIdentity) => void;
  deviceNumber: number;
}

export const Device = ({device, isSSO, onSelect, onRemove, getDeviceIdentity, deviceNumber}: DeviceProps) => {
  const {isVerified} = useKoSubscribableChildren(device.meta, ['isVerified']);
  const verifiedLabel = isVerified ? t('preferencesDevicesVerification') : t('preferencesDeviceNotVerified');
  const deviceAriaLabel = `${t('preferencesDevice')} ${deviceNumber}, ${device.getName()}, ${verifiedLabel}`;

  const deviceIdentity = getDeviceIdentity?.(device.id);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove(device);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const onDeviceSelect = () => onSelect(device);

  return (
    <div
      className="preferences-devices-card"
      onClick={onDeviceSelect}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: onDeviceSelect,
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      role="button"
      aria-label={t('accessibility.headings.preferencesDeviceDetails')}
      tabIndex={TabIndex.FOCUSABLE}
    >
      <div className="preferences-devices-card-info">
        <div
          className="preferences-devices-model"
          data-uie-name="preferences-device-active-model"
          aria-label={deviceAriaLabel}
        >
          {device.getName()}
          <DeviceVerificationBadges device={device} getIdentity={getDeviceIdentity} />
        </div>

        {deviceIdentity?.thumbprint && (
          <p className="preferences-devices-id">
            <span>{t('preferencesMLSThumbprint')}</span>

            <span className="preferences-formatted-id" data-uie-name="preferences-device-active-id">
              <FormattedId idSlices={splitFingerprint(deviceIdentity.thumbprint)} smallPadding />
            </span>
          </p>
        )}

        <p className="preferences-devices-id">
          <span>{t('preferencesDevicesId')}</span>

          <span className="preferences-formatted-id" data-uie-name="preferences-device-active-id">
            <FormattedId idSlices={device.formatId()} smallPadding />
          </span>
        </p>
      </div>

      <div className="preferences-devices-card-action">
        {!device.isLegalHold() && (
          <button
            aria-label={t('preferencesDevicesRemove')}
            type="button"
            className={`preferences-devices-card-action__delete ${isSSO && 'svg-red'}`}
            onClick={handleClick}
            onKeyDown={handleKeyPress}
            data-uie-name="do-device-remove"
          >
            <Icon.DeleteIcon />
          </button>
        )}

        <button
          className="icon-forward preferences-devices-card-action__forward"
          data-uie-name="go-device-details"
          aria-label={t('accessibility.headings.preferencesDeviceDetails')}
          aria-hidden
        />
      </div>
    </div>
  );
};
