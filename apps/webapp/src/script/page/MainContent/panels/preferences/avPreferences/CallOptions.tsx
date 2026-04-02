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

import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';

import type {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';

import {Runtime} from '@wireapp/commons';
import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {t} from 'Util/localizerUtil';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/PreferencesSection';

interface CallOptionsProps {
  constraintsHandler: MediaConstraintsHandler;
  propertiesRepository: PropertiesRepository;
}

const CallOptions = ({constraintsHandler, propertiesRepository}: CallOptionsProps) => {
  const {current: isCbrEncodingEnforced} = useRef(Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE);
  const [vbrEncoding, setVbrEncoding] = useState(
    !isCbrEncodingEnforced && propertiesRepository.properties.settings.call.enable_vbr_encoding,
  );
  const [agcEnabled, setAgcEnabled] = useState(constraintsHandler.getAgcPreference());
  const [soundlessCallsEnabled, setSoundlessCallsEnabled] = useState(
    propertiesRepository.properties.settings.call.enable_soundless_incoming_calls,
  );

  const isPressSpaceToUnmuteFlagEnabled = Config.getConfig().FEATURE.ENABLE_PRESS_SPACE_TO_UNMUTE;

  const [pressSpaceToUnmuteEnabled, setPressSpaceToUnmuteEnabled] = useState(
    !!propertiesRepository.properties.settings.call.enable_press_space_to_unmute,
  );

  const hardwareAccelerationDescriptionId = 'status-preference-hardware-acceleration-description';

  const desktopSettings = Config.getDesktopSettings();

  const isHardwareAccelerationChangeable = Runtime.isDesktopApp() && !!desktopSettings;

  const [isHardwareAccelerationEnabled, setIsHardwareAccelerationEnabled] = useState<boolean>(() => {
    if (!isHardwareAccelerationChangeable) {
      return true; // default in browser (but not changeable)
    }

    return desktopSettings.isHardwareAccelerationEnabled();
  });

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties) => {
      setVbrEncoding(!isCbrEncodingEnforced && settings.call.enable_vbr_encoding);
    };
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    return () => {
      amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    };
  }, []);

  const handleCbrEncodingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!isCbrEncodingEnforced) {
        const isChecked = event.target.checked;
        propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_VBR_ENCODING, isChecked);
        setVbrEncoding(isChecked);
      }
    },
    [isCbrEncodingEnforced, propertiesRepository],
  );

  const handleAgcChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      constraintsHandler.setAgcPreference(isChecked);
      setAgcEnabled(isChecked);
    },
    [constraintsHandler],
  );

  const handleSoundlessCallsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS, isChecked);
      setSoundlessCallsEnabled(isChecked);
    },
    [propertiesRepository],
  );

  const handlePressSpaceToUnmuteChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_PRESS_SPACE_TO_UNMUTE, isChecked);
      setPressSpaceToUnmuteEnabled(isChecked);
    },
    [propertiesRepository],
  );

  const showHardwareAccelerationRestartModal = () => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      size: 'large',
      primaryAction: {
        action: confirmHardwareAccelerationChange,
        text: t('preferencesOptionsEnableHardwareAccelerationModalOk'),
      },
      text: {
        message: t('preferencesOptionsEnableHardwareAccelerationModalMessage'),
        title: t('preferencesOptionsEnableHardwareAccelerationModalTitle'),
      },
    });
  };

  const confirmHardwareAccelerationChange = () => {
    if (!desktopSettings) {
      return;
    }

    const currentHwValue = desktopSettings.isHardwareAccelerationEnabled();

    desktopSettings.setHardwareAccelerationEnabled(!currentHwValue);
    setIsHardwareAccelerationEnabled(!currentHwValue);

    amplify.publish(WebAppEvents.LIFECYCLE.RESTART);
  };

  return (
    <PreferencesSection title={t('preferencesOptionsCall')}>
      <div>
        <Checkbox
          onChange={handleCbrEncodingChange}
          checked={vbrEncoding}
          data-uie-name="status-preference-vbr-encoding"
          disabled={isCbrEncodingEnforced}
        >
          <CheckboxLabel htmlFor="status-preference-vbr-encoding">
            {t('preferencesOptionsEnableVbrCheckbox')}
          </CheckboxLabel>
        </Checkbox>
        <p className="preferences-detail preferences-detail-intended">{t('preferencesOptionsEnableVbrDetails')}</p>
      </div>
      <div className="checkbox-margin">
        <Checkbox onChange={handleAgcChange} checked={agcEnabled} data-uie-name="status-preference-agc">
          <CheckboxLabel htmlFor="status-preference-agc">{t('preferencesOptionsEnableAgcCheckbox')}</CheckboxLabel>
        </Checkbox>
        <p className="preferences-detail preferences-detail-intended">{t('preferencesOptionsEnableAgcDetails')}</p>
      </div>
      <div className="checkbox-margin">
        <Checkbox
          onChange={handleSoundlessCallsChange}
          checked={soundlessCallsEnabled}
          data-uie-name="status-preference-soundless-incoming-calls"
        >
          <CheckboxLabel htmlFor="status-preference-soundless-incoming-calls">
            {t('preferencesOptionsEnableSoundlessIncomingCalls')}
          </CheckboxLabel>
        </Checkbox>
        <p className="preferences-detail preferences-detail-intended">
          {t('preferencesOptionsEnableSoundlessIncomingCallsDetails')}
        </p>
      </div>
      {isPressSpaceToUnmuteFlagEnabled && (
        <div className="checkbox-margin">
          <Checkbox
            onChange={handlePressSpaceToUnmuteChange}
            checked={pressSpaceToUnmuteEnabled}
            data-uie-name="status-preference-press-space-to-unmute"
          >
            <CheckboxLabel htmlFor="status-preference-press-space-to-unmute">
              {t('preferencesOptionsEnablePressSpaceToUnmute')}
            </CheckboxLabel>
          </Checkbox>
          <p className="preferences-detail preferences-detail-intended">
            {t('preferencesOptionsEnablePressSpaceToUnmuteDetails')}
          </p>
        </div>
      )}

      {isHardwareAccelerationChangeable && (
        <div className="checkbox-margin">
          <Checkbox
            onChange={showHardwareAccelerationRestartModal}
            checked={isHardwareAccelerationEnabled}
            id="status-preference-hardware-acceleration"
            data-uie-name="status-preference-hardware-acceleration"
            aria-describedby={hardwareAccelerationDescriptionId}
          >
            <CheckboxLabel htmlFor="status-preference-hardware-acceleration">
              {t('preferencesOptionsEnableHardwareAcceleration')}
            </CheckboxLabel>
          </Checkbox>
          <p id={hardwareAccelerationDescriptionId} className="preferences-detail preferences-detail-intended">
            {t('preferencesOptionsEnableHardwareAccelerationDetails')}
          </p>
        </div>
      )}
    </PreferencesSection>
  );
};

export {CallOptions};
