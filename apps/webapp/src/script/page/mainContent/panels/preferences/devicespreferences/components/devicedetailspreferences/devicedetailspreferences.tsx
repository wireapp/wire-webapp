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

import {useEffect, useState} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {ClientEntity} from 'Repositories/client/cliententity';
import {WireIdentity} from 'src/script/e2eIdentity';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {Config} from '../../../../../../../config';
import {MotionDuration} from '../../../../../../../motion/motionduration';
import {contentStyle} from '../../../components/preferencespage.styles';
import {DetailedDevice} from '../detaileddevice';

interface DevicesPreferencesProps {
  device: ClientEntity;
  getFingerprint: (device: ClientEntity) => Promise<string | undefined>;
  getDeviceIdentity?: (deviceId: string) => WireIdentity | undefined;
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

const RESET_CONFIRMATION_TIMEOUT_MILLISECONDS = 5000;

export const DeviceDetailsPreferences = ({
  device,
  getFingerprint,
  getDeviceIdentity,
  onVerify,
  onRemove,
  onClose,
  onResetSession,
}: DevicesPreferencesProps) => {
  const {translate} = useApplicationContext();
  const {isVerified} = useKoSubscribableChildren(device.meta, ['isVerified']);
  const [resetState, setResetState] = useState<SessionResetState>(SessionResetState.RESET);
  const [fingerprint, setFingerprint] = useState<string | undefined>();
  const brandName = Config.getConfig().BRAND_NAME;

  const resetSession = async () => {
    setResetState(SessionResetState.ONGOING);
    await onResetSession(device);
    setTimeout(() => setResetState(SessionResetState.CONFIRMATION), MotionDuration.LONG);
    setTimeout(() => setResetState(SessionResetState.RESET), RESET_CONFIRMATION_TIMEOUT_MILLISECONDS);
  };

  useEffect(() => {
    void getFingerprint(device).then(setFingerprint);
  }, [device, getFingerprint]);

  return (
    <div
      id="preferences-device-details"
      className="preferences-page preferences-device-details"
      data-uie-name="preferences-devices-details"
    >
      <h2 className="preferences-titlebar">{translate('preferencesDeviceDetails')}</h2>

      <div className="preferences-content" css={contentStyle}>
        <fieldset className="preferences-section">
          <legend className="preferences-devices-details">
            <button
              type="button"
              className="preferences-devices-icon icon-back"
              onClick={onClose}
              data-uie-name="go-back"
              aria-label={translate('accessibility.preferencesDeviceDetails.goBack')}
            />
          </legend>

          <DetailedDevice getDeviceIdentity={getDeviceIdentity} device={device} fingerprint={fingerprint || ''} />

          <h3 className="label preferences-label preferences-devices-fingerprint-label">
            {translate('preferencesDeviceDetailsVerificationStatus')}
          </h3>

          <div className="participant-devices__verify slider">
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
              <span className="button-label__text paragraph-body-3">{translate('preferencesDevicesVerification')}</span>
            </label>
          </div>

          <p className="paragraph-body-1">{translate('preferencesDevicesFingerprintDetail', {brandName})}</p>
        </fieldset>

        <section className="preferences-section">
          <p className="preferences-info preferences-reset-session paragraph-body-1">
            {translate('preferencesDevicesSessionDetail')}
          </p>

          <div data-uie-name="preferences-device-details-session">
            {resetState === SessionResetState.RESET && (
              <Button
                variant={ButtonVariant.TERTIARY}
                type="button"
                className="preferences-button"
                onClick={resetSession}
                data-uie-name="do-session-reset"
              >
                {translate('preferencesDevicesSessionReset')}
              </Button>
            )}

            {resetState === SessionResetState.ONGOING && (
              <p className="preferences-devices-session-reset">{translate('preferencesDevicesSessionOngoing')}</p>
            )}

            {resetState === SessionResetState.CONFIRMATION && (
              <p className="preferences-devices-session-confirmation accent-text">
                {translate('preferencesDevicesSessionConfirmation')}
              </p>
            )}
          </div>
        </section>

        <hr className="preferences-separator" />

        {!device.isLegalHold() && (
          <section className="preferences-section">
            <p className="preferences-info paragraph-body-1">{translate('preferencesDevicesRemoveDetail')}</p>

            <Button
              variant={ButtonVariant.TERTIARY}
              type="button"
              className="preferences-button"
              onClick={() => onRemove(device)}
              data-uie-name="go-remove-device"
            >
              {translate('preferencesDevicesRemove')}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
};
