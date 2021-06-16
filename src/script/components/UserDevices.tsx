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

import React, {useEffect, useMemo, useRef, useState} from 'react';
import cx from 'classnames';
import {ClientClassification} from '@wireapp/api-client/src/client/';
import {DexieError} from 'dexie';
import {WebAppEvents} from '@wireapp/webapp-events';
import {container} from 'tsyringe';
import {amplify} from 'amplify';

import {partition} from 'Util/ArrayUtil';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getLogger} from 'Util/Logger';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {t} from 'Util/LocalizerUtil';

import {ClientRepository} from '../client/ClientRepository';
import {ClientState} from '../client/ClientState';
import {ConversationState} from '../conversation/ConversationState';
import {MessageRepository} from '../conversation/MessageRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {User} from '../entity/User';
import DeviceCard from './userDevices/DeviceCard';
import {ClientEntity} from '../client/ClientEntity';
import Icon from './Icon';
import {getPrivacyHowUrl, getPrivacyWhyUrl, getPrivacyPolicyUrl} from '../externalRoute';
import {Config} from '../Config';
import {MotionDuration} from '../motion/MotionDuration';

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
  clientState?: ClientState;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  current: UserDevicesHistoryEntry;
  goTo: (state: UserDevicesState, headline: string) => void;
  messageRepository: MessageRepository;
  noPadding?: boolean;
  userEntity: User;
}

