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

import React, {useEffect, useState} from 'react';
import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {WebappProperties} from '@wireapp/api-client/src/user/data/';
import {WebAppEvents} from '@wireapp/webapp-events';

import {t} from 'Util/LocalizerUtil';

import {PropertiesRepository} from '../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../properties/PropertiesType';
import {TeamState} from '../../../team/TeamState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Config} from '../../../Config';
import {ConsentValue} from '../../../user/ConsentValue';
import PreferencesSection from '../components/PreferencesSection';
import PreferencesCheckbox from '../components/PreferencesCheckbox';

interface DataUsageSectionProps {
  brandName: string;
  isActivatedAccount: boolean;
  propertiesRepository: PropertiesRepository;
  teamState?: TeamState;
}

const DataUsageSection: React.FC<DataUsageSectionProps> = ({
  propertiesRepository,
  brandName,
  isActivatedAccount,
  teamState = container.resolve(TeamState),
}) => {
  const [optionPrivacy, setOptionPrivacy] = useState(propertiesRepository.properties.settings.privacy.improve_wire);
  const [optionTelemetry, setOptionTelemetry] = useState(
    propertiesRepository.properties.settings.privacy.telemetry_sharing,
  );

  const {marketingConsent} = useKoSubscribableChildren(propertiesRepository, ['marketingConsent']);
  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);
  const isCountlyEnabled = !!Config.getConfig().COUNTLY_API_KEY;

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties): void => {
      setOptionPrivacy(settings.privacy.improve_wire);
      setOptionTelemetry(settings.privacy.telemetry_sharing);
    };
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    return () => amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
  }, []);

  return (
    <PreferencesSection hasSeparator title={t('preferencesAccountData')} className="preferences-section-data-usage">
      <PreferencesCheckbox
        checked={optionPrivacy}
        onChange={checked => {
          propertiesRepository.savePreference(PROPERTIES_TYPE.PRIVACY, checked);
          setOptionPrivacy(checked);
        }}
        uieName="status-preference-privacy"
        label={t('preferencesAccountDataCheckbox')}
        details={t('preferencesAccountDataDetail', brandName)}
      />

      {isTeam && isCountlyEnabled && (
        <PreferencesCheckbox
          checked={optionTelemetry}
          onChange={checked => {
            propertiesRepository.savePreference(PROPERTIES_TYPE.TELEMETRY_SHARING, checked);
            setOptionTelemetry(checked);
          }}
          uieName="status-preference-telemetry"
          label={t('preferencesAccountDataTelemetryCheckbox')}
          details={t('preferencesAccountDataTelemetry', brandName)}
        />
      )}

      {isActivatedAccount && (
        <PreferencesCheckbox
          checked={!!marketingConsent}
          onChange={checked =>
            propertiesRepository.updateProperty(
              PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
              checked ? ConsentValue.GIVEN : ConsentValue.NOT_GIVEN,
            )
          }
          uieName="status-preference-marketing"
          label={t('preferencesAccountMarketingConsentCheckbox')}
          details={t('preferencesAccountMarketingConsentDetail', brandName)}
        />
      )}
    </PreferencesSection>
  );
};

export default DataUsageSection;
