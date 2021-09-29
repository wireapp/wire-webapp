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
import {container} from 'tsyringe';
import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import type {Logger} from 'Util/Logger';

import type {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import type {ClientEntity} from '../../client/ClientEntity';
import type {User} from '../../entity/User';
import {ConversationState} from '../../conversation/ConversationState';
import DeviceCard from './DeviceCard';
import DeviceId from '../DeviceId';
import {MotionDuration} from '../../motion/MotionDuration';
import {getPrivacyHowUrl} from '../../externalRoute';
import type {ClientRepository} from '../../client/ClientRepository';
import type {MessageRepository} from '../../conversation/MessageRepository';
import type {DexieError} from 'dexie';

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
        .getRemoteFingerprint(user.id, selectedClient.id)
        .then(remoteFingerprint => setFingerprintRemote(remoteFingerprint));
    }
  }, [selectedClient]);

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !isVerified;
    clientRepository
      .verifyClient(user.id, selectedClient, toggleVerified, user.domain)
      .catch((error: DexieError) => logger.warn(`Failed to toggle client verification: ${error.message}`));
  };

  const clickToResetSession = () => {
    const _resetProgress = () => window.setTimeout(() => setIsResettingSession(false), MotionDuration.LONG);
    const conversationId = user.isMe
      ? conversationState.self_conversation().id
      : conversationState.activeConversation().id;
    setIsResettingSession(true);
    messageRepository
      .resetSession(user.id, selectedClient.id, conversationId, user.domain)
      .then(_resetProgress)
      .catch(_resetProgress);
  };

  return (
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
          __html: user ? t('participantDevicesDetailHeadline', {user: userName}) : '',
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
        <DeviceId deviceId={fingerprintRemote} />
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
  );
};

export default DeviceDetails;
