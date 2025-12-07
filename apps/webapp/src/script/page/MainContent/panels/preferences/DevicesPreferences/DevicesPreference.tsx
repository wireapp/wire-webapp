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

import {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientState} from 'Repositories/client/ClientState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {useUserIdentity} from 'src/script/hooks/useDeviceIdentities';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {DetailedDevice} from './components/DetailedDevice';
import {Device} from './components/Device';
import {DeviceDetailsPreferences} from './components/DeviceDetailsPreferences';

import {PreferencesPage} from '../components/PreferencesPage';

interface DevicesPreferencesProps {
  clientState: ClientState;
  conversationState: ConversationState;
  cryptographyRepository: CryptographyRepository;
  selfUser: User;
  removeDevice: (device: ClientEntity) => Promise<unknown>;
  resetSession: (userId: QualifiedId, device: ClientEntity, conversation: Conversation) => Promise<void>;
  verifyDevice: (userId: QualifiedId, device: ClientEntity, isVerified: boolean) => void;
}

export const DevicesPreferences = ({
  clientState = container.resolve(ClientState),
  conversationState = container.resolve(ConversationState),
  cryptographyRepository,
  selfUser,
  removeDevice,
  verifyDevice,
  resetSession,
}: DevicesPreferencesProps) => {
  const [selectedDevice, setSelectedDevice] = useState<ClientEntity | undefined>();
  const [localFingerprint, setLocalFingerprint] = useState('');

  const {devices} = useKoSubscribableChildren(selfUser, ['devices']);
  const {getDeviceIdentity} = useUserIdentity(
    selfUser.qualifiedId,
    conversationState.selfMLSConversation()?.groupId,
    true,
  );
  const currentClient = clientState.currentClient;

  const isSSO = selfUser.isNoPasswordSSO;
  const getFingerprint = (device: ClientEntity) =>
    cryptographyRepository.getRemoteFingerprint(selfUser.qualifiedId, device.id);

  useEffect(() => {
    void cryptographyRepository.getLocalFingerprint().then(setLocalFingerprint);
  }, [cryptographyRepository]);

  if (selectedDevice) {
    return (
      <DeviceDetailsPreferences
        getDeviceIdentity={getDeviceIdentity}
        device={selectedDevice}
        getFingerprint={getFingerprint}
        onRemove={async device => {
          await removeDevice(device);
          setSelectedDevice(undefined);
        }}
        onClose={() => setSelectedDevice(undefined)}
        onVerify={(device, verified) => verifyDevice(selfUser.qualifiedId, device, verified)}
        onResetSession={device =>
          resetSession(selfUser.qualifiedId, device, conversationState.getSelfProteusConversation())
        }
      />
    );
  }

  return (
    <PreferencesPage title={t('preferencesDevices')}>
      <fieldset className="preferences-section" data-uie-name="preferences-device-current">
        <legend className="preferences-header">{t('preferencesDevicesCurrent')}</legend>
        {currentClient && (
          <DetailedDevice
            isCurrentDevice
            device={currentClient}
            fingerprint={localFingerprint}
            getDeviceIdentity={getDeviceIdentity}
          />
        )}
      </fieldset>

      <hr className="preferences-devices-separator preferences-separator" />

      {devices.length > 0 && (
        <fieldset className="preferences-section">
          <legend className="preferences-header">{t('preferencesDevicesActive')}</legend>
          {devices.map((device, index) => (
            <Device
              device={device}
              key={device.id}
              isSSO={isSSO}
              onSelect={setSelectedDevice}
              onRemove={removeDevice}
              deviceNumber={++index}
              getDeviceIdentity={getDeviceIdentity}
            />
          ))}
          <p className="preferences-detail">{t('preferencesDevicesActiveDetail')}</p>
        </fieldset>
      )}
    </PreferencesPage>
  );
};
