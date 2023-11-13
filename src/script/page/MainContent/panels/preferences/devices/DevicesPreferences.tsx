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

import React, {useEffect, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import {container} from 'tsyringe';

import {Icon} from 'Components/Icon';
import {VerifiedIcon} from 'Components/VerifiedIcon';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {DetailedDevice} from './components/DetailedDevice';
import {FormattedId} from './components/FormattedId';
import {DeviceDetailsPreferences} from './DeviceDetailsPreferences';

import {ClientState} from '../../../../../client/ClientState';
import {ConversationState} from '../../../../../conversation/ConversationState';
import {Conversation} from '../../../../../entity/Conversation';
import {User} from '../../../../../entity/User';
import {PreferencesPage} from '../components/PreferencesPage';

interface DeviceProps {
  device: ClientEntity;
  isSSO: boolean;
  onRemove: (device: ClientEntity) => void;
  onSelect: (device: ClientEntity) => void;
  deviceNumber: number;
}

const Device = ({device, isSSO, onSelect, onRemove, deviceNumber}: DeviceProps) => {
  const {isVerified} = useKoSubscribableChildren(device.meta, ['isVerified']);
  const verifiedLabel = isVerified ? t('preferencesDevicesVerification') : t('preferencesDeviceNotVerified');
  const deviceAriaLabel = `${t('preferencesDevice')} ${deviceNumber}, ${device.getName()}, ${verifiedLabel}`;
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove(device);
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const onDeviceSelect = () => onSelect(device);

  return (
    <div
      className="preferences-devices-card"
      onClick={onDeviceSelect}
      onKeyDown={event => handleKeyDown(event, onDeviceSelect)}
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
    >
      <div className="preferences-devices-card-data">
        <div className="preferences-devices-card-icon" data-uie-value={device.id} data-uie-name="device-id">
          <VerifiedIcon data-uie-name={`user-device-${isVerified ? '' : 'not-'}verified`} isVerified={!!isVerified} />
        </div>

        <div className="preferences-devices-card-info">
          <div
            className="preferences-devices-model"
            data-uie-name="preferences-device-active-model"
            aria-label={deviceAriaLabel}
          >
            {device.getName()}
          </div>

          <p className="preferences-devices-id">
            <strong>{t('preferencesDevicesId')}</strong>

            <span data-uie-name="preferences-device-active-id">
              <FormattedId idSlices={device.formatId()} />
            </span>
          </p>
        </div>
      </div>

      <div className="preferences-devices-card-action">
        {!device.isLegalHold() && (
          <button
            aria-label={t('preferencesDevicesRemove')}
            type="button"
            className={`preferences-devices-card-action__delete ${isSSO && 'svg-red'}`}
            onClick={handleClick}
            onKeyDown={handleKeyPress}
            data-uie-name="do-device-remove"
          >
            <Icon.Delete />
          </button>
        )}

        <button
          className="icon-forward preferences-devices-card-action__forward"
          data-uie-name="go-device-details"
          aria-label={t('accessibility.headings.preferencesDeviceDetails')}
          aria-hidden
        />
      </div>
    </div>
  );
};

interface DevicesPreferencesProps {
  clientState: ClientState;
  conversationState: ConversationState;
  cryptographyRepository: CryptographyRepository;
  removeDevice: (device: ClientEntity) => Promise<unknown>;
  resetSession: (userId: QualifiedId, device: ClientEntity, conversation: Conversation) => Promise<void>;
  selfUser: User;
  verifyDevice: (userId: QualifiedId, device: ClientEntity, isVerified: boolean) => void;
}

const DevicesPreferences = ({
  clientState = container.resolve(ClientState),
  conversationState = container.resolve(ConversationState),
  cryptographyRepository,
  removeDevice,
  verifyDevice,
  resetSession,
  selfUser,
}: DevicesPreferencesProps) => {
  const [selectedDevice, setSelectedDevice] = useState<ClientEntity | undefined>();

  const {devices} = useKoSubscribableChildren(selfUser, ['devices']);
  const currentClient = clientState.currentClient;
  const isSSO = selfUser.isNoPasswordSSO;
  const getFingerprint = (device: ClientEntity) =>
    cryptographyRepository.getRemoteFingerprint(selfUser.qualifiedId, device.id);

  const [localFingerprint, setLocalFingerprint] = useState('');
  useEffect(() => {
    cryptographyRepository.getLocalFingerprint().then(setLocalFingerprint);
  }, [cryptographyRepository]);

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
        {currentClient && <DetailedDevice device={currentClient} fingerprint={localFingerprint} />}
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
            />
          ))}
          <p className="preferences-detail">{t('preferencesDevicesActiveDetail')}</p>
        </fieldset>
      )}
    </PreferencesPage>
  );
};

export {DevicesPreferences};
