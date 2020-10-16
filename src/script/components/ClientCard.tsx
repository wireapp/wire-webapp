/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {registerReactComponent} from 'Util/ComponentUtil';
import {ClientEntity} from '../client/ClientEntity';
import {ClientClassification} from '@wireapp/api-client/dist/client';
import {t} from 'Util/LocalizerUtil';
import SVGProvider from '../auth/util/SVGProvider';
import LegalHoldDot from './LegalHoldDot';

export interface ClientCardProps {
  client: ClientEntity;
  detailed?: boolean;
  isCurrentClient?: boolean;
  onClick?: (client: ClientEntity) => void;
  showIcon?: boolean;
  showVerified?: boolean;
}

const ClientCard: React.FunctionComponent<ClientCardProps> = ({
  client,
  isCurrentClient = false,
  onClick,
  detailed = false,
  showVerified = false,
  showIcon = false,
}) => {
  const {class: deviceClass = '?', id = '', label = '?', meta} = client;
  const formattedId = id ? client.formatId() : [];
  const name = client.getName();

  const isClickable = !detailed && !!onClick;

  const isVerified = meta.isVerified();
  const showLegalHoldIcon = showIcon && deviceClass === ClientClassification.LEGAL_HOLD;
  const showDesktopIcon = showIcon && deviceClass === ClientClassification.DESKTOP;
  const showOtherIcon = showIcon && !showLegalHoldIcon && !showDesktopIcon;

  const DeviceId = ({idArray}: {idArray: string[]}) => {
    return (
      <span data-uie-name="device-id">
        {idArray.map((idItem, index) => (
          <span key={index} className="device-id-part">
            {idItem}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div
      onClick={() => {
        if (typeof onClick === 'function') {
          onClick(client);
        }
      }}
      className={`device-card${!isClickable ? ' device-card__no-hover' : ''}`}
      data-uie-name={`device-card${isCurrentClient ? '-current' : ''}`}
      data-uie-uid={id}
    >
      {showLegalHoldIcon && <LegalHoldDot />}
      {showDesktopIcon && (
        <svg
          width={16}
          height={16}
          dangerouslySetInnerHTML={{__html: SVGProvider['desktop-icon']?.documentElement?.innerHTML}}
          className="device-card__icon"
          data-uie-name="status-desktop-device"
        />
      )}
      {showOtherIcon && (
        <svg
          width={16}
          height={16}
          dangerouslySetInnerHTML={{__html: SVGProvider['devices-icon']?.documentElement?.innerHTML}}
          className="device-card__icon"
          data-uie-name="status-mobile-device"
        />
      )}
      <div className="device-card__info" data-uie-name="device-card-info" data-uie-value={label}>
        {detailed ? (
          <>
            <div className="label-xs device-card__label">{label}</div>
            <div className="label-xs">
              <span>{t('preferencesDevicesId')}</span>
              <DeviceId idArray={formattedId} />
            </div>
          </>
        ) : (
          <>
            <div className="label-xs">
              <span className="device-card__model">{name}</span>
              {isCurrentClient && <span className="text-background">{t('authLimitDevicesCurrent')}</span>}
            </div>
            <div className="text-background label-xs">
              <span>{t('preferencesDevicesId')}</span>
              <DeviceId idArray={formattedId} />
            </div>
          </>
        )}
      </div>
      {showVerified && isVerified ? (
        <svg
          width={14}
          height={16}
          dangerouslySetInnerHTML={{__html: SVGProvider['verified-icon']?.documentElement?.innerHTML}}
          className="verified-icon"
          data-uie-name="user-device-verified"
        />
      ) : (
        <svg
          width={14}
          height={16}
          dangerouslySetInnerHTML={{__html: SVGProvider['not-verified-icon']?.documentElement?.innerHTML}}
          className="not-verified-icon"
          data-uie-name="user-device-not-verified"
        />
      )}
      {isClickable && (
        <svg
          width={5}
          height={8}
          dangerouslySetInnerHTML={{__html: SVGProvider['disclose-icon']?.documentElement?.innerHTML}}
          className="disclose-icon"
        />
      )}
    </div>
  );
};

export default ClientCard;

registerReactComponent('device-card', {
  component: ClientCard,
  optionalParams: ['click', 'detailed', 'current', 'showVerified', 'showIcon'],
  template:
    '<span data-bind="react: {client: ko.unwrap(device), onClick: click, detailed, isCurrentClient: current, showVerified, showIcon}"></span>',
});
