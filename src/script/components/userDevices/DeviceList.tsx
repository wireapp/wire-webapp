/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {DeviceCard} from './DeviceCard';

import type {ClientEntity} from '../../client/ClientEntity';
import {Config} from '../../Config';
import type {User} from '../../entity/User';
import {getPrivacyWhyUrl} from '../../externalRoute';

interface DeviceListProps {
  clickOnDevice: (client: ClientEntity) => void;
  renderDeviceBadges: (device: ClientEntity) => React.ReactNode;
  clients: ClientEntity[];
  noPadding: boolean;
  user: User;
}

const DeviceList: React.FC<DeviceListProps> = ({user, renderDeviceBadges, noPadding, clients, clickOnDevice}) => {
  const {name: userName} = useKoSubscribableChildren(user, ['name']);

  return (
    <>
      <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
        <p className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
          {user ? t('participantDevicesHeadline', {brandName: Config.getConfig().BRAND_NAME, user: userName}) : ''}
        </p>

        <a
          className="participant-devices__link accent-text"
          href={getPrivacyWhyUrl()}
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          {t('participantDevicesWhyVerify')}
        </a>
      </div>

      <ul className="participant-devices__device-list">
        {clients.map(client => (
          <li
            key={client.id}
            className={cx('participant-devices__device-item', {
              'participant-devices__device-item--padding': !noPadding,
            })}
            data-uie-name="item-device"
          >
            <DeviceCard
              renderDeviceBadges={renderDeviceBadges}
              device={client}
              click={() => clickOnDevice(client)}
              showIcon
            />
          </li>
        ))}
      </ul>
    </>
  );
};

export {DeviceList};
