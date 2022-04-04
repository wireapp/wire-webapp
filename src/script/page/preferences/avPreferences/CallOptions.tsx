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

import React, {useEffect, useRef, useState} from 'react';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {WebappProperties} from '@wireapp/api-client/src/user/data/';

import {t} from 'Util/LocalizerUtil';

import {Config} from '../../../Config';
import type {MediaConstraintsHandler} from '../../../media/MediaConstraintsHandler';
import type {PropertiesRepository} from '../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../properties/PropertiesType';
import PreferencesCheckbox from '../components/PreferencesCheckbox';
import PreferencesSection from '../components/PreferencesSection';

interface CallOptionsProps {
  constraintsHandler: MediaConstraintsHandler;
  propertiesRepository: PropertiesRepository;
}

const CallOptions: React.FC<CallOptionsProps> = ({constraintsHandler, propertiesRepository}) => {
  const {current: isCbrEncodingEnforced} = useRef(Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE);
  const [vbrEncoding, setVbrEncoding] = useState(
    !isCbrEncodingEnforced && propertiesRepository.properties.settings.call.enable_vbr_encoding,
  );
  const [agcEnabled, setAgcEnabled] = useState(constraintsHandler.getAgcPreference());
  const [soundlessCallsEnabled, setSoundlessCallsEnabled] = useState(
    propertiesRepository.properties.settings.call.enable_soundless_incoming_calls,
  );

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties) => {
      setVbrEncoding(!isCbrEncodingEnforced && settings.call.enable_vbr_encoding);
    };
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    return () => {
      amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    };
  }, []);

  return (
    <PreferencesSection title={t('preferencesOptionsCall')}>
      <PreferencesCheckbox
        uieName="status-preference-vbr-encoding"
        label={t('preferencesOptionsEnableVbrCheckbox')}
        checked={vbrEncoding}
        disabled={isCbrEncodingEnforced}
        details={t('preferencesOptionsEnableVbrDetails')}
        onChange={checked => {
          if (!isCbrEncodingEnforced) {
            propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_VBR_ENCODING, checked);
            setVbrEncoding(checked);
          }
        }}
      />
      <PreferencesCheckbox
        uieName="status-preference-agc"
        label={t('preferencesOptionsEnableAgcCheckbox')}
        checked={agcEnabled}
        details={t('preferencesOptionsEnableAgcDetails')}
        onChange={checked => {
          constraintsHandler.setAgcPreference(checked);
          setAgcEnabled(checked);
        }}
      />
      <PreferencesCheckbox
        uieName="status-preference-soundless-incoming-calls"
        label={t('preferencesOptionsEnableSoundlessIncomingCalls')}
        checked={soundlessCallsEnabled}
        details={t('preferencesOptionsEnableSoundlessIncomingCallsDetails')}
        onChange={checked => {
          propertiesRepository.savePreference(PROPERTIES_TYPE.CALL.ENABLE_SOUNDLESS_INCOMING_CALLS, checked);
          setSoundlessCallsEnabled(checked);
        }}
      />
    </PreferencesSection>
  );
};

export default CallOptions;
