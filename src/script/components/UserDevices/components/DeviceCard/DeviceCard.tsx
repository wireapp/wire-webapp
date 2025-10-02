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

import {ClientClassification} from '@wireapp/api-client/lib/client';
import cx from 'classnames';

import {DeviceVerificationBadges} from 'Components/Badge';
import {LegalHoldDot} from 'Components/LegalHoldDot';
import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {type ClientEntity} from 'Repositories/client/ClientEntity';
import {WireIdentity} from 'src/script/E2EIdentity';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import {FormattedId} from '../../../../page/MainContent/panels/preferences/DevicesPreferences/components/FormattedId';
import * as Icon from '../../../Icon';

interface DeviceCardProps {
  click?: (device: ClientEntity) => void;
  getDeviceIdentity?: (deviceId: string) => WireIdentity | undefined;
  device: ClientEntity;
  showIcon?: boolean;
  showVerified?: boolean;
}

const DeviceCard = ({click, getDeviceIdentity, device: clientEntity, showIcon = false}: DeviceCardProps) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(!!click);
  const {class: deviceClass = '?', id = '', label = '?'} = clientEntity;
  const name = clientEntity.getName();
  const clickable = !!click;

  const deviceIdentity = getDeviceIdentity?.(clientEntity.id);

  const showLegalHoldIcon = showIcon && deviceClass === ClientClassification.LEGAL_HOLD;

  const clickOnDevice = () => {
    if (clickable) {
      click(clientEntity);
    }
  };

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={messageFocusedTabIndex}
      className={cx('device-card', {'device-card__no-hover': !clickable})}
      onClick={clickOnDevice}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: clickOnDevice,
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      data-uie-uid={id}
      data-uie-name="device-card"
    >
      {showLegalHoldIcon && (
        <LegalHoldDot
          className="device-card__icon device-card__legal_hold_icon"
          dataUieName="status-legal-hold-device"
        />
      )}

      <div className="device-card__info" data-uie-name="device-card-info" data-uie-value={label}>
        <div className="device-card__name">
          <span className="device-card__model">{name}</span>
          <DeviceVerificationBadges device={clientEntity} getIdentity={getDeviceIdentity} />
        </div>

        {deviceIdentity?.thumbprint && (
          <p className="text-background device-card__id">
            <span>{t('preferencesMLSThumbprint')}</span>

            <span data-uie-name="device-id" className="formatted-id">
              <FormattedId idSlices={splitFingerprint(deviceIdentity.thumbprint)} smallPadding />
            </span>
          </p>
        )}

        <p className="text-background device-card__id">
          <span>{t('preferencesDevicesId')}</span>

          <span data-uie-name="device-id" className="formatted-id">
            <FormattedId idSlices={splitFingerprint(id)} smallPadding />
          </span>
        </p>
      </div>

      {clickable && <Icon.ChevronRight className="disclose-icon" data-uie-name="disclose-icon" />}
    </div>
  );
};

export {DeviceCard};
