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

import {Icon} from 'Components/Icon';
import {isMLSConversation} from 'src/script/conversation/ConversationSelectors';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import type {Logger} from 'Util/Logger';

import {DeviceCard} from './DeviceCard';

import type {ClientRepository, ClientEntity} from '../../client';
import {Config} from '../../Config';
import {ConversationState} from '../../conversation/ConversationState';
import type {MessageRepository} from '../../conversation/MessageRepository';
import type {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import type {User} from '../../entity/User';
import {MotionDuration} from '../../motion/MotionDuration';
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

  const activeConversation = conversationState.activeConversation();
  const isConversationMLS = activeConversation && isMLSConversation(activeConversation);

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      <button
        type="button"
        className="button-reset-default participant-devices__link participant-devices__show-self-fingerprint accent-text"
        onClick={clickToShowSelfFingerprint}
      >
        {t('participantDevicesDetailShowMyDevice')}
      </button>
      <p
        className="panel__info-text"
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
      <div className="participant-devices__single-client">
        <DeviceCard device={selectedClient} />
      </div>
      {fingerprintRemote && (
        <div className="participant-devices__fingerprint" data-uie-name="status-fingerprint">
          <DeviceId deviceId={fingerprintRemote} />
        </div>
      )}

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
            <span className="button-label__text">{t('participantDevicesDetailVerify')}</span>
          </label>
        </div>

        <div className="participant-devices__actions">
          <Icon.Loading
            className="accent-fill"
            style={{display: isResettingSession ? 'initial' : 'none'}}
            data-uie-name="status-loading"
          />
          {!isConversationMLS && (
            <button
              type="button"
              className="button-reset-default button-label participant-devices__reset-session accent-text ellipsis"
              onClick={clickToResetSession}
              style={{display: isResettingSession ? 'none' : 'initial'}}
              data-uie-name="do-reset-session"
            >
              {t('participantDevicesDetailResetSession')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export {DeviceDetails};