const UserDevices: React.FC<UserDevicesProps> = ({
  noPadding = false,
  current,
  userEntity,
  clientRepository,
  goTo,
  messageRepository,
  clientState = container.resolve(ClientState),
  conversationState = container.resolve(ConversationState),
  cryptographyRepository,
}) => {
  const [deviceMode, setDeviceMode] = useState(FIND_MODE.REQUESTING);
  const [clientEntities, setClientEntities] = useState<ClientEntity[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientEntity>();
  const [fingerprintRemote, setFingerprintRemote] = useState<string[]>([]);
  const [fingerprintLocal, setFingerprintLocal] = useState<string[]>([]);
  const [isResettingSession, setIsResettingSession] = useState(false);

  const clientMeta = useMemo(() => selectedClient?.meta, [selectedClient]);

  const {isVerified} = useKoSubscribableChildren(clientMeta, ['isVerified']);
  const {name: userName} = useKoSubscribableChildren(userEntity, ['name']);
  const {currentClient: selfClient} = useKoSubscribableChildren(clientState, ['currentClient']);

  const logger = useRef(getLogger('UserDevicesComponent'));

  useEffect(() => {
    clientRepository
      .getClientsByUserIds([userEntity.id], true)
      .then(qualifiedUsersMap => {
        for (const userClientMaps of Object.values(qualifiedUsersMap)) {
          for (const clientEntities of Object.values(userClientMaps)) {
            setClientEntities(sortUserDevices(clientEntities));
            const hasDevices = clientEntities.length > 0;
            const deviceMode = hasDevices ? FIND_MODE.FOUND : FIND_MODE.NOT_FOUND;
            setDeviceMode(deviceMode);
          }
        }
      })
      .catch(error => {
        logger.current.error(`Unable to retrieve clients for user '${userEntity.id}': ${error.message || error}`);
      });
  }, [userEntity]);

  useEffect(() => {
    setFingerprintRemote([]);
    if (selectedClient) {
      cryptographyRepository
        .getRemoteFingerprint(userEntity.id, selectedClient.id)
        .then(remoteFingerprint => setFingerprintRemote(remoteFingerprint));
    }
  }, [selectedClient]);

  const clickOnDevice = (clientEntity: ClientEntity) => {
    setSelectedClient(clientEntity);
    const headline = userEntity.isMe
      ? clientEntity.label || clientEntity.model
      : capitalizeFirstChar(clientEntity.class);
    goTo(UserDevicesState.DEVICE_DETAILS, headline);
  };

  const clickToShowSelfFingerprint = () => {
    if (!fingerprintLocal.length) {
      setFingerprintLocal(cryptographyRepository.getLocalFingerprint());
    }
    goTo(UserDevicesState.SELF_FINGERPRINT, t('participantDevicesSelfFingerprint'));
  };

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !isVerified;
    clientRepository
      .verifyClient(userEntity.id, selectedClient, toggleVerified)
      .catch((error: DexieError) => logger.current.warn(`Failed to toggle client verification: ${error.message}`));
  };

  const clickToResetSession = () => {
    const _resetProgress = () => window.setTimeout(() => setIsResettingSession(false), MotionDuration.LONG);
    const conversationId = userEntity.isMe
      ? conversationState.self_conversation().id
      : conversationState.activeConversation().id;
    setIsResettingSession(true);
    messageRepository
      .resetSession(userEntity.id, selectedClient.id, conversationId)
      .then(_resetProgress)
      .catch(_resetProgress);
  };

  const clickOnShowSelfDevices = () => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);

  const showDeviceList = current.state === UserDevicesState.DEVICE_LIST;

  return (
    <div>
      {showDeviceList && deviceMode === FIND_MODE.FOUND && (
        <>
          <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
            <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
              {userEntity
                ? t('participantDevicesHeadline', {brandName: Config.getConfig().BRAND_NAME, user: userName})
                : ''}
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
            {clientEntities.map(client => (
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
      )}

      {showDeviceList && deviceMode === FIND_MODE.NOT_FOUND && (
        <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
          <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
            {userEntity
              ? t('participantDevicesOutdatedClientMessage', {
                  brandName: Config.getConfig().BRAND_NAME,
                  user: userName,
                })
              : ''}
          </div>
          <a
            className="participant-devices__link accent-text"
            href={getPrivacyPolicyUrl()}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {t('participantDevicesLearnMore')}
          </a>
        </div>
      )}

      {current.state === UserDevicesState.DEVICE_DETAILS && (
        <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
          <div
            className="participant-devices__link participant-devices__show-self-fingerprint accent-text"
            onClick={clickToShowSelfFingerprint}
          >
            {t('participantDevicesDetailShowMyDevice')}
          </div>
          <div
            className="panel__info-text"
            dangerouslySetInnerHTML={{
              __html: userEntity ? t('participantDevicesDetailHeadline', {user: userName}) : '',
            }}
          ></div>
          <a
            className="participant-devices__link accent-text"
            href={getPrivacyHowUrl()}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {t('participantDevicesDetailHowTo')}
          </a>
          <div className="participant-devices__single-client">
            <DeviceCard device={selectedClient} />
          </div>
          <div className="participant-devices__fingerprint" data-uie-name="status-fingerprint">
            {fingerprintRemote.map((part, index) => (
              <React.Fragment key={`${index}-${part}`}>
                <span className="participant-devices__fingerprint__part">{part}</span>{' '}
              </React.Fragment>
            ))}
          </div>

          <div className="participant-devices__verify">
            <div className="slider" data-uie-name="do-toggle-verified">
              <input className="slider-input" type="checkbox" name="toggle" id="toggle" defaultChecked={isVerified} />
              <label className="button-label" htmlFor="toggle" onClick={clickToToggleDeviceVerification}>
                {t('participantDevicesDetailVerify')}
              </label>
            </div>
            <div className="participant-devices__actions">
              <Icon.Loading
                className="accent-fill"
                style={{display: isResettingSession ? 'initial' : 'none'}}
                data-uie-name="status-loading"
              />
              <span
                className="button-label accent-text ellipsis"
                onClick={clickToResetSession}
                style={{display: isResettingSession ? 'none' : 'initial'}}
                data-uie-name="do-reset-session"
              >
                {t('participantDevicesDetailResetSession')}
              </span>
            </div>
          </div>
        </div>
      )}

      {current.state === UserDevicesState.SELF_FINGERPRINT && (
        <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
          <DeviceCard device={selfClient} />
          <div className="participant-devices__fingerprint">
            {fingerprintLocal.map((part, index) => (
              <React.Fragment key={`${index}-${part}`}>
                <span className="participant-devices__fingerprint__part">{part}</span>{' '}
              </React.Fragment>
            ))}
          </div>
          <div>
            <span className="participant-devices__link accent-text" onClick={clickOnShowSelfDevices}>
              {t('participantDevicesSelfAllDevices')}
            </span>
          </div>
        </div>
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
    userEntity: ko.unwrap(userEntity)
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
