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

import {WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {isCountlyEnabled} from 'src/script/tracking/EventTrackingRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {PropertiesRepository} from '../../../../../properties/PropertiesRepository';
import {PROPERTIES_TYPE} from '../../../../../properties/PropertiesType';
import {TeamState} from '../../../../../team/TeamState';
import {ConsentValue} from '../../../../../user/ConsentValue';
import {PreferencesSection} from '../components/PreferencesSection';

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
  const [optionTelemetry, setOptionTelemetry] = useState(
    propertiesRepository.properties.settings.privacy.telemetry_sharing,
  );

  const {marketingConsent} = useKoSubscribableChildren(propertiesRepository, ['marketingConsent']);
  const {isTeam} = useKoSubscribableChildren(teamState, ['isTeam']);

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties): void => {
      setOptionTelemetry(settings.privacy.telemetry_sharing);
    };
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    return () => amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
  }, []);

  const showCountly = !isTeam || (isTeam && isCountlyEnabled);

  if (!showCountly && !isActivatedAccount) {
    return null;
  }

  return (
    <PreferencesSection hasSeparator title={t('preferencesAccountData')} className="preferences-section-data-usage">
      {showCountly && (
        <div className="checkbox-margin">
          <Checkbox
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const isChecked = event.target.checked;
              propertiesRepository.savePreference(PROPERTIES_TYPE.TELEMETRY_SHARING, isChecked);
              setOptionTelemetry(isChecked);
            }}
            checked={optionTelemetry}
            data-uie-name="status-preference-telemetry"
          >
            <CheckboxLabel htmlFor="status-preference-telemetry">
              {t('preferencesAccountDataTelemetryCheckbox')}
            </CheckboxLabel>
          </Checkbox>
          <p className="preferences-detail preferences-detail-intended">
            {t('preferencesAccountDataTelemetry', brandName)}
          </p>
        </div>
      )}
      {isActivatedAccount && (
        <div className="checkbox-margin">
          <Checkbox
            onChange={async (event: React.ChangeEvent<HTMLInputElement>) => {
              const isChecked = event.target.checked;
              await propertiesRepository.updateProperty(
                PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
                isChecked ? ConsentValue.GIVEN : ConsentValue.NOT_GIVEN,
              );
            }}
            checked={!!marketingConsent}
            data-uie-name="status-preference-marketing"
          >
            <CheckboxLabel htmlFor="status-preference-marketing">
              {t('preferencesAccountMarketingConsentCheckbox')}
            </CheckboxLabel>
          </Checkbox>
          <p className="preferences-detail preferences-detail-intended">
            {t('preferencesAccountMarketingConsentDetail', brandName)}
          </p>
        </div>
      )}
    </PreferencesSection>
  );
};

export {DataUsageSection};
