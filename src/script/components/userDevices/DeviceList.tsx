import React from 'react';
import cx from 'classnames';

import {t} from 'Util/LocalizerUtil';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {Config} from '../../Config';
import {getPrivacyWhyUrl} from '../../externalRoute';
import DeviceCard from './DeviceCard';
import type {User} from '../../entity/User';
import type {ClientEntity} from '../../client/ClientEntity';

interface DeviceListProps {
  clickOnDevice: (client: ClientEntity) => void;
  clients: ClientEntity[];
  noPadding: boolean;
  user: User;
}

const DeviceList: React.FC<DeviceListProps> = ({user, noPadding, clients, clickOnDevice}) => {
  const {name: userName} = useKoSubscribableChildren(user, ['name']);

  return (
    <>
      <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
        <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
          {user ? t('participantDevicesHeadline', {brandName: Config.getConfig().BRAND_NAME, user: userName}) : ''}
        </div>
        <a
          className="participant-devices__link accent-text"
          href={getPrivacyWhyUrl()}
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          {t('participantDevicesWhyVerify')}
        </a>
      </div>

      <div className="participant-devices__device-list">
        {clients.map(client => (
          <div
            key={client.id}
            className={cx('participant-devices__device-item', {
              'participant-devices__device-item--padding': !noPadding,
            })}
            data-uie-name="item-device"
          >
            <DeviceCard device={client} click={() => clickOnDevice(client)} showVerified showIcon />
          </div>
        ))}
      </div>
    </>
  );
};

export default DeviceList;
