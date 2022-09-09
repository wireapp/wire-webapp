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
import {ClientEntity} from 'src/script/client/ClientEntity';
import {Config} from '../../../../../Config';
import {t} from 'Util/LocalizerUtil';
import DetailedDevice from './components/DetailedDevice';
import {MotionDuration} from '../../../../../motion/MotionDuration';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

interface DevicesPreferencesProps {
  device: ClientEntity;
  getFingerprint: (device: ClientEntity) => Promise<string>;
  onClose: () => void;
  onRemove: (device: ClientEntity) => void;
  onResetSession: (device: ClientEntity) => Promise<void>;
  onVerify: (device: ClientEntity, verified: boolean) => void;
}

enum SessionResetState {
  CONFIRMATION = 'confirmation',
  ONGOING = 'ongoing',
  RESET = 'reset',
}

const DeviceDetailsPreferences: React.FC<DevicesPreferencesProps> = ({
  device,
  getFingerprint,
  onVerify,
  onRemove,
  onClose,
  onResetSession,
}) => {
  const {isVerified} = useKoSubscribableChildren(device.meta, ['isVerified']);
  const [resetState, setResetState] = useState<SessionResetState>(SessionResetState.RESET);
  const [fingerprint, setFingerprint] = useState('');
  const brandName = Config.getConfig().BRAND_NAME;

  const resetSession = async () => {
    setResetState(SessionResetState.ONGOING);
    await onResetSession(device);
    setTimeout(() => setResetState(SessionResetState.CONFIRMATION), MotionDuration.LONG);
    setTimeout(() => setResetState(SessionResetState.RESET), 5000);
  };

  useEffect(() => {
    getFingerprint(device).then(setFingerprint);
  }, []);

  return (
    <div
      id="preferences-device-details"
      className="preferences-page preferences-device-details"
      data-uie-name="preferences-devices-details"
    >
      <h2 className="preferences-titlebar">{t('preferencesDeviceDetails')}</h2>
      <div className="preferences-content">
        <fieldset className="preferences-section">
          <legend className="preferences-devices-details">
            <button
              type="button"
              className="preferences-devices-icon icon-back"
              onClick={onClose}
              data-uie-name="go-back"
              aria-label={t('accessibility.preferencesDeviceDetails.goBack')}
            />
          </legend>
          <DetailedDevice device={device} fingerprint={fingerprint} />

          <div className="preferences-devices-verification slider">
            <input
              className="slider-input"
              type="checkbox"
              name="preferences_device_verification_toggle"
              id="preferences_device_verification"
              checked={isVerified}
              onChange={event => onVerify(device, event.target.checked)}
            />

            <label className="button-label" htmlFor="preferences_device_verification" data-uie-name="do-verify">
              <span className="button-label__switch" />
              <span className="button-label__text">{t('preferencesDevicesVerification')}</span>
            </label>
          </div>

          <p className="preferences-detail">{t('preferencesDevicesFingerprintDetail', brandName)}</p>
        </fieldset>

        <section className="preferences-section">
          <header className="preferences-header">
            <hr className="preferences-separator" />
          </header>
        </section>

        <section className="preferences-section">
          <p className="preferences-info">{t('preferencesDevicesSessionDetail')}</p>
          <div className="preferences-devices-session" data-uie-name="preferences-device-details-session">
            {resetState === SessionResetState.RESET && (
              <Button
                variant={ButtonVariant.TERTIARY}
                type="button"
                className="preferences-button"
                onClick={resetSession}
                data-uie-name="do-session-reset"
              >
                {t('preferencesDevicesSessionReset')}
              </Button>
            )}
            {resetState === SessionResetState.ONGOING && (
              <p className="preferences-devices-session-reset">{t('preferencesDevicesSessionOngoing')}</p>
            )}
            {resetState === SessionResetState.CONFIRMATION && (
              <p className="preferences-devices-session-confirmation accent-text">
                {t('preferencesDevicesSessionConfirmation')}
              </p>
            )}
          </div>
        </section>

        {!device.isLegalHold() && (
          <section className="preferences-section">
            <p className="preferences-info">{t('preferencesDevicesRemoveDetail')}</p>
            <Button
              variant={ButtonVariant.TERTIARY}
              type="button"
              className="preferences-button"
              onClick={() => onRemove(device)}
              data-uie-name="go-remove-device"
            >
              {t('preferencesDevicesRemove')}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
};

export default DeviceDetailsPreferences;
