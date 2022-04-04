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

import React, {useState} from 'react';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {ClientState} from '../../../client/ClientState';
import {UserState} from '../../../user/UserState';
import {ConversationState} from '../../../conversation/ConversationState';
import {container} from 'tsyringe';
import {registerStaticReactComponent, useKoSubscribableChildren} from '../../../util/ComponentUtil';
import {QualifiedId} from '@wireapp/api-client/src/user';
import {t} from 'Util/LocalizerUtil';
import VerifiedIcon from 'Components/VerifiedIcon';
import Icon from 'Components/Icon';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {useFadingScrollbar} from '../../../ui/fadingScrollbar';
import useEffectRef from 'Util/useEffectRef';
import DetailedDevice from './components/DetailedDevice';
import DeviceDetailsPreferences from './DeviceDetailsPreferences';
import {Conversation} from '../../../entity/Conversation';
import {FormattedId} from './components/FormattedId';

interface DevicesPreferencesProps {
  clientState: ClientState;
  conversationState: ConversationState;
  cryptographyRepository: CryptographyRepository;
  removeDevice: (device: ClientEntity) => Promise<void>;
  resetSession: (userId: QualifiedId, device: ClientEntity, conversation: Conversation) => Promise<void>;
  userState: UserState;
  verifyDevice: (userId: QualifiedId, device: ClientEntity, isVerified: boolean) => void;
}

const Device: React.FC<{
  device: ClientEntity;
  isSSO: boolean;
  onRemove: (device: ClientEntity) => void;
  onSelect: (device: ClientEntity) => void;
}> = ({device, isSSO, onSelect, onRemove}) => {
  const {isVerified} = useKoSubscribableChildren(device.meta, ['isVerified']);

  return (
    <div className="preferences-devices-card" onClick={() => onSelect(device)}>
      <div className="preferences-devices-card-data">
        <div className="preferences-devices-card-icon" data-uie-value={device.id} data-uie-name="device-id">
          <VerifiedIcon data-uie-name={`user-device-${isVerified ? '' : 'not-'}verified`} isVerified={isVerified} />
        </div>
        <div className="preferences-devices-card-info">
          <div className="preferences-devices-model" data-uie-name="preferences-device-active-model">
            {device.getName()}
          </div>
          <div className="preferences-devices-id">
            <span>{t('preferencesDevicesId')}</span>
            <span data-uie-name="preferences-device-active-id">
              <FormattedId idSlices={device.formatId()} />
            </span>
          </div>
        </div>
      </div>
      <div className="preferences-devices-card-action">
        {!device.isLegalHold() && (
          <button
            type="button"
            className={`preferences-devices-card-action__delete ${isSSO && 'svg-red'}`}
            onClick={event => {
              event.stopPropagation();
              onRemove(device);
            }}
            data-uie-name="do-device-remove"
          >
            <Icon.Delete />
          </button>
        )}
        <div className="icon-forward preferences-devices-card-action__forward" data-uie-name="go-device-details"></div>
      </div>
    </div>
  );
};

const DevicesPreferences: React.FC<DevicesPreferencesProps> = ({
  clientState = container.resolve(ClientState),
  userState = container.resolve(UserState),
  conversationState = container.resolve(ConversationState),
  cryptographyRepository,
  removeDevice,
  verifyDevice,
  resetSession,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<ClientEntity | undefined>();
  const {clients, currentClient} = useKoSubscribableChildren(clientState, ['clients', 'currentClient']);
  const {self} = useKoSubscribableChildren(userState, ['self']);
  const isSSO = self?.isSingleSignOn;
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  const getFingerprint = (device: ClientEntity) =>
    cryptographyRepository.getRemoteFingerprint(self.qualifiedId, device.id);
  useFadingScrollbar(scrollbarRef);

  if (selectedDevice) {
    return (
      <DeviceDetailsPreferences
        device={selectedDevice}
        getFingerprint={getFingerprint}
        onRemove={async device => {
          await removeDevice(device);
          setSelectedDevice(undefined);
        }}
        onClose={() => setSelectedDevice(undefined)}
        onVerify={(device, verified) => verifyDevice(self.qualifiedId, device, verified)}
        onResetSession={device => resetSession(self.qualifiedId, device, conversationState.self_conversation())}
      />
    );
  }

  return (
    <div id="preferences-devices" className="preferences-page preferences-devices">
      <h2 className="preferences-titlebar">{t('preferencesDevices')}</h2>
      <div className="preferences-content" ref={setScrollbarRef}>
        <fieldset className="preferences-section" data-uie-name="preferences-device-current">
          <legend className="preferences-header">{t('preferencesDevicesCurrent')}</legend>
          <DetailedDevice device={currentClient} fingerprint={cryptographyRepository.getLocalFingerprint()} />
        </fieldset>

        <hr className="preferences-devices-separator preferences-separator" />

        {clients.length > 0 && (
          <fieldset className="preferences-section">
            <legend className="preferences-header">{t('preferencesDevicesActive')}</legend>
            {clients.map(device => (
              <Device
                device={device}
                key={device.id}
                isSSO={isSSO}
                onSelect={setSelectedDevice}
                onRemove={removeDevice}
              />
            ))}
            <div className="preferences-detail">{t('preferencesDevicesActiveDetail')}</div>
          </fieldset>
        )}
      </div>
    </div>
  );
};

export default DevicesPreferences;

registerStaticReactComponent('devices-preferences', DevicesPreferences);
