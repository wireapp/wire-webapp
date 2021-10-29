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

import React, {useState} from 'react';
import {PropertiesRepository} from '../../../properties/PropertiesRepository';
import {t} from 'Util/LocalizerUtil';
import {PROPERTIES_TYPE} from 'src/script/properties/PropertiesType';
import {TeamState} from 'src/script/team/TeamState';
import {container} from 'tsyringe';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {Config} from 'src/script/Config';
import {ConsentValue} from 'src/script/user/ConsentValue';

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

  return (
    <section className="preferences-section preferences-section-data-usage">
      <hr className="preferences-separator" />
      <header className="preferences-header">{t('preferencesAccountData')}</header>

      <div className="preferences-option">
        <div
          className="preferences-option-icon checkbox accent-text"
          data-uie-value={optionPrivacy}
          data-uie-name="status-preference-privacy"
        >
          <input
            type="checkbox"
            id="privacy-checkbox"
            checked={optionPrivacy}
            onChange={({target}) => {
              propertiesRepository.savePreference(PROPERTIES_TYPE.PRIVACY, target.checked);
              setOptionPrivacy(target.checked);
            }}
          />
          <label className="preferences-options-checkbox-label" htmlFor="privacy-checkbox">
            {t('preferencesAccountDataCheckbox')}
          </label>
        </div>
      </div>
      <div className="preferences-detail">{t('preferencesAccountDataDetail', brandName)}</div>

      {isTeam && isCountlyEnabled && (
        <>
          <div className="preferences-option">
            <div
              className="preferences-option-icon checkbox accent-text"
              data-uie-value={optionTelemetry}
              data-uie-name="status-preference-telemetry"
            >
              <input
                type="checkbox"
                id="telemetry-checkbox"
                checked={optionTelemetry}
                onChange={({target}) => {
                  propertiesRepository.savePreference(PROPERTIES_TYPE.TELEMETRY_SHARING, target.checked);
                  setOptionTelemetry(target.checked);
                }}
              />
              <label className="preferences-options-checkbox-label" htmlFor="telemetry-checkbox">
                {t('preferencesAccountDataTelemetryCheckbox')}
              </label>
            </div>
          </div>
          <div className="preferences-detail">{t('preferencesAccountDataTelemetry', brandName)}</div>
        </>
      )}

      {isActivatedAccount && (
        <>
          <div className="preferences-option">
            <div
              className="preferences-option-icon checkbox accent-text"
              data-uie-value={marketingConsent}
              data-uie-name="status-preference-marketing"
            >
              <input
                type="checkbox"
                id="marketing-checkbox"
                checked={!!marketingConsent}
                onChange={({target}) =>
                  propertiesRepository.updateProperty(
                    PropertiesRepository.CONFIG.WIRE_MARKETING_CONSENT.key,
                    target.checked ? ConsentValue.GIVEN : ConsentValue.NOT_GIVEN,
                  )
                }
              />
              <label className="preferences-options-checkbox-label" htmlFor="marketing-checkbox">
                {t('preferencesAccountMarketingConsentCheckbox')}
              </label>
            </div>
          </div>
          <div className="preferences-detail">{t('preferencesAccountMarketingConsentDetail', brandName)}</div>
        </>
      )}
    </section>
  );
};

export default DataUsageSection;
