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

import {useEffect, useMemo, useState} from 'react';

import {ClientClassification} from '@wireapp/api-client/lib/client/';

import {useUserIdentity} from 'Hooks/useDeviceIdentities';
import {ClientRepository, ClientEntity} from 'Repositories/client';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {User} from 'Repositories/entity/User';
import {partition} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {DeviceDetails} from './components/DeviceDetails';
import {DeviceList} from './components/DeviceList';
import {NoDevicesFound} from './components/NoDevicesFound';
import {SelfFingerprint} from './components/SelfFingerprint';
import {FIND_MODE, UserDevicesState} from './UserDevices.types';

export interface UserDevicesHistoryEntry {
  headline: string;
  state: UserDevicesState;
}

const sortUserDevices = (devices: ClientEntity[]): ClientEntity[] => {
  const [legalholdDevices, otherDevices] = partition(
    devices,
    device => device.class === ClientClassification.LEGAL_HOLD,
  );
  return legalholdDevices.concat(otherDevices);
};

interface UserDevicesProps {
  clientRepository: ClientRepository;
  cryptographyRepository: CryptographyRepository;
  current: UserDevicesHistoryEntry;
  goTo: (state: UserDevicesState, headline: string) => void;
  messageRepository: MessageRepository;
  noPadding?: boolean;
  user: User;
  groupId?: string;
}

export const UserDevices = ({
  noPadding = false,
  current,
  user,
  clientRepository,
  goTo,
  messageRepository,
  cryptographyRepository,
  groupId,
}: UserDevicesProps) => {
  const [selectedClient, setSelectedClient] = useState<ClientEntity>();
  const {getDeviceIdentity} = useUserIdentity(user.qualifiedId, groupId);
  const [deviceMode, setDeviceMode] = useState(FIND_MODE.REQUESTING);
  const [clients, setClients] = useState<ClientEntity[]>([]);
  const logger = useMemo(() => getLogger('UserDevicesComponent'), []);

  useEffect(() => {
    (async () => {
      try {
        const qualifiedUsersMap = Object.values(await clientRepository.getClientsByUserIds([user], true));
        for (const qualifiedUsersMaps of qualifiedUsersMap) {
          for (const clientEntities of Object.values(qualifiedUsersMaps)) {
            setClients(sortUserDevices(clientEntities));
            const hasDevices = clientEntities.length > 0;
            const deviceMode = hasDevices ? FIND_MODE.FOUND : FIND_MODE.NOT_FOUND;
            setDeviceMode(deviceMode);
          }
        }
      } catch (error) {
        logger.error(`Unable to retrieve clients for user '${user.id}': ${(error as Error).message || error}`);
      }
    })();
  }, [user]);

  const clickOnDevice = (clientEntity: ClientEntity) => {
    setSelectedClient(clientEntity);
    const headline = user.isMe ? clientEntity.label || clientEntity.model : capitalizeFirstChar(clientEntity.class);
    goTo(UserDevicesState.DEVICE_DETAILS, headline || '');
  };

  const clickToShowSelfFingerprint = () => {
    goTo(UserDevicesState.SELF_FINGERPRINT, t('participantDevicesSelfFingerprint'));
  };

  const showDeviceList = current.state === UserDevicesState.DEVICE_LIST;

  return (
    <div>
      {showDeviceList && deviceMode === FIND_MODE.FOUND && (
        <DeviceList {...{getDeviceIdentity, clickOnDevice, clients, noPadding, user}} />
      )}

      {showDeviceList && deviceMode === FIND_MODE.NOT_FOUND && <NoDevicesFound {...{noPadding, user}} />}

      {current.state === UserDevicesState.DEVICE_DETAILS && selectedClient && (
        <DeviceDetails
          {...{
            getDeviceIdentity,
            clickToShowSelfFingerprint,
            clientRepository,
            cryptographyRepository,
            logger,
            messageRepository,
            noPadding,
            device: selectedClient,
            user,
          }}
        />
      )}

      {current.state === UserDevicesState.SELF_FINGERPRINT && (
        <SelfFingerprint {...{cryptographyRepository, noPadding}} />
      )}
    </div>
  );
};
