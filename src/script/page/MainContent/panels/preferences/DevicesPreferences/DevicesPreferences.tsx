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

import React, {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {WireIdentity} from '@wireapp/core-crypto/platforms/web/corecrypto';
import {container} from 'tsyringe';

import {ClientEntity} from 'src/script/client/ClientEntity';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {DetailedDevice} from './components/DetailedDevice';
import {Device} from './components/Device';
import {DeviceDetailsPreferences} from './components/DeviceDetailsPreferences';

import {ClientState} from '../../../../../client/ClientState';
import {isMLSConversation} from '../../../../../conversation/ConversationSelectors';
import {ConversationState} from '../../../../../conversation/ConversationState';
import {E2EIHandler} from '../../../../../E2EIdentity';
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

export const DevicesPreferences: React.FC<DevicesPreferencesProps> = ({
  clientState = container.resolve(ClientState),
  conversationState = container.resolve(ConversationState),
  cryptographyRepository,
  selfUser,
  removeDevice,
  verifyDevice,
  resetSession,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<ClientEntity | undefined>();
  const [selectedDeviceIdentity, setSelectedDeviceIdentity] = useState<WireIdentity>();
  const [localFingerprint, setLocalFingerprint] = useState('');

  const {clients} = useKoSubscribableChildren(clientState, ['clients']);
  const currentClient = clientState.currentClient;
  const isSelfClientVerified = React.useMemo(() => {
    if (!currentClient) {
      return false;
    }
    return !!currentClient?.meta.isMLSVerified?.();
  }, [currentClient]);

  const isSSO = selfUser.isNoPasswordSSO;
  const getFingerprint = (device: ClientEntity) =>
    cryptographyRepository.getRemoteFingerprint(selfUser.qualifiedId, device.id);

  useEffect(() => {
    void cryptographyRepository.getLocalFingerprint().then(setLocalFingerprint);
  }, [cryptographyRepository]);

  if (selectedDevice) {
    return (
      <DeviceDetailsPreferences
        device={selectedDevice}
        deviceIdentity={selectedDeviceIdentity}
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

  const e2eiIdentity = E2EIHandler.getInstance();
  const certificate = e2eiIdentity.getCertificateData();

  const selectDevice = async (device: ClientEntity, deviceIdentity?: WireIdentity) => {
    setSelectedDevice(device);

    if (deviceIdentity) {
      setSelectedDeviceIdentity(deviceIdentity);
    }
  };

  const getDeviceIdentity = async (deviceId: string) => {
    const selfConversation = conversationState?.getSelfMLSConversation();

    if (!isMLSConversation(selfConversation)) {
      return null;
    }

    const groupId = selfConversation.groupId;
    return e2eiIdentity.getUserDeviceEntities(groupId, {[deviceId]: selfUser});
  };

  return (
    <PreferencesPage title={t('preferencesDevices')}>
      <fieldset className="preferences-section" data-uie-name="preferences-device-current">
        <legend className="preferences-header">{t('preferencesDevicesCurrent')}</legend>
        {currentClient && (
          <DetailedDevice
            device={currentClient}
            fingerprint={localFingerprint}
            certificate={certificate}
            isProteusVerified={isSelfClientVerified}
          />
        )}
      </fieldset>

      <hr className="preferences-devices-separator preferences-separator" />

      {clients.length > 0 && (
        <fieldset className="preferences-section">
          <legend className="preferences-header">{t('preferencesDevicesActive')}</legend>
          {clients.map((device, index) => (
            <Device
              device={device}
              key={device.id}
              isSSO={isSSO}
              onSelect={selectDevice}
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
