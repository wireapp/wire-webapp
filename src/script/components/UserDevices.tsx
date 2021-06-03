/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import React, {useEffect} from 'react';
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {DexieError} from 'dexie';
import {ClientClassification} from '@wireapp/api-client/src/client/';
import {container} from 'tsyringe';
import cx from 'classnames';

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {capitalizeFirstChar} from 'Util/StringUtil';
import {registerReactComponent, useKoSubscribable} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import DeviceCard from 'Components/userDevices/DeviceCard';

import type {ClientEntity} from '../client/ClientEntity';
import type {ClientRepository} from '../client/ClientRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {User} from '../entity/User';
import type {MessageRepository} from '../conversation/MessageRepository';
import {Config} from '../Config';
import {getPrivacyHowUrl, getPrivacyWhyUrl, getPrivacyPolicyUrl} from '../externalRoute';
import {MotionDuration} from '../motion/MotionDuration';
import {ClientState} from '../client/ClientState';
import {ConversationState} from '../conversation/ConversationState';

export interface UserDevicesHistory {
  current: ko.PureComputed<UserDevicesState>;
  goBack: () => void;
  goTo: (to: UserDevicesState, head: string) => void;
  headline: ko.PureComputed<string>;
  reset: () => void;
}

export interface UserDevicesProps {
  clientRepository: ClientRepository;
  clientState?: ClientState;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  history: UserDevicesHistory;
  messageRepository: MessageRepository;
  noPadding?: boolean;
  userEntity: User;
}

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

export const sortUserDevices = (devices: ClientEntity[]): ClientEntity[] => {
  const legalholdDevices = devices.filter(device => device.class === ClientClassification.LEGAL_HOLD);
  const otherDevices = devices.filter(device => device.class !== ClientClassification.LEGAL_HOLD);
  return legalholdDevices.concat(otherDevices);
};

