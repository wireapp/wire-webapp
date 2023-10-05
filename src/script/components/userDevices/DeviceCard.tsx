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

import React from 'react';

import {ClientClassification} from '@wireapp/api-client/lib/client';
import cx from 'classnames';

import {useMessageFocusedTabIndex} from 'Components/MessagesList/Message/util';
import {VerificationBadges} from 'src/script/components/VerificationBadges';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {splitFingerprint} from 'Util/StringUtil';

import type {ClientEntity} from '../../client/ClientEntity';
import {MLSPublicKeys} from '../../client/ClientEntity';
import {FormattedId} from '../../page/MainContent/panels/preferences/DevicesPreferences/components/FormattedId';
import {Icon} from '../Icon';
import {LegalHoldDot} from '../LegalHoldDot';

export interface DeviceCardProps {
  click?: (device: ClientEntity) => void;
  device: ClientEntity;
  showIcon?: boolean;
  showVerified?: boolean;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  click,
  device: clientEntity,
  showVerified = false,
  showIcon = false,
}) => {
  const messageFocusedTabIndex = useMessageFocusedTabIndex(!!click);
  const {class: deviceClass = '?', id = '', label = '?', meta} = clientEntity;
  const name = clientEntity.getName();
  const clickable = !!click;
  const isVerified = meta.isVerified;
  const mlsFingerprint = clientEntity.mlsPublicKeys?.[MLSPublicKeys.ED25519];

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
      onKeyDown={e => handleKeyDown(e, clickOnDevice)}
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

          {showVerified && <VerificationBadges isMLSVerified isProteusVerified={!!isVerified && isVerified()} />}
        </div>

        {mlsFingerprint && (
          <p className="text-background device-card__id">
            <span>{t('preferencesMLSThumbprint')}</span>

            <span data-uie-name="device-id" className="formatted-id">
              <FormattedId idSlices={splitFingerprint(mlsFingerprint)} smallPadding />
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
