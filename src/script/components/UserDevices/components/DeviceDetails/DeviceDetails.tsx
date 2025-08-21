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

import {useEffect, useMemo, useState} from 'react';

import cx from 'classnames';
import type {DexieError} from 'dexie';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import type {ClientRepository, ClientEntity} from 'Repositories/client';
import {isMLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import type {User} from 'Repositories/entity/User';
import {WireIdentity} from 'src/script/E2EIdentity';
import {MLSDeviceDetails} from 'src/script/page/MainContent/panels/preferences/DevicesPreferences/components/MLSDeviceDetails';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import type {Logger} from 'Util/Logger';
import {splitFingerprint} from 'Util/StringUtil';

import {Config} from '../../../../Config';
import {MotionDuration} from '../../../../motion/MotionDuration';
import {FormattedId} from '../../../../page/MainContent/panels/preferences/DevicesPreferences/components/FormattedId';

interface DeviceDetailsProps {
  clickToShowSelfFingerprint: () => void;
  getDeviceIdentity?: (deviceId: string) => WireIdentity | undefined;
  clientRepository: ClientRepository;
  conversationState?: ConversationState;
  cryptographyRepository: CryptographyRepository;
  logger: Logger;
  messageRepository: MessageRepository;
  noPadding: boolean;
  device: ClientEntity;
  user: User;
}

export const DeviceDetails = ({
  device,
  cryptographyRepository,
  user,
  getDeviceIdentity,
  clickToShowSelfFingerprint,
  clientRepository,
  messageRepository,
  noPadding,
  logger,
  conversationState = container.resolve(ConversationState),
}: DeviceDetailsProps) => {
  const [fingerprintRemote, setFingerprintRemote] = useState<string>();
  const [isResettingSession, setIsResettingSession] = useState(false);

  const clientMeta = useMemo(() => device?.meta, [device]);

  const {isVerified} = useKoSubscribableChildren(clientMeta, ['isVerified']);
  const {name: userName} = useKoSubscribableChildren(user, ['name']);

  useEffect(() => {
    setFingerprintRemote(undefined);
    if (device) {
      void cryptographyRepository
        .getRemoteFingerprint(user.qualifiedId, device.id)
        .then(remoteFingerprint => setFingerprintRemote(remoteFingerprint));
    }
  }, [device]);

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !isVerified;
    clientRepository
      .verifyClient(user.qualifiedId, device, toggleVerified)
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
        .resetSession(user.qualifiedId, device.id, conversation)
        .then(_resetProgress)
        .catch(_resetProgress);
    }
  };

  const activeConversation = conversationState.activeConversation();
  const isConversationMLS = activeConversation && isMLSConversation(activeConversation);

  const deviceIdentity = getDeviceIdentity?.(device.id);

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      {deviceIdentity && (
        <MLSDeviceDetails identity={deviceIdentity} isSelfUser={user.isMe} cipherSuite={device.getCipherSuite()} />
      )}

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
              <FormattedId idSlices={splitFingerprint(fingerprintRemote)} smallPadding />
            </div>
          </>
        )}

        <p className="label-2 preferences-label preferences-devices-fingerprint-label">
          {t('preferencesDeviceDetailsVerificationStatus')}
        </p>

        <div className="participant-devices__verify">
          <div className="slider" data-uie-name="do-toggle-verified">
            <input
              className="slider-input"
              type="checkbox"
              name="toggle"
              id="toggle"
              checked={isVerified}
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

        {!isConversationMLS && (
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
