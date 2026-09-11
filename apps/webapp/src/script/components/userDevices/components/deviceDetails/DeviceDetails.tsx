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
import type {ReactNode} from 'react';

import cx from 'classnames';
import {container} from 'tsyringe';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import type {ClientRepository, ClientEntity} from 'Repositories/client';
import {isMLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import type {User} from 'Repositories/entity/User';
import {WireIdentity} from 'src/script/e2eIdentity';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {MLSDeviceDetails} from 'src/script/page/mainContent/panels/preferences/devicesPreferences/components/mlsDeviceDetails';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {createReactTranslationMarker, renderReactTranslation} from 'Util/localizerUtil/reactLocalizerUtil';
import type {Translate} from 'Util/localizerUtil/translationTypes';
import type {Logger} from 'Util/logger';
import {splitFingerprint} from 'Util/stringUtil';
import {toError} from 'Util/toError';

import {Config} from '../../../../Config';
import {MotionDuration} from '../../../../motion/MotionDuration';
import {FormattedId} from '../../../../page/mainContent/panels/preferences/devicesPreferences/components/formattedId';

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

type RenderDeviceDetailsHeadlineOptions = {
  readonly isReactTranslationRenderingEnabled: boolean;
  readonly translate: Translate;
  readonly userName: string;
};

const deviceDetailsBoldMarker = createReactTranslationMarker('device-details-bold');
const deviceDetailsUserMarker = createReactTranslationMarker('device-details-user');

function translateDeviceDetailsHeadline(translate: Translate, userName: string): string {
  return translate('participantDevicesDetailHeadline', {user: userName});
}

function translateDeviceDetailsHeadlineWithReactMarkers(translate: Translate): string {
  return translate(
    'participantDevicesDetailHeadline',
    {user: deviceDetailsUserMarker.substitution},
    {
      '/bold': deviceDetailsBoldMarker.end,
      bold: deviceDetailsBoldMarker.start,
    },
  );
}

function normalizeDeviceDetailsHeadlineFormatting(translatedText: string): string {
  const boldMarkerStartIndex = translatedText.indexOf(deviceDetailsBoldMarker.start);
  const boldMarkerEndIndex = translatedText.indexOf(deviceDetailsBoldMarker.end);

  if (boldMarkerStartIndex === -1) {
    return boldMarkerEndIndex === -1 ? translatedText : translatedText.replace(deviceDetailsBoldMarker.end, '');
  }

  if (boldMarkerEndIndex === -1) {
    return `${translatedText}${deviceDetailsBoldMarker.end}`;
  }

  if (boldMarkerStartIndex < boldMarkerEndIndex) {
    return translatedText;
  }

  return `${translatedText.replace(deviceDetailsBoldMarker.end, '')}${deviceDetailsBoldMarker.end}`;
}

function renderDeviceDetailsHeadline(options: RenderDeviceDetailsHeadlineOptions): ReactNode {
  const {isReactTranslationRenderingEnabled, translate, userName} = options;

  if (isReactTranslationRenderingEnabled) {
    const translatedText = normalizeDeviceDetailsHeadlineFormatting(
      translateDeviceDetailsHeadlineWithReactMarkers(translate),
    );

    return (
      <span>
        {renderReactTranslation({
          translatedText,
          componentReplacements: [
            {
              start: deviceDetailsBoldMarker.start,
              end: deviceDetailsBoldMarker.end,
              render(children): ReactNode {
                return <strong>{children}</strong>;
              },
            },
          ],
          nodeReplacements: [],
          valueReplacements: [{marker: deviceDetailsUserMarker, runtimeText: userName}],
        })}
      </span>
    );
  }

  return <span dangerouslySetInnerHTML={{__html: translateDeviceDetailsHeadline(translate, userName)}} />;
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
  const {isFeatureToggleEnabled, translate} = useApplicationContext();
  const [fingerprintRemote, setFingerprintRemote] = useState<string>();
  const [isResettingSession, setIsResettingSession] = useState(false);

  const clientMeta = useMemo(() => device?.meta, [device]);

  const {isVerified} = useKoSubscribableChildren(clientMeta, ['isVerified']);
  const {name: userName} = useKoSubscribableChildren(user, ['name']);
  const isReactTranslationRenderingEnabled = isFeatureToggleEnabled(reactTranslationRenderingFeatureToggleName);

  useEffect(() => {
    setFingerprintRemote(undefined);
    void cryptographyRepository
      .getRemoteFingerprint(user.qualifiedId, device.id)
      .then(remoteFingerprint => setFingerprintRemote(remoteFingerprint));
  }, [cryptographyRepository, device, user.qualifiedId]);

  const clickToToggleDeviceVerification = () => {
    const toggleVerified = !isVerified;
    clientRepository
      .verifyClient(user.qualifiedId, device, toggleVerified)
      .catch((error: unknown) => logger.warn(`Failed to toggle client verification: ${toError(error).message}`));
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
  const isConversationMLS = activeConversation != null ? isMLSConversation(activeConversation) : false;

  const deviceIdentity = getDeviceIdentity?.(device.id);

  return (
    <div className={cx('participant-devices__header', {'participant-devices__header--padding': !noPadding})}>
      {deviceIdentity && (
        <MLSDeviceDetails identity={deviceIdentity} isSelfUser={user.isMe} cipherSuite={device.getCipherSuite()} />
      )}

      <div className="device-proteus-details">
        <h3 className="device-details-title paragraph-body-3">
          {translate('participantDevicesProteusDeviceVerification')}
        </h3>

        <p className="panel__info-text">
          {renderDeviceDetailsHeadline({isReactTranslationRenderingEnabled, translate, userName})}

          <a
            className="participant-devices__link accent-text"
            href={Config.getConfig().URL.SUPPORT.PRIVACY_VERIFY_FINGERPRINT}
            rel="nofollow noopener noreferrer"
            target="_blank"
          >
            {translate('participantDevicesDetailHowTo')}
          </a>
        </p>

        {fingerprintRemote !== undefined && fingerprintRemote !== '' && (
          <>
            <p className="label-2 preferences-label preferences-devices-fingerprint-label">
              {translate('participantDevicesProteusKeyFingerprint')}
            </p>

            <div className="participant-devices__fingerprint" data-uie-name="status-fingerprint">
              <FormattedId idSlices={splitFingerprint(fingerprintRemote)} smallPadding />
            </div>
          </>
        )}

        <p className="label-2 preferences-label preferences-devices-fingerprint-label">
          {translate('preferencesDeviceDetailsVerificationStatus')}
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
              <span className="button-label__text paragraph-body-3">{translate('participantDevicesDetailVerify')}</span>
            </label>
          </div>
        </div>

        <p className="device-details__reset-fingerprint paragraph-body-1">
          {translate('preferencesDeviceDetailsFingerprintNotMatch')}
        </p>

        {isConversationMLS !== true && (
          <Button
            variant={ButtonVariant.TERTIARY}
            showLoading={isResettingSession}
            onClick={clickToResetSession}
            style={{display: isResettingSession ? 'none' : 'initial'}}
            data-uie-name={isResettingSession ? 'status-loading' : 'do-reset-session'}
          >
            {translate('participantDevicesDetailResetSession')}
          </Button>
        )}

        <Button variant={ButtonVariant.TERTIARY} onClick={clickToShowSelfFingerprint}>
          {translate('participantDevicesDetailShowMyDevice')}
        </Button>
      </div>
    </div>
  );
};
