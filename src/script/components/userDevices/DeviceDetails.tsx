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

import React, {useEffect, useMemo, useState} from 'react';

import cx from 'classnames';
import type {DexieError} from 'dexie';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import type {Logger} from 'Util/Logger';

import type {ClientRepository, ClientEntity} from '../../client';
import {MLSPublicKeys} from '../../client';
import {Config} from '../../Config';
import {ConversationState} from '../../conversation/ConversationState';
import type {MessageRepository} from '../../conversation/MessageRepository';
import type {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import type {User} from '../../entity/User';
import {MotionDuration} from '../../motion/MotionDuration';
import {MLSDeviceDetails} from '../../page/MainContent/panels/preferences/devices/components/MLSDeviceDetails';
import {DeviceId} from '../DeviceId';

interface DeviceDetailsProps {
  clickToShowSelfFingerprint: () => void;
  clientRepository: ClientRepository;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  logger: Logger;
  messageRepository: MessageRepository;
  noPadding: boolean;
  selectedClient: ClientEntity;
  user: User;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({
  selectedClient,
  cryptographyRepository,
  user,
  clickToShowSelfFingerprint,
  clientRepository,
  messageRepository,
  noPadding,
  logger,
  conversationState = container.resolve(ConversationState),
}) => {
  const [fingerprintRemote, setFingerprintRemote] = useState<string>();
  const [isResettingSession, setIsResettingSession] = useState(false);

  const clientMeta = useMemo(() => selectedClient?.meta, [selectedClient]);

  const {isVerified} = useKoSubscribableChildren(clientMeta, ['isVerified']);
  const {name: userName} = useKoSubscribableChildren(user, ['name']);

  useEffect(() => {
    setFingerprintRemote(undefined);
    if (selectedClient) {
      cryptographyRepository
        .getRemoteFingerprint(user.qualifiedId, selectedClient.id)
        .then(remoteFingerprint => setFingerprintRemote(remoteFingerprint));
    }
  }, [selectedClient]);

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !isVerified;
    clientRepository
      .verifyClient(user.qualifiedId, selectedClient, toggleVerified)
      .catch((error: DexieError) => logger.warn(`Failed to toggle client verification: ${error.message}`));
  };

  const clickToResetSession = () => {
    const _resetProgress = () => window.setTimeout(() => setIsResettingSession(false), MotionDuration.LONG);
    const conversation = user.isMe
      ? conversationState.getSelfProteusConversation()
      : conversationState.activeConversation();
    setIsResettingSession(true);
    if (conversation) {
      messageRepository
        .resetSession(user.qualifiedId, selectedClient.id, conversation)
        .then(_resetProgress)
        .catch(_resetProgress);
    }
  };

  const isMLSConversation = !!conversationState.activeConversation()?.isUsingMLSProtocol;
  const mlsFingerprint = selectedClient.mlsPublicKeys?.[MLSPublicKeys.ED25519];

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      {mlsFingerprint && <MLSDeviceDetails fingerprint={mlsFingerprint} />}

      <div className="device-proteus-details">
        <h3 className="device-details-title paragraph-body-3">{t('participantDevicesProteusDeviceVerification')}</h3>

        <p className="panel__info-text">
          <span
            dangerouslySetInnerHTML={{
              __html: user ? t('participantDevicesDetailHeadline', {user: userName}) : '',
            }}
          />

          <a
            className="participant-devices__link accent-text"
            href={Config.getConfig().URL.SUPPORT.PRIVACY_VERIFY_FINGERPRINT}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {t('participantDevicesDetailHowTo')}
          </a>
        </p>

        {fingerprintRemote && (
          <>
            <p className="label-2 preferences-label preferences-devices-fingerprint-label">
              {t('participantDevicesProteusKeyFingerprint')}
            </p>

            <div className="participant-devices__fingerprint" data-uie-name="status-fingerprint">
              <DeviceId deviceId={fingerprintRemote} />
            </div>
          </>
        )}

        <p className="label-2 preferences-label preferences-devices-fingerprint-label">Verification Status</p>

        <div className="participant-devices__verify">
          <div className="slider" data-uie-name="do-toggle-verified">
            <input
              className="slider-input"
              type="checkbox"
              name="toggle"
              id="toggle"
              defaultChecked={isVerified}
              onChange={clickToToggleDeviceVerification}
            />

            <label className="button-label" htmlFor="toggle">
              <span className="button-label__switch" />
              <span className="button-label__text paragraph-body-3">{t('participantDevicesDetailVerify')}</span>
            </label>
          </div>
        </div>

        <p className="device-details__reset-fingerprint paragraph-body-1">
          {t('preferencesDeviceDetailsFingerprintNotMatch')}
        </p>

        {!isMLSConversation && (
          <Button
            variant={ButtonVariant.TERTIARY}
            showLoading={isResettingSession}
            onClick={clickToResetSession}
            style={{display: isResettingSession ? 'none' : 'initial'}}
            data-uie-name={isResettingSession ? 'status-loading' : 'do-reset-session'}
          >
            {t('participantDevicesDetailResetSession')}
          </Button>
        )}

        <Button variant={ButtonVariant.TERTIARY} onClick={clickToShowSelfFingerprint}>
          {t('participantDevicesDetailShowMyDevice')}
        </Button>
      </div>
    </div>
  );
};

export {DeviceDetails};
