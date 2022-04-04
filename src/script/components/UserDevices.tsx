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

import ko from 'knockout';

import React, {useEffect, useMemo, useState} from 'react';
import {ClientClassification} from '@wireapp/api-client/src/client/';

import {partition} from 'Util/ArrayUtil';
import {registerReactComponent} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {t} from 'Util/LocalizerUtil';

import {ClientRepository} from '../client/ClientRepository';
import {ConversationState} from '../conversation/ConversationState';
import {MessageRepository} from '../conversation/MessageRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {User} from '../entity/User';
import {ClientEntity} from '../client/ClientEntity';
import SelfFingerprint from './userDevices/SelfFingerprint';
import DeviceDetails from './userDevices/DeviceDetails';
import NoDevicesFound from './userDevices/NoDevicesFound';
import DeviceList from './userDevices/DeviceList';

enum FIND_MODE {
  FOUND = 'UserDevices.MODE.FOUND',
  NOT_FOUND = 'UserDevices.MODE.NOT_FOUND',
  REQUESTING = 'UserDevices.MODE.REQUESTING',
}

export enum UserDevicesState {
  DEVICE_DETAILS = 'UserDevices.DEVICE_DETAILS',
  DEVICE_LIST = 'UserDevices.DEVICE_LIST',
  SELF_FINGERPRINT = 'UserDevices.SELF_FINGERPRINT',
}

export interface UserDevicesHistoryEntry {
  headline: string;
  state: UserDevicesState;
}

export const useUserDevicesHistory = () => {
  const [history, setHistory] = useState<UserDevicesHistoryEntry[]>([
    {headline: '', state: UserDevicesState.DEVICE_LIST},
  ]);
  const current = useMemo<UserDevicesHistoryEntry>(() => history[history.length - 1], [history]);
  return {
    current,
    goBack: () => {
      setHistory(history.slice(0, -1));
    },
    goTo: (state: UserDevicesState, headline: string) => {
      setHistory([...history, {headline, state}]);
    },
  };
};

export const sortUserDevices = (devices: ClientEntity[]): ClientEntity[] => {
  const [legalholdDevices, otherDevices] = partition(
    devices,
    device => device.class === ClientClassification.LEGAL_HOLD,
  );
  return legalholdDevices.concat(otherDevices);
};

interface UserDevicesProps {
  clientRepository: ClientRepository;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  current: UserDevicesHistoryEntry;
  goTo: (state: UserDevicesState, headline: string) => void;
  messageRepository: MessageRepository;
  noPadding?: boolean;
  user: User;
}

const UserDevices: React.FC<UserDevicesProps> = ({
  noPadding = false,
  current,
  user,
  clientRepository,
  goTo,
  messageRepository,
  cryptographyRepository,
}) => {
  const [selectedClient, setSelectedClient] = useState<ClientEntity>();
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
        logger.error(`Unable to retrieve clients for user '${user.id}': ${error.message || error}`);
      }
    })();
  }, [user]);

  const clickOnDevice = (clientEntity: ClientEntity) => {
    setSelectedClient(clientEntity);
    const headline = user.isMe ? clientEntity.label || clientEntity.model : capitalizeFirstChar(clientEntity.class);
    goTo(UserDevicesState.DEVICE_DETAILS, headline);
  };

  const clickToShowSelfFingerprint = () => {
    goTo(UserDevicesState.SELF_FINGERPRINT, t('participantDevicesSelfFingerprint'));
  };

  const showDeviceList = current.state === UserDevicesState.DEVICE_LIST;

  return (
    <div>
      {showDeviceList && deviceMode === FIND_MODE.FOUND && (
        <DeviceList {...{clickOnDevice, clients, noPadding, user}} />
      )}
      {showDeviceList && deviceMode === FIND_MODE.NOT_FOUND && <NoDevicesFound {...{noPadding, user}} />}
      {current.state === UserDevicesState.DEVICE_DETAILS && (
        <DeviceDetails
          {...{
            clickToShowSelfFingerprint,
            clientRepository,
            cryptographyRepository,
            logger,
            messageRepository,
            noPadding,
            selectedClient,
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

export default UserDevices;

registerReactComponent('user-devices', {
  bindings: `
    clientRepository,
    cryptographyRepository,
    current: ko.unwrap(current),
    goTo,
    messageRepository,
    noPadding,
    user: ko.unwrap(userEntity)
  `,
  component: UserDevices,
});

export const makeUserDevicesHistory = () => {
  const history = ko.observableArray<UserDevicesHistoryEntry>();
  const current = ko.pureComputed(() => history()[history().length - 1]);
  const reset = () => {
    history.removeAll();
    history.push({headline: '', state: UserDevicesState.DEVICE_LIST});
  };
  reset();
  return {
    current,
    goBack: () => {
      history.pop();
    },
    goTo: (state: UserDevicesState, headline: string) => {
      history.push({headline, state});
    },
    reset,
  };
};