const UserDevices: React.FC<UserDevicesProps> = ({
  clientRepository,
  cryptographyRepository,
  messageRepository,
  userEntity,
  history,
  noPadding = false,
  clientState = container.resolve(ClientState),
  conversationState = container.resolve(ConversationState),
}) => {
  const selfClient = useKoSubscribable(clientState.currentClient);
  const brandName = Config.getConfig().BRAND_NAME;
  const logger = getLogger('UserDevicesComponent');

  let isResettingSession = false;
  let clientEntities: ClientEntity[] = [];
  let fingerprintLocal: RegExpMatchArray = [];
  let fingerprintRemote: RegExpMatchArray = [];
  let deviceMode = FIND_MODE.REQUESTING;
  let selectedClient: ClientEntity;
  const privacyPolicyUrl = getPrivacyPolicyUrl();
  const privacyHowUrl = getPrivacyHowUrl();
  const privacyWhyUrl = getPrivacyWhyUrl();

  const detailMessage = userEntity ? t('participantDevicesDetailHeadline', {user: userEntity.name()}) : '';
  const devicesHeadlineText = userEntity ? t('participantDevicesHeadline', {brandName, user: userEntity.name()}) : '';
  const noDevicesHeadlineText = userEntity
    ? t('participantDevicesOutdatedClientMessage', {
        brandName,
        user: userEntity.name(),
      })
    : '';

  const showDeviceList = () => history.current() === UserDevicesState.DEVICE_LIST;
  const showDeviceDetails = () => history.current() === UserDevicesState.DEVICE_DETAILS;
  const showSelfFingerprint = () => history.current() === UserDevicesState.SELF_FINGERPRINT;
  const showDevicesFound = () => showDeviceList() && deviceMode === FIND_MODE.FOUND;
  const showDevicesNotFound = () => showDeviceList() && deviceMode === FIND_MODE.NOT_FOUND;

  clientRepository
    .getClientsByUserIds([userEntity.id], true)
    .then(qualifiedUsersMap => {
      for (const userClientMaps of Object.values(qualifiedUsersMap)) {
        for (const clientEntities2 of Object.values(userClientMaps)) {
          clientEntities = sortUserDevices(clientEntities2);
          const hasDevices = clientEntities2.length > 0;
          deviceMode = hasDevices ? FIND_MODE.FOUND : FIND_MODE.NOT_FOUND;
        }
      }
    })
    .catch(error => {
      logger.error(`Unable to retrieve clients for user '${userEntity.id}': ${error.message || error}`);
    });

  useEffect(() => {
    fingerprintRemote = [];

    if (selectedClient) {
      cryptographyRepository
        .getRemoteFingerprint(userEntity.id, selectedClient.id)
        .then(remoteFingerprint => (fingerprintRemote = remoteFingerprint));
    }
  }, [selectedClient]);

  const clickOnDevice = (clientEntity: ClientEntity) => {
    selectedClient = clientEntity;
    const headline = userEntity.isMe
      ? selectedClient.label || selectedClient.model
      : capitalizeFirstChar(selectedClient.class);
    history.goTo(UserDevicesState.DEVICE_DETAILS, headline);
  };

  const clickOnShowSelfDevices = () => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);

  const clickToResetSession = () => {
    const _resetProgress = () =>
      window.setTimeout(() => {
        isResettingSession = false;
      }, MotionDuration.LONG);
    const conversationId = userEntity.isMe
      ? conversationState.self_conversation().id
      : conversationState.activeConversation().id;
    isResettingSession = true;
    messageRepository
      .resetSession(userEntity.id, selectedClient.id, conversationId)
      .then(_resetProgress)
      .catch(_resetProgress);
  };

  const clickToShowSelfFingerprint = () => {
    if (!fingerprintLocal.length) {
      fingerprintLocal = cryptographyRepository.getLocalFingerprint();
    }
    history.goTo(UserDevicesState.SELF_FINGERPRINT, t('participantDevicesSelfFingerprint'));
  };

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !selectedClient.meta.isVerified();
    clientRepository
      .verifyClient(userEntity.id, selectedClient, toggleVerified)
      .catch((error: DexieError) => logger.warn(`Failed to toggle client verification: ${error.message}`));
  };

  useEffect(() => {
    history.reset();
  });

  return (
    <div>
      {showDevicesFound && (
        <>
          <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
            <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
              {devicesHeadlineText}
            </div>
            <a
              className="participant-devices__link accent-text"
              href={privacyWhyUrl}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {t('participantDevicesWhyVerify')}
            </a>
          </div>

          <div className="participant-devices__device-list">
            {clientEntities.map(clientEntity => (
              <div
                key={clientEntity.id}
                className={cx('participant-devices__device-item', {
                  'participant-devices__device-item--padding': !noPadding,
                })}
                data-uie-name="item-device"
              >
                <DeviceCard device={clientEntity} onClick={clickOnDevice} showVerified={true} showIcon={true} />
              </div>
            ))}
          </div>
        </>
      )}

      {showDevicesNotFound && (
        <div
          className={cx('participant-devices__header', {
            'participant-devices__header--padding': !noPadding,
          })}
        >
          <div className="participant-devices__text-block panel__info-text" data-uie-name="status-devices-headline">
            {noDevicesHeadlineText}
          </div>
          <a
            className="participant-devices__link accent-text"
            href={privacyPolicyUrl}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {t('participantDevicesLearnMore')}
          </a>
        </div>
      )}

      {showDeviceDetails && (
        <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
          <div
            className="participant-devices__link participant-devices__show-self-fingerprint accent-text"
            onClick={clickToShowSelfFingerprint}
          >
            {t('participantDevicesDetailShowMyDevice')}
          </div>
          <div className="panel__info-text">{detailMessage}</div>
          <a
            className="participant-devices__link accent-text"
            href={privacyHowUrl}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {t('participantDevicesDetailHowTo')}
          </a>

          <DeviceCard className="participant-devices__single-client" device={selectedClient} />

          <div className="participant-devices__fingerprint" data-uie-name="status-fingerprint">
            {fingerprintRemote.map(fingerprint => (
              <span key={fingerprint} className="participant-devices__fingerprint__part">
                {fingerprint}
              </span>
            ))}
          </div>

          <div className="participant-devices__verify">
            <div className="slider" data-uie-name="do-toggle-verified">
              <input
                className="slider-input"
                type="checkbox"
                name="toggle"
                id="toggle"
                checked={selectedClient.meta.isVerified()}
              />
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

      {showSelfFingerprint && (
        <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
          <DeviceCard device={selfClient} />
          <div className="participant-devices__fingerprint">
            {fingerprintLocal.map(fingerprint => (
              <span key={fingerprint} className="participant-devices__fingerprint__part">
                {fingerprint}
              </span>
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
  bindings:
    'clientRepository, clientState, conversationState, cryptographyRepository, history, messageRepository, noPadding, userEntity: ko.unwrap(userEntity)',
  component: UserDevices,
  optionalParams: ['clientState', 'conversationState', 'noPadding'],
});
